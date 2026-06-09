import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";

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

    // CREATE: add an applicant row (used by the CV Library "Add to job" flow).
    if (action === "create") {
      if (!applicant?.job_id || !applicant?.email) {
        return new Response(JSON.stringify({ error: "applicant with job_id and email is required" }), {
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

    const allowedFields = ["status", "notes", "rating", "ai_analysis", "stage_entered_at"];
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
