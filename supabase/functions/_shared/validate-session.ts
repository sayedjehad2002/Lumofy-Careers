// Shared session validation + authorization for edge functions.
//
// Accepts EITHER:
//   (a) a Supabase Auth access token (JWT) — the new, reliable login path
//       (the dashboard now signs in with supabase.auth.signInWithPassword), OR
//   (b) a legacy `admin_sessions` UUID token — kept as a fallback so nothing
//       breaks during the migration and so we can roll back instantly.
//
// On success it returns a service-role client so callers keep doing their
// privileged DB work exactly as before, PLUS the caller's role and email.
//
// ROLES — the `role` column on hr_users is the single source of truth:
//   owner   full access + team management (invite, disable, change roles)
//   admin   full hiring access, no team management
//   viewer  read-only: may browse and run AI analysis, may not change data
//
// Pass `{ require: "write" }` from any endpoint that mutates data and viewers
// are rejected with 403. The default is "read", so existing callers keep their
// previous behaviour untouched.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type HrRole = "owner" | "admin" | "viewer";

export function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

type ServiceClient = ReturnType<typeof createServiceClient>;

export type SessionResult =
  | { valid: true; supabase: ServiceClient; role: HrRole; email: string; userId: string | null }
  | { valid: false; response: Response };

/** 403 for a viewer attempting a mutation. Exported for endpoints that decide
 *  read-vs-write per action rather than per request. */
export function writeDenied(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Your account has read-only access, so this change was not saved." }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

export async function validateSession(
  sessionToken: string | null | undefined,
  corsHeaders: Record<string, string>,
  opts?: { require?: "read" | "write" }
): Promise<SessionResult> {
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

  const gate = (role: HrRole, email: string, userId: string | null): SessionResult => {
    if (opts?.require === "write" && role === "viewer") return { valid: false, response: writeDenied(corsHeaders) };
    return { valid: true, supabase, role, email, userId };
  };

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
          .select("role, status")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (hr?.status === "active") {
          const role: HrRole =
            hr.role === "owner" || hr.role === "viewer" ? hr.role : "admin";
          return gate(role, (data.user.email || "").toLowerCase(), data.user.id);
        }
        return forbidden("Your account is not authorized for the HR dashboard.");
      }
    } catch (_e) {
      // not a valid JWT for us — fall through to the legacy check
    }
  }

  // (b) Legacy path: a custom admin_sessions UUID token. It predates roles and
  // cannot prove an email, so it is treated as owner-level but can never satisfy
  // an email-identified check (hr-team compares user_id, which is null here).
  const { data: session } = await supabase
    .from("admin_sessions")
    .select("id")
    .eq("token", sessionToken)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (session) return gate("owner", "", null);

  return unauthorized("Invalid or expired session");
}
