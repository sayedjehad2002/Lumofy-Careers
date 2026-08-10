import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession, writeDenied } from "../_shared/validate-session.ts";

// Viewers are read-only with three deliberate exceptions, so a reviewing hiring
// manager can do their actual job:
//   appendNote   leave an internal note
//   rating       score the candidate
//   ai_analysis  persist an analysis they were already allowed to run (the
//                manual "Analyze CV" flow computes server-side then saves here;
//                without this the run would cost credits and store nothing)
//
// `appendNote` is allowed but the raw `notes` array deliberately is NOT: appending
// happens server-side and is additive, so a viewer can add to the record but can
// never edit or erase what a colleague wrote.
const VIEWER_UPDATE_FIELDS = new Set(["appendNote", "rating", "ai_analysis"]);

/**
 * Append to the candidate's history.
 *
 * The actor is taken from the validated session, never from the request body —
 * a client that could name its own author would make the trail worthless.
 *
 * Deliberately fire-and-forget: a candidate's stage change has already been
 * written and acknowledged by the time this runs, so a logging failure must not
 * fail the operation the user actually asked for. It is logged server-side
 * instead, which is the right trade for an audit trail that is a record of
 * business actions rather than a compliance control.
 */
async function recordEvents(
  supabase: { from: (t: string) => { insert: (rows: unknown[]) => Promise<{ error: unknown }> } },
  rows: Record<string, unknown>[],
) {
  if (rows.length === 0) return;
  const { error } = await supabase.from("applicant_events").insert(rows);
  if (error) console.error("applicant_events insert failed:", error);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Rate limit: 60 requests per minute per IP
    const ip = getClientIp(req);
    const rl = isRateLimited(`update-applicant:${ip}`, { maxRequests: 60, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const { sessionToken, applicantId, applicantIds, updates, action, applicant } = await req.json();

    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;

    // Role gate is per-field rather than per-request: a viewer may comment and
    // score, but must not move a candidate through the pipeline, edit their
    // details, reassign their job, or create applicants.
    if (auth.role === "viewer") {
      const keys = updates && typeof updates === "object" ? Object.keys(updates) : [];
      const permitted =
        action !== "create" && keys.length > 0 && keys.every((k) => VIEWER_UPDATE_FIELDS.has(k));
      if (!permitted) return writeDenied(corsHeaders);
    }

    // CREATE: add an applicant row (used by the CV Library "Add to job" flow).
    if (action === "create") {
      // Email is OPTIONAL on this admin path (HR can add a CV-library candidate to a
      // pipeline even when the CV had no email). The public apply form still requires
      // email via submit-application. Only job_id is mandatory here.
      if (!applicant?.job_id) {
        return new Response(JSON.stringify({ error: "applicant with job_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const createFields = [
        "id", "job_id", "full_name", "email", "phone", "location", "nationality",
        "linkedin", "portfolio", "cover_letter", "cv_file_name", "cv_storage_path",
        "cv_file_type", "cv_file_size", "status", "applied_date", "screening_answers",
        "notes", "stage_entered_at",
      ];
      const row: Record<string, unknown> = {};
      for (const key of createFields) if (key in applicant) row[key] = applicant[key];
      if (!row.status) row.status = "new";
      const nowIso = new Date().toISOString();
      if (!row.applied_date) row.applied_date = nowIso.split("T")[0];
      if (!row.stage_entered_at) row.stage_entered_at = nowIso;

      const { data: created, error: createErr } = await auth.supabase
        .from("applicants").insert(row).select("id").single();
      if (createErr) {
        console.error("Create applicant error:", createErr);
        return new Response(JSON.stringify({ error: "Failed to add applicant" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, applicantId: created?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // BULK STAGE MOVE: one statement for a whole selection.
    //
    // The Pipeline board lets HR select many candidates and move them together —
    // with 300+ sitting in New that is the only way triage is finishable. Doing it
    // client-side would mean one request (and one optimistic re-render of every
    // context consumer) per candidate, plus a partial-failure state to reconcile.
    // A single `.in()` update is one round trip and one failure mode.
    //
    // Deliberately narrower than the single-applicant path: status only. Bulk-editing
    // names or emails is not a thing anyone should be able to do by accident.
    if (Array.isArray(applicantIds)) {
      const ids = applicantIds.filter((v: unknown): v is string => typeof v === "string" && v.length > 0);
      // Bounded so a malformed client cannot rewrite the whole table in one call.
      if (ids.length === 0 || ids.length > 500) {
        return new Response(JSON.stringify({ error: "applicantIds must hold between 1 and 500 ids" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const status = updates?.status;
      if (typeof status !== "string" || !status) {
        return new Response(JSON.stringify({ error: "Bulk updates support status only" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Read the stages we are moving people OUT of, so the history records a
      // real transition ("Reviewing -> Hired") rather than just a destination.
      const { data: before } = await auth.supabase
        .from("applicants").select("id, status").in("id", ids);
      const previous = new Map<string, string>((before ?? []).map((r) => [r.id as string, r.status as string]));

      const { data: moved, error: bulkErr } = await auth.supabase
        .from("applicants")
        .update({ status, stage_entered_at: new Date().toISOString() })
        .in("id", ids)
        .select("id");
      if (bulkErr) {
        console.error("Bulk update applicant error:", bulkErr);
        return new Response(JSON.stringify({ error: "Failed to move candidates" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // One history row per candidate that actually moved, so a bulk action is
      // as auditable as a single one.
      await recordEvents(auth.supabase, (moved ?? []).map((r) => ({
        applicant_id: r.id,
        kind: "stage_change",
        actor_email: auth.email,
        actor_user_id: auth.userId,
        from_status: previous.get(r.id as string) ?? null,
        to_status: status,
      })));

      // Return what actually changed, not what was asked for — the client trims
      // its optimistic update to match rather than assuming every id landed.
      return new Response(JSON.stringify({ success: true, updated: (moved ?? []).map((r) => r.id) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!applicantId || !updates) {
      return new Response(JSON.stringify({ error: "applicantId and updates are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // APPEND NOTE: atomic server-side append so the client never sends the whole
    // notes array (full-array writes caused duplicated notes and last-writer-wins
    // loss between concurrent HR sessions).
    if (typeof updates.appendNote === "string" && updates.appendNote.trim()) {
      const note = updates.appendNote.trim().slice(0, 2000);
      const { data: row, error: readErr } = await auth.supabase
        .from("applicants").select("notes").eq("id", applicantId).single();
      if (readErr || !row) {
        return new Response(JSON.stringify({ error: "Applicant not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const notes = Array.isArray(row.notes) ? [...row.notes, note] : [note];
      const { error: noteErr } = await auth.supabase
        .from("applicants").update({ notes }).eq("id", applicantId);
      if (noteErr) {
        console.error("Append note error:", noteErr);
        return new Response(JSON.stringify({ error: "Failed to save note" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // The note text still lands in applicants.notes (that array is what the
      // profile renders today), and the history row is what carries the author
      // and the time — neither of which the array can hold.
      await recordEvents(auth.supabase, [{
        applicant_id: applicantId,
        kind: "note",
        actor_email: auth.email,
        actor_user_id: auth.userId,
        note,
      }]);

      return new Response(JSON.stringify({ success: true, notes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedFields = [
      "status", "notes", "rating", "ai_analysis", "stage_entered_at",
      // Inline-editable candidate details (HR "edit like a Notion page").
      "full_name", "email", "phone", "location", "nationality", "linkedin", "portfolio",
      // Reassign an applicant to a DIFFERENT job's pipeline (job_title is the
      // denormalized snapshot shown across the dashboard).
      "job_id", "job_title",
    ];
    const sanitizedUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        sanitizedUpdates[key] = updates[key];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return new Response(JSON.stringify({ error: "No valid fields to update" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only when the stage is actually part of this write, and only to learn what
    // we are moving away from — an extra read on every field edit would be waste.
    let priorStatus: string | null = null;
    if (typeof sanitizedUpdates.status === "string") {
      const { data: prior } = await auth.supabase
        .from("applicants").select("status").eq("id", applicantId).single();
      priorStatus = (prior?.status as string) ?? null;
    }

    const { error } = await auth.supabase
      .from("applicants")
      .update(sanitizedUpdates)
      .eq("id", applicantId);

    if (error) {
      console.error("Update applicant error:", error);
      return new Response(JSON.stringify({ error: "Failed to update applicant" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // A no-op re-save of the same stage is not a move and does not belong in the
    // history — it would pad the trail with rows that record nothing happening.
    if (typeof sanitizedUpdates.status === "string" && sanitizedUpdates.status !== priorStatus) {
      await recordEvents(auth.supabase, [{
        applicant_id: applicantId,
        kind: "stage_change",
        actor_email: auth.email,
        actor_user_id: auth.userId,
        from_status: priorStatus,
        to_status: sanitizedUpdates.status,
      }]);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("update-applicant error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
