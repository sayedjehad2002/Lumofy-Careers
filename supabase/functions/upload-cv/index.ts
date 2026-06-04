import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateFileWithMagicBytes } from "../_shared/validate-file.ts";
import { createServiceClient } from "../_shared/validate-session.ts";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit: 10 uploads per minute per IP
    const ip = getClientIp(req);
    const rl = isRateLimited(`upload-cv:${ip}`, { maxRequests: 10, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const jobId = formData.get("jobId") as string | null;
    const contentType = formData.get("contentType") as string | null;

    if (!file || !jobId || !contentType) {
      return new Response(
        JSON.stringify({ error: "Missing file, jobId, or contentType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enterprise file validation with magic byte scanning
    const validation = await validateFileWithMagicBytes(file, MAX_FILE_SIZE);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createServiceClient();

    const applicantId = crypto.randomUUID();
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const storagePath = `${jobId}/${applicantId}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("cvs")
      .upload(storagePath, arrayBuffer, {
        contentType: validation.detectedType || contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ storagePath, applicantId, fileName: file.name, fileSize: file.size }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("upload-cv error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
