import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { createServiceClient } from "../_shared/validate-session.ts";

/**
 * Logout / session revocation (fix #6).
 *
 * Deletes the admin_sessions row matching the supplied session token so the
 * token can no longer be used (server-side revocation). Accepts the token from
 * the request body (`sessionToken`) or the `x-session-token` header.
 *
 * Intentionally idempotent: deleting a missing/expired token still returns 200
 * so the client can always treat logout as successful and clear local state.
 */
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Light rate limit to prevent abuse of the revocation endpoint.
    const ip = getClientIp(req);
    const rl = isRateLimited(`logout:${ip}`, { maxRequests: 30, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    // Token may come from the body or the x-session-token header.
    let bodyToken: string | undefined;
    try {
      const body = await req.json();
      bodyToken = typeof body?.sessionToken === "string" ? body.sessionToken : undefined;
    } catch {
      // No / invalid JSON body is fine — fall back to the header.
    }
    const sessionToken = bodyToken || req.headers.get("x-session-token") || "";

    if (!sessionToken) {
      return new Response(JSON.stringify({ error: "sessionToken is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createServiceClient();

    // Revoke the session. Use the service-role client (admin_sessions is RLS-locked
    // to service_role only). Missing rows are not an error.
    const { error } = await supabase
      .from("admin_sessions")
      .delete()
      .eq("token", sessionToken);

    if (error) {
      console.error("logout delete error:", error);
      return new Response(JSON.stringify({ error: "Failed to revoke session" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("logout error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
