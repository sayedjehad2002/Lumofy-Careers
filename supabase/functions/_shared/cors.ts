const allowedOrigins = [
  "https://careers.lumofy.ai",
  "https://lumofycareers.vercel.app",
  "http://localhost:5173",
  "http://localhost:3005",
];

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const isAllowed = allowedOrigins.some((o) => origin === o) || origin.endsWith(".vercel.app");
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}
