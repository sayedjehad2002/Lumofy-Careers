// HR team management (owner/admin only): list members + pending invites,
// create an invite (returns a single-use token), revoke an invite, and
// enable/disable a member. All actions are authorized via validate-session
// (which now enforces the hr_users allowlist) PLUS a role check here.
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateSession } from "../_shared/validate-session.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const supabase = auth.supabase;

    // Identify the caller + their role.
    let callerId: string | null = null;
    let callerEmail = "";
    if (sessionToken && String(sessionToken).split(".").length === 3) {
      const { data: u } = await supabase.auth.getUser(sessionToken);
      callerId = u?.user?.id ?? null;
      callerEmail = (u?.user?.email || "").toLowerCase();
    }
    const { data: caller } = callerId
      ? await supabase.from("hr_users").select("role").eq("user_id", callerId).maybeSingle()
      : { data: null };
    const callerRole = caller?.role ?? (callerId ? null : "owner"); // legacy token → owner
    const canManage = callerRole === "owner" || callerRole === "admin";

    if (action === "list") {
      const { data: members } = await supabase
        .from("hr_users")
        .select("id, email, role, status, created_at")
        .order("created_at", { ascending: true });
      const { data: invites } = await supabase
        .from("invites")
        .select("id, email, role, expires_at, created_at")
        .is("accepted_at", null)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      const now = Date.now();
      const pending = (invites || []).filter((i) => new Date(i.expires_at).getTime() > now);
      return json({ members: members || [], invites: pending, callerRole });
    }

    if (!canManage) return json({ error: "Only owners or admins can manage the HR team." }, 403);

    if (action === "invite") {
      const email = String((body as { email?: string }).email || "").trim().toLowerCase();
      const role = (body as { role?: string }).role === "viewer" ? "viewer" : "admin";
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
      if (target.role === "owner") return json({ error: "The owner cannot be disabled." }, 403);
      if (target.email === callerEmail) return json({ error: "You cannot disable yourself." }, 403);
      await supabase.from("hr_users").update({ status }).eq("id", id);
      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (_e) {
    return json({ error: "Internal error." }, 500);
  }
});
