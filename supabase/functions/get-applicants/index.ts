import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";

/** How many strengths / gaps the list keeps: Compare shows the top three. */
const LIST_TOP_N = 3;

/**
 * Cut an analysis down to what the list screens read.
 *
 * The full analysis averages ~10 KB a person and made up 87% of this response
 * (4.1 of 4.7 MB for 421 applicants on 2026-09-30), yet the roster, board,
 * Overview and Compare only read these fields. The profile fetches the full
 * record by id. `_partial` tells the client which one it is holding.
 */
function slimAnalysis(ai: Record<string, unknown> | null) {
  if (!ai || typeof ai !== "object") return ai;
  const top = (v: unknown) => (Array.isArray(v) ? v.slice(0, LIST_TOP_N) : v);
  return {
    fitScore: ai.fitScore,
    fitLevel: ai.fitLevel,
    recommendation: ai.recommendation,
    skillsCoveragePercent: ai.skillsCoveragePercent,
    analyzedAt: ai.analyzedAt,
    strengths: top(ai.strengths),
    gaps: top(ai.gaps),
    _partial: true,
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    // Rate limit: 30 requests per minute per IP. A single-applicant read (opening
    // a profile) gets its own, roomier budget so paging through candidates
    // cannot lock the list out.
    const { sessionToken, view, applicantId } = await req.json();
    const ip = getClientIp(req);
    const rl = applicantId
      ? isRateLimited(`get-applicant:${ip}`, { maxRequests: 240, windowMs: 60_000 })
      : isRateLimited(`get-applicants:${ip}`, { maxRequests: 30, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;

    // One full record, for the candidate profile.
    if (applicantId) {
      if (typeof applicantId !== "string") return json({ error: "Invalid applicantId" }, 400);
      const { data, error } = await auth.supabase
        .from("applicants").select("*").eq("id", applicantId).maybeSingle();
      if (error) {
        console.error("Fetch applicant error:", error);
        return json({ error: "Failed to fetch applicant" }, 500);
      }
      if (!data) return json({ error: "Not found" }, 404);
      return json({ applicant: data });
    }

    const { data, error } = await auth.supabase
      .from("applicants")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fetch applicants error:", error);
      return json({ error: "Failed to fetch applicants" }, 500);
    }

    // `view: "list"` is opt-in so a browser still running the previous bundle
    // keeps getting full rows; it has no code to fetch them one at a time.
    const rows = view === "list"
      ? data.map((r) => ({ ...r, ai_analysis: slimAnalysis(r.ai_analysis) }))
      : data;

    return json({ applicants: rows });
  } catch (e) {
    console.error("get-applicants error:", e);
    return json({ error: "Internal error" }, 500);
  }
});
