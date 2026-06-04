import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";

// Whitelist of tables that can be queried through this proxy
const ALLOWED_TABLES = new Set([
  "employees",
  "headcount_records",
  "cv_library_candidates",
  "performance_snapshots",
  "copilot_memory",
  "copilot_sessions",
  "copilot_messages",
  "pipeline_rules",
  "pipeline_automation_log",
  "turnover_entries",
  "survey_responses",
  "survey_answers",
  "surveys",
  "survey_questions",
  "survey_intelligence_cache",
  "policies",
  "jobs",
  "applicants",
  "audit_log",
]);

// Tables allowed for write operations
const ALLOWED_WRITE_TABLES = new Set([
  "employees",
  "headcount_records",
  "performance_snapshots",
  "copilot_memory",
  "copilot_sessions",
  "copilot_messages",
  "pipeline_rules",
  "turnover_entries",
  "surveys",
  "survey_questions",
  "survey_intelligence_cache",
  "policies",
  "jobs",
]);

// Tables with restricted SELECT (only return non-sensitive columns)
const RESTRICTED_SELECT_FIELDS: Record<string, string> = {
  // Don't allow selecting password hashes
  admin_passwords: "id,label,created_at",
};

// Max rows per select to prevent data exfiltration
const MAX_SELECT_LIMIT = 500;

type Action = "select" | "insert" | "update" | "delete" | "upsert";

// Validate that column names don't contain SQL injection attempts
function isSafeColumnName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

function validateParams(params: Record<string, unknown>): string | null {
  // Check eq/neq/gt/lt/in keys for safe column names
  for (const filterKey of ["eq", "neq", "gt", "lt", "in"]) {
    if (params[filterKey] && typeof params[filterKey] === "object") {
      for (const col of Object.keys(params[filterKey] as object)) {
        if (!isSafeColumnName(col)) return `Invalid column name: ${col}`;
      }
    }
  }
  // Validate order column
  if (params.order) {
    const ord = params.order as { column?: string };
    if (ord.column && !isSafeColumnName(ord.column)) return `Invalid order column: ${ord.column}`;
  }
  return null;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip = getClientIp(req);
    const rl = isRateLimited(`admin-data:${ip}`, { maxRequests: 120, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const body = await req.json();
    const { sessionToken, action, table, params } = body as {
      sessionToken: string;
      action: Action;
      table: string;
      params?: Record<string, unknown>;
    };

    // Input validation
    if (!sessionToken || typeof sessionToken !== "string") {
      return new Response(JSON.stringify({ error: "Session token required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!action || typeof action !== "string") {
      return new Response(JSON.stringify({ error: "Action required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!table || typeof table !== "string" || !isSafeColumnName(table)) {
      return new Response(JSON.stringify({ error: "Invalid table" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate session
    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;

    // Validate table name
    if (!ALLOWED_TABLES.has(table)) {
      return new Response(JSON.stringify({ error: "Invalid table" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate action
    if (!["select", "insert", "update", "delete", "upsert"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For write operations, check table is in write whitelist
    if (action !== "select" && !ALLOWED_WRITE_TABLES.has(table)) {
      return new Response(JSON.stringify({ error: "Write not allowed on this table" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p = params || {};

    // Validate parameters
    const paramError = validateParams(p);
    if (paramError) {
      return new Response(JSON.stringify({ error: paramError }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = auth.supabase;

    // Audit log (fire-and-forget for non-blocking)
    const auditDetails: Record<string, unknown> = { action, table };
    if (p.eq) auditDetails.filters = p.eq;
    if (action !== "select") auditDetails.hasData = !!p.data;
    sb.from("audit_log").insert({
      action,
      table_name: table,
      ip_address: ip,
      session_id: sessionToken.substring(0, 8) + "...",
      details: auditDetails,
    }).then(() => {}).catch((e: unknown) => console.error("Audit log error:", e));

    let result: { data: unknown; error: unknown };

    switch (action) {
      case "select": {
        // Apply restricted fields if applicable — never allow client-provided select strings
        const selectFields = RESTRICTED_SELECT_FIELDS[table] || "*";
        let query = sb.from(table).select(selectFields);
        if (p.eq) for (const [col, val] of Object.entries(p.eq as Record<string, unknown>)) {
          query = query.eq(col, val);
        }
        if (p.neq) for (const [col, val] of Object.entries(p.neq as Record<string, unknown>)) {
          query = query.neq(col, val);
        }
        if (p.gt) for (const [col, val] of Object.entries(p.gt as Record<string, unknown>)) {
          query = query.gt(col, val);
        }
        if (p.lt) for (const [col, val] of Object.entries(p.lt as Record<string, unknown>)) {
          query = query.lt(col, val);
        }
        if (p.in) for (const [col, val] of Object.entries(p.in as Record<string, unknown[]>)) {
          query = query.in(col, val);
        }
        if (p.ilike) for (const [col, val] of Object.entries(p.ilike as Record<string, string>)) {
          query = query.ilike(col, val);
        }
        if (p.order) {
          const ord = p.order as { column: string; ascending?: boolean };
          query = query.order(ord.column, { ascending: ord.ascending ?? true });
        }
        // Enforce max limit
        const limit = typeof p.limit === "number" ? Math.min(p.limit, MAX_SELECT_LIMIT) : MAX_SELECT_LIMIT;
        query = query.limit(limit);
        if (p.single) {
          result = await query.single();
        } else if (p.maybeSingle) {
          result = await query.maybeSingle();
        } else {
          result = await query;
        }
        break;
      }
      case "insert": {
        if (!p.data) {
          return new Response(JSON.stringify({ error: "data is required for insert" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await sb.from(table).insert(p.data as any);
        break;
      }
      case "update": {
        if (!p.data || !p.eq) {
          return new Response(JSON.stringify({ error: "data and eq are required for update" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        let query = sb.from(table).update(p.data as any);
        for (const [col, val] of Object.entries(p.eq as Record<string, unknown>)) {
          query = query.eq(col, val);
        }
        result = await query;
        break;
      }
      case "delete": {
        if (!p.eq) {
          return new Response(JSON.stringify({ error: "eq filter is required for delete" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        let query = sb.from(table).delete();
        for (const [col, val] of Object.entries(p.eq as Record<string, unknown>)) {
          query = query.eq(col, val);
        }
        result = await query;
        break;
      }
      case "upsert": {
        if (!p.data) {
          return new Response(JSON.stringify({ error: "data is required for upsert" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const opts: any = {};
        if (p.onConflict) opts.onConflict = p.onConflict;
        result = await sb.from(table).upsert(p.data as any, opts);
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    if (result.error) {
      console.error(`admin-data ${action} ${table} error:`, result.error);
      return new Response(JSON.stringify({ error: `Failed to ${action} ${table}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: result.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-data error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
