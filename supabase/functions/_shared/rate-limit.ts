// Shared rate limiting utility for edge functions
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULTS: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
};

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function isRateLimited(
  key: string,
  config: Partial<RateLimitConfig> = {}
): { limited: boolean; remaining: number; retryAfterMs: number } {
  const { maxRequests, windowMs } = { ...DEFAULTS, ...config };
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: maxRequests - 1, retryAfterMs: 0 };
  }

  record.count++;
  if (record.count > maxRequests) {
    return {
      limited: true,
      remaining: 0,
      retryAfterMs: record.resetAt - now,
    };
  }

  return { limited: false, remaining: maxRequests - record.count, retryAfterMs: 0 };
}

export function rateLimitResponse(
  corsHeaders: Record<string, string>,
  retryAfterMs: number
): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
      },
    }
  );
}
