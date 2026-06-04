import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate session
    if (!sessionToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session } = await supabase
      .from("admin_sessions")
      .select("id")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
