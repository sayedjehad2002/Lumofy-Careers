import { supabase } from "@/integrations/supabase/client";

/**
 * Secure proxy for database operations on locked-down tables.
 * All operations are validated server-side via admin session token.
 */
export async function adminQuery<T = any>(
  sessionToken: string,
  action: "select" | "insert" | "update" | "delete" | "upsert",
  table: string,
  params?: Record<string, unknown>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-data", {
      body: { sessionToken, action, table, params },
    });

    if (error) {
      // Check for 401 — session expired
      if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
        return { data: null, error: "Session expired" };
      }
      return { data: null, error: error.message || "Request failed" };
    }

    if (data?.error) {
      return { data: null, error: data.error };
    }

    return { data: data?.data ?? null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
