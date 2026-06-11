import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Rate limit: 20 deletes per minute per IP
    const ip = getClientIp(req);
    const rl = isRateLimited(`delete-applicant:${ip}`, { maxRequests: 20, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const { sessionToken, applicantId } = await req.json();

    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;

    if (!applicantId) {
      return new Response(JSON.stringify({ error: "applicantId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get applicant to find CV storage path for cleanup
    const { data: applicant } = await auth.supabase
      .from("applicants")
      .select("cv_storage_path")
      .eq("id", applicantId)
      .single();

    // Delete CV from storage if exists. `library/` paths belong to the CV-library
    // record (cv-library bucket) and must survive the applicant's deletion.
    if (applicant?.cv_storage_path && !applicant.cv_storage_path.startsWith("library/")) {
      await auth.supabase.storage.from("cvs").remove([applicant.cv_storage_path]);
    }

    // Delete applicant record
    const { error } = await auth.supabase
      .from("applicants")
      .delete()
      .eq("id", applicantId);

    if (error) {
      console.error("Delete applicant error:", error);
      return new Response(JSON.stringify({ error: "Failed to delete applicant" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-applicant error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
