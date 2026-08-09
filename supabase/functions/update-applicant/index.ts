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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Rate limit: 60 requests per minute per IP
    const ip = getClientIp(req);
    const rl = isRateLimited(`update-applicant:${ip}`, { maxRequests: 60, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const { sessionToken, applicantId, updates, action, applicant } = await req.json();

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
