import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Rate limit: 30 requests per minute per IP
    const ip = getClientIp(req);
    const rl = isRateLimited(`get-jd-url:${ip}`, { maxRequests: 30, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const { jobId, sessionToken } = await req.json();

    // Require session for JD downloads
    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;
    if (!jobId || typeof jobId !== "string") {
      return new Response(JSON.stringify({ error: "jobId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: job, error: jobError } = await auth.supabase
      .from("jobs")
      .select("jd_file_path, jd_file_name")
      .eq("id", jobId)
      .single();

    if (jobError || !job?.jd_file_path) {
      return new Response(JSON.stringify({ error: "JD file not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await auth.supabase.storage
      .from("jds")
      .createSignedUrl(job.jd_file_path, 300, {
        download: job.jd_file_name || "job-description.pdf",
      });

    if (error) {
      console.error("Signed URL error:", error);
      return new Response(JSON.stringify({ error: "Failed to generate download link" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: data.signedUrl, fileName: job.jd_file_name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-jd-url error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
