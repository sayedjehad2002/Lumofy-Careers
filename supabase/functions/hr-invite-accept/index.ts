// Accept an HR invite: validate the token, create (or password-set) the auth
// user, add them to the hr_users allowlist, and mark the invite used.
// This is intentionally NOT session-gated — the invitee has no account/session
// yet; the single-use, expiring token IS the authorization.
import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { createServiceClient } from "../_shared/validate-session.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    // Throttle token-guessing.
    const ip = getClientIp(req);
    const rl = isRateLimited(`hr-invite-accept:${ip}`, { maxRequests: 10, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const { token, password, fullName } = await req.json().catch(() => ({}));
    if (!token) return json({ error: "Missing invite token." }, 400);
    if (!password || String(password).length < 8) {
      return json({ error: "Please choose a password of at least 8 characters." }, 400);
    }

    const supabase = createServiceClient();

    const { data: invite } = await supabase.from("invites").select("*").eq("token", token).maybeSingle();
    if (!invite) return json({ error: "This invite link is not valid." }, 404);
    if (invite.accepted_at) return json({ error: "This invite has already been used." }, 409);
    if (invite.revoked_at) return json({ error: "This invite has been revoked." }, 403);
    if (new Date(invite.expires_at).getTime() < Date.now()) return json({ error: "This invite has expired. Ask for a new one." }, 403);

    const email = String(invite.email).toLowerCase();

    // Create the account (email pre-confirmed since the invite proves the address).
    let userId: string | undefined;
    const { data: created, error: cErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: String(fullName) } : {},
    });
    userId = created?.user?.id;

    if (cErr || !userId) {
      // Account may already exist → find it and (re)set the password.
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find((u) => (u.email || "").toLowerCase() === email);
      if (!existing) return json({ error: "Could not create your account. Please contact your admin." }, 500);
      userId = existing.id;
      await supabase.auth.admin.updateUserById(userId, { password });
    }

    // Add to the allowlist (active) and consume the invite.
    await supabase.from("hr_users").upsert(
      { user_id: userId, email, role: invite.role, status: "active", invited_by: invite.invited_by },
      { onConflict: "email" },
    );
    await supabase.from("invites").update({ accepted_at: new Date().toISOString() }).eq("token", token);

    return json({ ok: true, email });
  } catch (_e) {
    return json({ error: "Internal error." }, 500);
  }
});
