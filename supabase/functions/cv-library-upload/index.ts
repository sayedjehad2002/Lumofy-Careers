import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateFileWithMagicBytes } from "../_shared/validate-file.ts";
import { validateSession } from "../_shared/validate-session.ts";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Rate limit: 30 uploads per minute per IP
    const ip = getClientIp(req);
    const rl = isRateLimited(`cv-lib-upload:${ip}`, { maxRequests: 30, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const formData = await req.formData();
    const sessionToken = formData.get("sessionToken") as string | null;

    // Validate admin session
    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;
    const { supabase } = auth;

    // Collect all files from form data
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file") && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "No files provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const file of files) {
      try {
        // Enterprise file validation with magic byte scanning
        const validation = await validateFileWithMagicBytes(file, MAX_FILE_SIZE);
        if (!validation.valid) {
          errors.push({ fileName: file.name, error: validation.error });
          continue;
        }

        const candidateId = crypto.randomUUID();
        const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
        const storagePath = `library/${candidateId}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from("cv-library")
          .upload(storagePath, arrayBuffer, {
            contentType: validation.detectedType!,
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          errors.push({ fileName: file.name, error: "Upload failed" });
          continue;
        }

        const { error: insertError } = await supabase
          .from("cv_library_candidates")
          .insert({
            id: candidateId,
            resume_file_name: validation.sanitizedName || file.name,
            resume_file_path: storagePath,
            resume_file_type: validation.detectedType,
            resume_file_size: file.size,
            status: "new",
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
          errors.push({ fileName: file.name, error: "Failed to save record" });
          continue;
        }

        results.push({ id: candidateId, fileName: file.name, storagePath });
      } catch (e) {
        console.error("File processing error:", e);
        errors.push({ fileName: file.name, error: "Processing failed" });
      }
    }

    return new Response(
      JSON.stringify({ uploaded: results, errors, total: files.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("cv-library-upload error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
