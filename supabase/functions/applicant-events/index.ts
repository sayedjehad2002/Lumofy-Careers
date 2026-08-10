import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";

// The history for one candidate: who moved them between stages, and who wrote
// each note.
//
// Read-only, and deliberately open to every HR role including viewers — an audit
// trail that only some of the team can see does not do the job it exists for.
// `validateSession` without `{ require: "write" }` is exactly that gate.
//
// Fetched per candidate when their profile opens rather than joined into
// get-applicants: 367 candidates' worth of history on every dashboard load would
// be a large payload nobody reads.
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip = getClientIp(req);
    const rl = isRateLimited(`applicant-events:${ip}`, { maxRequests: 120, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const { sessionToken, applicantId } = await req.json();

    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;

    if (!applicantId || typeof applicantId !== "string") {
      return new Response(JSON.stringify({ error: "applicantId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await auth.supabase
      .from("applicant_events")
      .select("id, kind, actor_email, from_status, to_status, note, created_at")
      .eq("applicant_id", applicantId)
      .order("created_at", { ascending: false })
      // A single candidate accumulating more than this would be extraordinary;
      // the bound exists so one pathological row set cannot stall a profile.
      .limit(200);

    if (error) {
      console.error("applicant-events read error:", error);
      return new Response(JSON.stringify({ error: "Failed to load history" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ events: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("applicant-events error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
