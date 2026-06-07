import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// jobId becomes part of the storage key (`<jobId>/jd.<ext>`). Restrict it to a
// safe charset (alphanumerics, dash, underscore) so a malicious value can't
// escape its prefix or inject a path. Matches both the `job_<ts>` ids the app
// generates and any legacy UUID-shaped ids.
const SAFE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // IP rate limit (fix #8 — upload-jd previously had none): 10 uploads/min/IP.
    const ip = getClientIp(req);
    const rl = isRateLimited(`upload-jd:${ip}`, { maxRequests: 10, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const jobId = formData.get("jobId") as string | null;
    const contentType = formData.get("contentType") as string | null;
    const sessionToken = formData.get("sessionToken") as string | null;

    if (!file || !jobId || !contentType) {
      return new Response(JSON.stringify({ error: "Missing file, jobId, or contentType" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate jobId charset before it is used in the storage key / job update.
    if (!SAFE_ID_RE.test(jobId)) {
      return new Response(JSON.stringify({ error: "Invalid jobId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SESSION CONSISTENCY (fix #8): shared validator + service client.
    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;
    const supabase = auth.supabase;

    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: "File size must be under 10MB" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ALLOWED_TYPES.includes(contentType)) {
      return new Response(JSON.stringify({ error: "Invalid file type. Only PDF, DOC, DOCX allowed." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const storagePath = `${jobId}/jd.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("jds")
      .upload(storagePath, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload file" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the job record with file metadata
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        jd_file_name: file.name,
        jd_file_path: storagePath,
        jd_file_size: file.size,
        jd_file_uploaded_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("Job update error:", updateError);
    }

    return new Response(
      JSON.stringify({ storagePath, fileName: file.name, fileSize: file.size }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("upload-jd error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
