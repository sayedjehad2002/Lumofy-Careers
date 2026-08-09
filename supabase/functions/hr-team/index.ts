// HR team management.
//
// Any active HR user can SEE who has access. Changing access — inviting,
// revoking, disabling, or changing someone's role — is restricted to users whose
// hr_users.role is 'owner'.
//
// The permission used to be a hardcoded email list here, which meant the `role`
// column said one thing while the code did another, and changing who manages the
// team needed a code edit + redeploy. Role is now the single source of truth, so
// it can be changed from the dashboard and is visible in the members list.
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateSession } from "../_shared/validate-session.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Roles that may be handed out from the dashboard. 'owner' is deliberately not
 *  assignable here — promoting an owner is a deliberate database action. */
const ASSIGNABLE_ROLES = new Set(["admin", "viewer"]);

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => ({}));
    const { sessionToken, action } = body as { sessionToken?: string; action?: string };

    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;
    const { supabase, role: callerRole, email: callerEmail, userId: callerId } = auth;

    // A legacy admin_sessions token is treated as owner-level for reading, but it
    // cannot prove WHO it belongs to (no user_id, no email). Management therefore
    // requires an identified Supabase Auth user — fail-closed by construction.
    const canManage = callerRole === "owner" && callerId !== null;

    if (action === "list") {
      const { data: members } = await supabase
        .from("hr_users")
        .select("id, email, role, status, created_at")
        .order("created_at", { ascending: true });
      const { data: invites } = await supabase
        .from("invites")
        .select("id, email, role, expires_at, created_at, invited_by_email")
        .is("accepted_at", null)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      const now = Date.now();
      const pending = (invites || []).filter((i) => new Date(i.expires_at).getTime() > now);
      // callerEmail lets the UI mark "you" without a second round trip.
      return json({ members: members || [], invites: pending, callerRole, callerEmail, canManage });
    }

    if (!canManage) return json({ error: "Only an owner can change team access." }, 403);

    if (action === "invite") {
      const email = String((body as { email?: string }).email || "").trim().toLowerCase();
      const requested = String((body as { role?: string }).role || "admin");
      const role = ASSIGNABLE_ROLES.has(requested) ? requested : "admin";
      if (!EMAIL_RE.test(email)) return json({ error: "Please enter a valid email." }, 400);

      const { data: existing } = await supabase.from("hr_users").select("status").eq("email", email).maybeSingle();
      if (existing && existing.status === "active") return json({ error: "That person is already on the team." }, 409);

      // Long, unguessable single-use token.
      const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Supersede any prior pending invite for this email.
      await supabase.from("invites").update({ revoked_at: new Date().toISOString() })
        .eq("email", email).is("accepted_at", null).is("revoked_at", null);

      const { error: insErr } = await supabase.from("invites").insert({
        token, email, role, invited_by: callerId, invited_by_email: callerEmail, expires_at: expiresAt,
      });
      if (insErr) return json({ error: "Could not create the invite." }, 500);
      return json({ token, email, role, expiresAt });
    }

    if (action === "revoke-invite") {
      const id = String((body as { id?: string }).id || "");
      if (!id) return json({ error: "Missing invite id." }, 400);
      await supabase.from("invites").update({ revoked_at: new Date().toISOString() }).eq("id", id);
      return json({ ok: true });
    }

    if (action === "set-status") {
      const id = String((body as { id?: string }).id || "");
      const status = (body as { status?: string }).status === "active" ? "active" : "disabled";
      const { data: target } = await supabase.from("hr_users").select("role, email").eq("id", id).maybeSingle();
      if (!target) return json({ error: "Member not found." }, 404);
      if (target.role === "owner") return json({ error: "An owner cannot be disabled." }, 403);
      if (target.email === callerEmail) return json({ error: "You cannot disable yourself." }, 403);
      await supabase.from("hr_users").update({ status }).eq("id", id);
      return json({ ok: true });
    }

    if (action === "set-role") {
      const id = String((body as { id?: string }).id || "");
      const role = String((body as { role?: string }).role || "");
      if (!id) return json({ error: "Missing member id." }, 400);
      if (!ASSIGNABLE_ROLES.has(role)) return json({ error: "Choose either Admin or Viewer." }, 400);

      const { data: target } = await supabase.from("hr_users").select("role, email").eq("id", id).maybeSingle();
      if (!target) return json({ error: "Member not found." }, 404);
      // Owners are protected both ways: one owner must not be able to demote
      // another, and nobody can demote themselves into a lockout.
      if (target.role === "owner") return json({ error: "An owner's role cannot be changed here." }, 403);
      if (target.email === callerEmail) return json({ error: "You cannot change your own role." }, 403);

      const { error: updErr } = await supabase.from("hr_users").update({ role }).eq("id", id);
      if (updErr) return json({ error: "Could not update the role." }, 500);
      return json({ ok: true, role });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (_e) {
    return json({ error: "Internal error." }, 500);
  }
});
