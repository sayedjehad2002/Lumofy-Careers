import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Rate limit: 30 requests per minute per IP
    const ip = getClientIp(req);
    const rl = isRateLimited(`get-applicants:${ip}`, { maxRequests: 30, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const { sessionToken } = await req.json();

    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;

    const { data, error } = await auth.supabase
      .from("applicants")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fetch applicants error:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch applicants" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ applicants: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-applicants error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
