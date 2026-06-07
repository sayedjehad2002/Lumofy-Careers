import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";

// ---------------------------------------------------------------------------
// SECURITY MODEL (fix #1 — over-permissive proxy)
//
// This function is a thin DB proxy reachable by any holder of a valid admin
// session. To stop it from becoming a "run arbitrary queries against any table"
// gateway we enforce, per table:
//   - a SELECT column allowlist  -> the `select` string is built from it
//     (we NEVER return `*`, and clients can never supply a select string);
//   - a WRITABLE column allowlist -> insert/update/upsert payloads are filtered
//     and any unknown field is REJECTED;
//   - every filter/order column is validated against the SELECT allowlist
//     (so you can only filter/sort on real, allowlisted columns);
//   - update/delete must carry at least one scalar equality filter.
//
// Only tables actually used by the app remain in the allowlists. Dormant tables
// (employees, surveys*, copilot_*, headcount_records, performance_snapshots,
// turnover_entries, policies, pipeline_*) have been dropped entirely.
// ---------------------------------------------------------------------------

// Per-table SELECT column allowlists. The `select` string sent to PostgREST is
// built by joining these — clients cannot widen it and `*` is never used.
const SELECT_COLUMNS: Record<string, readonly string[]> = {
  // jobs: MUST include every column — the admin dashboard loads full job rows
  // through this path (CareersContext jobToDbRow / dbRowToJob round-trips them).
  jobs: [
    "id", "title", "department", "location", "type", "status", "summary",
    "description", "responsibilities", "requirements", "benefits",
    "salary_range", "salary_currency", "posted_date", "deadline",
    "screening_questions", "jd_file_name", "jd_file_path", "jd_file_size",
    "jd_file_uploaded_at", "ai_scoring_weights", "archived_at", "created_at", "updated_at",
  ],
  // applicants: every column the dashboard renders (dbRowToApplicant).
  applicants: [
    "id", "job_id", "full_name", "email", "phone", "location", "nationality",
    "linkedin", "portfolio", "cover_letter", "cv_file_name", "cv_storage_path",
    "cv_file_type", "cv_file_size", "screening_answers", "status",
    "applied_date", "notes", "rating", "ai_analysis", "stage_entered_at",
    "created_at", "updated_at",
  ],
  // cv_library_candidates: full row (CV library dashboard view).
  cv_library_candidates: [
    "id", "name", "email", "phone", "nationality", "country", "location",
    "years_experience", "skills", "industries", "roles_summary", "tags",
    "status", "resume_file_name", "resume_file_path", "resume_file_type",
    "resume_file_size", "extracted_text", "suggested_department",
    "suggested_job_title", "classification_confidence", "classification_reasoning",
    "classification_evidence", "manual_department", "manual_job_title",
    "manual_overrides", "uploaded_at", "updated_at", "created_at",
  ],
};

// Per-table WRITABLE column allowlists (insert/update/upsert). Server-managed
// columns (created_at/updated_at are DB-defaulted) are intentionally excluded.
const WRITABLE_COLUMNS: Record<string, readonly string[]> = {
  // Exactly the fields the dashboard sends in jobToDbRow.
  jobs: [
    "id", "title", "department", "location", "type", "status", "summary",
    "description", "responsibilities", "requirements", "benefits",
    "salary_range", "salary_currency", "posted_date", "deadline",
    "screening_questions", "jd_file_name", "jd_file_path", "jd_file_size",
    "jd_file_uploaded_at", "ai_scoring_weights", "archived_at",
  ],
};

// Tables exposed to this proxy at all. Writes are further gated by the presence
// of a WRITABLE_COLUMNS entry above. admin_sessions / login_attempts are NOT
// included: nothing in the app routes them through admin-data (they are handled
// by dedicated auth functions), so exposing them here would be needless surface.
const ALLOWED_TABLES = new Set(Object.keys(SELECT_COLUMNS));

// Max rows per select to prevent data exfiltration
const MAX_SELECT_LIMIT = 500;

type Action = "select" | "insert" | "update" | "delete" | "upsert";

