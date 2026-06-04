import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Rate limit: 60 requests per minute per IP
    const ip = getClientIp(req);
    const rl = isRateLimited(`turnover-manage:${ip}`, { maxRequests: 60, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const { sessionToken, action, data } = await req.json();

    // Validate session using shared helper
    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;
    const supabase = auth.supabase;

    // Session already validated above via shared helper

    // Actions: list_entries, add_entry, update_entry, delete_entry,
    //          get_headcount, upsert_headcount, generate_analysis

    if (action === "list_entries") {
      const { month, year } = data || {};
      let query = supabase.from("turnover_entries").select("*").order("termination_date", { ascending: false });
      if (month !== undefined && year !== undefined) {
        query = query.eq("month", month).eq("year", year);
      } else if (year !== undefined) {
        query = query.eq("year", year);
      }
      const { data: entries, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ entries }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "add_entry") {
      const { employee_name, department, line_manager, tier, termination_date, termination_type, notes, included, month, year } = data;
      if (!employee_name || !termination_date || !termination_type || month === undefined || year === undefined) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: entry, error } = await supabase.from("turnover_entries").insert({
        employee_name, department: department || null, line_manager: line_manager || null,
        tier: tier || null, termination_date, termination_type,
        notes: notes || null, included: included !== false, month, year,
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ entry }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_entry") {
      const { id, ...updates } = data;
      if (!id) {
        return new Response(JSON.stringify({ error: "Entry ID required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const allowedFields = ["employee_name", "department", "line_manager", "tier", "termination_date", "termination_type", "notes", "included", "month", "year"];
      const sanitized: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (key in updates) sanitized[key] = updates[key];
      }
      const { error } = await supabase.from("turnover_entries").update(sanitized).eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_entry") {
      const { id } = data;
      if (!id) {
        return new Response(JSON.stringify({ error: "Entry ID required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("turnover_entries").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_headcount") {
      const { year } = data || {};
      let query = supabase.from("headcount_records").select("*").order("month", { ascending: true });
      if (year !== undefined) query = query.eq("year", year);
      const { data: records, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ records }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upsert_headcount") {
      const { month, year, starting_headcount, ending_headcount } = data;
      if (month === undefined || year === undefined) {
        return new Response(JSON.stringify({ error: "Month and year required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("headcount_records").upsert({
        month, year,
        starting_headcount: starting_headcount || 0,
        ending_headcount: ending_headcount || 0,
      }, { onConflict: "month,year" });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("turnover-manage error:", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
