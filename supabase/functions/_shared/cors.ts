// Explicit production + local-dev origins. SECURITY: do NOT add a broad
// `*.vercel.app` wildcard here — that would let ANY Vercel-hosted site (including
// an attacker's preview deployment) make credentialed cross-origin calls to these
// service-role-backed functions. Only the specific Vercel project domain(s) below
// are allowed. Add new preview domains explicitly when needed.
const allowedOrigins = [
  "https://careers.lumofy.ai",
  "https://lumofy-careers.vercel.app",
  "https://lumofycareers.vercel.app",
  "http://localhost:5173",
  "http://localhost:3005",
];

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  // Exact-match only against the allowlist (no suffix/wildcard matching).
  const isAllowed = allowedOrigins.some((o) => origin === o);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}