// Defense-in-depth charset check (the allowlist is the real gate).
function isSafeColumnName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

// Validate every filter/order column referenced in params against the table's
// SELECT allowlist. Returns an error string, or null if everything is allowed.
function validateParams(
  params: Record<string, unknown>,
  allowedColumns: ReadonlySet<string>,
): string | null {
  // Column-keyed filter operators (object: { column: value }).
  for (const filterKey of ["eq", "neq", "gt", "lt", "in", "ilike"]) {
    const filter = params[filterKey];
    if (filter && typeof filter === "object") {
      for (const col of Object.keys(filter as object)) {
        if (!isSafeColumnName(col) || !allowedColumns.has(col)) {
          return `Invalid filter column: ${col}`;
        }
      }
    }
  }
  // order: { column, ascending? }
  if (params.order) {
    const ord = params.order as { column?: string };
    if (ord.column && (!isSafeColumnName(ord.column) || !allowedColumns.has(ord.column))) {
      return `Invalid order column: ${ord.column}`;
    }
  }
  return null;
}

// Validate a write payload (object, or array of objects for bulk insert/upsert)
// against the table's WRITABLE allowlist. Rejects any unknown field.
function validateWritePayload(
  data: unknown,
  writable: ReadonlySet<string>,
): string | null {
  const rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return "data must not be empty";
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return "data must be an object";
    }
    for (const key of Object.keys(row as Record<string, unknown>)) {
      if (!isSafeColumnName(key) || !writable.has(key)) {
        return `Unknown or non-writable field: ${key}`;
      }
    }
  }
  return null;
}

// Does `eq` carry at least one scalar (non-null) equality filter? Required for
// update/delete so a missing/empty filter can't hit every row.
function hasScalarEqFilter(eq: unknown): boolean {
  if (!eq || typeof eq !== "object" || Array.isArray(eq)) return false;
  const entries = Object.entries(eq as Record<string, unknown>);
  if (entries.length === 0) return false;
  return entries.some(([, v]) =>
    v != null && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
  );
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

    // Validate table name against the allowlist
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

    const selectColumns = SELECT_COLUMNS[table];
    const allowedColumnSet = new Set(selectColumns);
    const writableList = WRITABLE_COLUMNS[table];
    const writableSet = new Set(writableList || []);

    // For write operations, the table must have a WRITABLE allowlist.
    if (action !== "select" && !writableList) {
      return new Response(JSON.stringify({ error: "Write not allowed on this table" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p = params || {};

    // Validate filter/order columns against the SELECT allowlist
    const paramError = validateParams(p, allowedColumnSet);
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
        // Build the select string from the allowlist — never `*`, never client-supplied.
        let query = sb.from(table).select(selectColumns.join(","));
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
        const writeErr = validateWritePayload(p.data, writableSet);
        if (writeErr) {
          return new Response(JSON.stringify({ error: writeErr }), {
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
        const writeErr = validateWritePayload(p.data, writableSet);
        if (writeErr) {
          return new Response(JSON.stringify({ error: writeErr }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Require a scalar equality filter so an update can never hit every row.
        if (!hasScalarEqFilter(p.eq)) {
          return new Response(JSON.stringify({ error: "update requires a scalar eq filter" }), {
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
        // Require a scalar equality filter so a delete can never wipe the table.
        if (!hasScalarEqFilter(p.eq)) {
          return new Response(JSON.stringify({ error: "delete requires a scalar eq filter" }), {
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
        const writeErr = validateWritePayload(p.data, writableSet);
        if (writeErr) {
          return new Response(JSON.stringify({ error: writeErr }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const opts: any = {};
        // onConflict must reference allowlisted columns only.
        if (p.onConflict) {
          if (typeof p.onConflict !== "string") {
            return new Response(JSON.stringify({ error: "onConflict must be a string" }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const cols = p.onConflict.split(",").map((c) => c.trim());
          for (const c of cols) {
            if (!isSafeColumnName(c) || !writableSet.has(c)) {
              return new Response(JSON.stringify({ error: `Invalid onConflict column: ${c}` }), {
                status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
          opts.onConflict = p.onConflict;
        }
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
