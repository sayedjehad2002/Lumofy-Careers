// Shared session validation for edge functions
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
  if (!sessionToken) {
    return {
      valid: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from("admin_sessions")
    .select("id")
    .eq("token", sessionToken)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!session) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      ),
    };
  }

  return { valid: true, supabase };
}
