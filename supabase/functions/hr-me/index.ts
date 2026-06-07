// Returns whether the current session belongs to an authorized HR user.
// Used by the frontend to decide if the "HR Dashboard" button + route show.
// Always responds 200 with { authorized: boolean, role? } so the client can
// branch cleanly (it does NOT 401/403 like the gated data functions).
import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/validate-session.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { sessionToken } = await req.json().catch(() => ({}));
    if (!sessionToken) return json({ authorized: false });

    const supabase = createServiceClient();

    // Supabase Auth JWT → look up the allowlist by user_id.
    if (String(sessionToken).split(".").length === 3) {
      const { data, error } = await supabase.auth.getUser(sessionToken);
      if (error || !data?.user) return json({ authorized: false });
      const { data: hr } = await supabase
        .from("hr_users")
        .select("role, status")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (hr && hr.status === "active") {
        return json({ authorized: true, role: hr.role, email: (data.user.email || "").toLowerCase() });
      }
      return json({ authorized: false });
    }

    // Legacy admin_sessions token → owner fallback.
    const { data: s } = await supabase
      .from("admin_sessions")
      .select("id")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    return json({ authorized: !!s, role: s ? "owner" : undefined });
  } catch (_e) {
    return json({ authorized: false });
  }
});
