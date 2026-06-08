import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";

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

    // GET download URL
    if (action === "download") {
      const { candidateId } = body;
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
        .createSignedUrl(candidate.resume_file_path, 300);

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
