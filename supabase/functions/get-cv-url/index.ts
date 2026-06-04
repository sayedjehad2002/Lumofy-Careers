import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Rate limit: 30 requests per minute per IP
    const ip = getClientIp(req);
    const rl = isRateLimited(`get-cv-url:${ip}`, { maxRequests: 30, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const { storagePath, sessionToken } = await req.json();

    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;

    if (!storagePath) {
      return new Response(JSON.stringify({ error: "storagePath is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Short-lived signed URL (5 minutes)
    const { data, error } = await auth.supabase.storage
      .from("cvs")
      .createSignedUrl(storagePath, 300);

    if (error) {
      console.error("Signed URL error:", error);
      return new Response(JSON.stringify({ error: "CV file not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: data.signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-cv-url error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
