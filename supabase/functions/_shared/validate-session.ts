// Shared session validation for edge functions.
//
// Accepts EITHER:
//   (a) a Supabase Auth access token (JWT) — the new, reliable login path
//       (the dashboard now signs in with supabase.auth.signInWithPassword), OR
//   (b) a legacy `admin_sessions` UUID token — kept as a fallback so nothing
//       breaks during the migration and so we can roll back instantly.
//
// On success it returns a service-role client so callers keep doing their
// privileged DB work exactly as before — no other function needs to change.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export async function validateSession(
  sessionToken: string | null | undefined,
  corsHeaders: Record<string, string>
): Promise<{ valid: true; supabase: ReturnType<typeof createServiceClient> } | { valid: false; response: Response }> {
  const unauthorized = (msg: string) => ({
    valid: false as const,
    response: new Response(JSON.stringify({ error: msg }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }),
  });

  const forbidden = (msg: string) => ({
    valid: false as const,
    response: new Response(JSON.stringify({ error: msg }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }),
  });

  if (!sessionToken) return unauthorized("Unauthorized");

  const supabase = createServiceClient();

  // (a) New path: a Supabase Auth access token is a JWT (three dot-separated
  // segments). `auth.getUser` verifies its signature + expiry against this
  // project and returns the signed-in user.
  if (sessionToken.split(".").length === 3) {
    try {
      const { data, error } = await supabase.auth.getUser(sessionToken);
      if (!error && data?.user) {
        // Authorization (not just authentication): the signed-in user must be on
        // the HR allowlist AND active. A valid Supabase account that isn't on the
        // list gets NO access — this is the "can't get in even with a password"
        // guarantee. The owner is seeded; invitees are added on accept.
        const { data: hr } = await supabase
          .from("hr_users")
          .select("status")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (hr?.status === "active") {
          return { valid: true, supabase };
        }
        return forbidden("Your account is not authorized for the HR dashboard.");
      }
    } catch (_e) {
      // not a valid JWT for us — fall through to the legacy check
    }
  }

  // (b) Legacy path: a custom admin_sessions UUID token.
  const { data: session } = await supabase
    .from("admin_sessions")
    .select("id")
    .eq("token", sessionToken)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (session) return { valid: true, supabase };

  return unauthorized("Invalid or expired session");
}
