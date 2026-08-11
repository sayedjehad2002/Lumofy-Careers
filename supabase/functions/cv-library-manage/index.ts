import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession, writeDenied } from "../_shared/validate-session.ts";
import { deriveClassificationFromAnalysis, sanitizeCandidateName } from "../_shared/taxonomy.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip = getClientIp(req);
    const rl = isRateLimited(`cv-lib-manage:${ip}`, { maxRequests: 60, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const body = await req.json();
    const { action, sessionToken } = body;

    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;
    const supabase = auth.supabase;

    // This endpoint mixes reads and writes, so viewers are filtered per action:
    // browsing and opening a CV is fine, changing or removing one is not.
    const READ_ACTIONS = new Set(["list", "list-trash", "get", "download"]);
    if (auth.role === "viewer" && !READ_ACTIONS.has(action)) return writeDenied(corsHeaders);

    // LIST candidates (active only — soft-deleted rows are hidden)
    if (action === "list") {
      const { data, error } = await supabase
        .from("cv_library_candidates")
        .select("*")
        .is("deleted_at", null)
        .order("uploaded_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return new Response(JSON.stringify({ candidates: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LIST TRASH — soft-deleted candidates (the recycle bin)
    if (action === "list-trash") {
      const { data, error } = await supabase
        .from("cv_library_candidates")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return new Response(JSON.stringify({ candidates: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET single candidate
    if (action === "get") {
      const { candidateId } = body;
      const { data, error } = await supabase
        .from("cv_library_candidates")
        .select("*")
        .eq("id", candidateId)
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ candidate: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE candidate fields (manual override)
    if (action === "update") {
      const { candidateId, updates } = body;
      const allowedFields = [
        "name", "email", "phone", "nationality", "country", "location",
        "years_experience", "skills", "industries", "roles_summary", "tags",
        "status", "manual_department", "manual_job_title", "manual_overrides",
        "suggested_department", "suggested_job_title", "ai_analysis",
      ];

      const safeUpdates: Record<string, any> = {};
      for (const key of allowedFields) {
        if (key in updates) safeUpdates[key] = updates[key];
      }

      const { error } = await supabase
        .from("cv_library_candidates")
        .update(safeUpdates)
        .eq("id", candidateId);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE candidate — SOFT delete (recoverable). Keeps the stored file so a
    // restore can recover it. Use the "purge" action for permanent erasure.
    if (action === "delete") {
      const { candidateId } = body;

      const { error } = await supabase
        .from("cv_library_candidates")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", candidateId);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RESTORE a soft-deleted candidate back into the active library
    if (action === "restore") {
      const { candidateId } = body;

      const { error } = await supabase
        .from("cv_library_candidates")
        .update({ deleted_at: null })
        .eq("id", candidateId);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PURGE — permanent erasure (GDPR right to be forgotten). Removes the stored
    // CV file AND the row. Irreversible.
    if (action === "purge") {
      const { candidateId } = body;

      // Get file path first
      const { data: candidate } = await supabase
        .from("cv_library_candidates")
        .select("resume_file_path")
        .eq("id", candidateId)
        .single();

      if (candidate?.resume_file_path) {
        await supabase.storage.from("cv-library").remove([candidate.resume_file_path]);
      }

      const { error } = await supabase
        .from("cv_library_candidates")
        .delete()
        .eq("id", candidateId);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PURGE MANY — bulk permanent erasure (GDPR right to be forgotten), used by
    // the Trash view's "Delete all" action. Same irreversible effect as "purge",
    // batched into two round trips (one storage removal, one row delete) instead
    // of one request per candidate.
    if (action === "purge-many") {
      const { candidateIds } = body;
      if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
        return new Response(JSON.stringify({ error: "candidateIds required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: rows } = await supabase
        .from("cv_library_candidates")
        .select("resume_file_path")
        .in("id", candidateIds);

      const paths = (rows || [])
        .map((r) => r.resume_file_path)
        .filter((p): p is string => !!p);
      if (paths.length > 0) {
        await supabase.storage.from("cv-library").remove(paths);
      }

      const { error, count } = await supabase
        .from("cv_library_candidates")
        .delete({ count: "exact" })
        .in("id", candidateIds);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, deleted: count ?? candidateIds.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SYNC-CLASSIFICATION: zero-AI-call backfill. Many candidates carry an accurate
    // ai_analysis (the analyzer reads the PDF directly) while their classification
    // columns hold placeholder junk from a classify pass that ran on empty extracted
    // text. Derive the classification from each STORED analysis and update the
    // columns — the same derivation cv-library-analyze now applies on every new
    // analysis. Respects manual_overrides.name; never touches manual_* columns;
    // writes nothing for rows whose analysis has nothing usable.
    if (action === "sync-classification") {
      let updated = 0, skipped = 0;

      // Paginate explicitly — PostgREST silently caps unpaged selects at 1000 rows,
      // which would make a large library sync report success while missing rows.
      const PAGE = 500;
      for (let from = 0; ; from += PAGE) {
        const { data: rows, error } = await supabase
          .from("cv_library_candidates")
          .select("id, name, email, phone, nationality, country, location, years_experience, manual_department, manual_job_title, manual_overrides, ai_analysis")
          .is("deleted_at", null)
          .not("ai_analysis", "is", null)
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);

        if (error) throw error;
        if (!rows || rows.length === 0) break;

        for (const row of rows) {
          const cls = deriveClassificationFromAnalysis(row.ai_analysis as Record<string, any>);
          if (!cls) { skipped++; continue; }
          const payload: Record<string, unknown> = { ...cls };

          // DATA REPAIR 1: junk stored names ("Unknown", "Not provided", "null"…)
          // block every automated backfill (they're non-null). Null them out so the
          // name backfill below — and future parses — can restore the real name.
          if (typeof row.name === "string" && row.name && !sanitizeCandidateName(row.name)) {
            payload.name = null;
          }

          // DATA REPAIR 2: clear override flags that lock EMPTY values. A past Edit-
          // dialog bug marked every submitted field as HR-overridden — including
          // fields saved as null — freezing candidates as "Unnamed"/contactless
          // forever. An override flag only makes sense when it protects a real value.
          const overrides = { ...(row.manual_overrides || {}) } as Record<string, boolean>;
          let overridesChanged = false;
          for (const f of ["name", "email", "phone", "nationality", "country", "location", "years_experience"] as const) {
            const val = f === "name" ? (payload.name ?? row.name) : (row as Record<string, unknown>)[f];
            if (overrides[f] && (val === null || val === undefined || val === "")) {
              delete overrides[f];
              overridesChanged = true;
            }
          }
          if (overrides.department && !row.manual_department) { delete overrides.department; overridesChanged = true; }
          if (overrides.job_title && !row.manual_job_title) { delete overrides.job_title; overridesChanged = true; }
          if (overridesChanged) payload.manual_overrides = overrides;

          const { error: e } = await supabase
            .from("cv_library_candidates")
            .update(payload)
            .eq("id", row.id);
          if (e) { console.error("sync-classification update error:", row.id, e); skipped++; continue; }
          updated++;

          // Name backfill: junk-guarded and race-safe — `.is("name", null)` fills
          // only a still-empty slot, never overwriting an HR edit made meanwhile.
          const aiName = sanitizeCandidateName((row.ai_analysis as any)?.candidateName);
          if (aiName) {
            await supabase
              .from("cv_library_candidates")
              .update({ name: aiName })
              .eq("id", row.id)
              .is("name", null);
          }
        }

        if (rows.length < PAGE) break;
      }

      return new Response(JSON.stringify({ success: true, updated, skipped }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET signed URL. `download: true` serves it as an attachment (Download);
    // otherwise the browser renders it in-tab (View).
    if (action === "download") {
      const { candidateId, download } = body;
      const { data: candidate } = await supabase
        .from("cv_library_candidates")
        .select("resume_file_path, resume_file_name")
        .eq("id", candidateId)
        .single();

      if (!candidate) {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: urlData, error: urlError } = await supabase.storage
        .from("cv-library")
        .createSignedUrl(candidate.resume_file_path, 300, download ? { download: candidate.resume_file_name || true } : undefined);

      if (urlError) throw urlError;
      return new Response(JSON.stringify({ url: urlData.signedUrl, fileName: candidate.resume_file_name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    // ERROR HYGIENE (fix #9): log detail, return a generic message.
    console.error("cv-library-manage error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
