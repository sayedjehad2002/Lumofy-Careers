import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { createServiceClient, validateSession } from "../_shared/validate-session.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Rate limit: 30 requests per minute per IP
    const ip = getClientIp(req);
    const rl = isRateLimited(`get-jd-url:${ip}`, { maxRequests: 30, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const { jobId, sessionToken } = await req.json();

    if (!jobId || typeof jobId !== "string") {
      return new Response(JSON.stringify({ error: "jobId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The JD is the advert for a role anyone can already read on the public site,
    // so candidates may download it — this used to require an HR session, which
    // meant the public "Download job description" button failed for everyone.
    //
    // An HR session still unlocks ANY job (draft, closed, archived) for the
    // dashboard. A token that is missing OR expired falls through to the public
    // rules rather than hard-failing, so a stale login can't break a public
    // download.
    let supabase = null;
    if (sessionToken) {
      const auth = await validateSession(sessionToken, corsHeaders);
      if (auth.valid) supabase = auth.supabase;
    }
    const publicOnly = supabase === null;
    if (!supabase) supabase = createServiceClient();

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("jd_file_path, jd_file_name, status, archived_at")
      .eq("id", jobId)
      .single();

    // Without a valid HR session the job must be publicly listed — the same
    // predicate get_public_jobs uses, so nothing becomes reachable here that
    // isn't already visible on the careers site.
    const publiclyListed = job?.status === "open" && job?.archived_at === null;

    if (jobError || !job?.jd_file_path || (publicOnly && !publiclyListed)) {
      return new Response(JSON.stringify({ error: "JD file not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.storage
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
