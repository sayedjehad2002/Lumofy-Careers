import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";

// Storage keys produced by upload-cv are always `<jobId>/<applicantId>.<ext>`,
// i.e. two UUIDs and an allowed extension. This regex pins backward-compat
// `storagePath` callers to exactly that shape so an attacker cannot smuggle an
// arbitrary path (e.g. another applicant's file, a traversal, or a leading "/").
const STORAGE_PATH_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|doc|docx)$/i;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Rate limit: 30 requests per minute per IP
    const ip = getClientIp(req);
    const rl = isRateLimited(`get-cv-url:${ip}`, { maxRequests: 30, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const { applicantId, storagePath, sessionToken } = await req.json();

    // Require a valid admin session for any CV download.
    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;

    // Resolve the storage path SERVER-SIDE.
    //
    // SECURITY (IDOR fix): previously this function signed whatever `storagePath`
    // the client supplied with the service-role key, so any valid session could
    // download ANY applicant's CV by guessing/altering the path. We now prefer an
    // `applicantId` and look up that applicant's own `cv_storage_path` from the DB
    // (same pattern as get-jd-url / cv-library-manage). For backward-compat we
    // still accept a `storagePath`, but only after strictly validating its shape.
    let resolvedPath: string | null = null;
    let downloadName: string | undefined;

    if (applicantId) {
      if (typeof applicantId !== "string") {
        return new Response(JSON.stringify({ error: "applicantId must be a string" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: applicant, error: appError } = await auth.supabase
        .from("applicants")
        .select("cv_storage_path, cv_file_name")
        .eq("id", applicantId)
        .single();

      if (appError || !applicant?.cv_storage_path) {
        return new Response(JSON.stringify({ error: "CV file not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      resolvedPath = applicant.cv_storage_path;
      downloadName = applicant.cv_file_name || undefined;
    } else if (storagePath) {
      // Backward-compat path: strictly validate. Reject traversal / leading slash
      // / anything that is not the exact `<uuid>/<uuid>.<ext>` shape.
      if (
        typeof storagePath !== "string" ||
        storagePath.includes("..") ||
        storagePath.startsWith("/") ||
        !STORAGE_PATH_RE.test(storagePath)
      ) {
        return new Response(JSON.stringify({ error: "Invalid storagePath" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      resolvedPath = storagePath;
    } else {
      return new Response(JSON.stringify({ error: "applicantId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Applicants promoted from the CV Library keep their `library/<id>.<ext>` path,
    // which lives in the cv-library bucket — everything else is in cvs.
    const bucket = resolvedPath.startsWith("library/") ? "cv-library" : "cvs";

    // Short-lived signed URL (5 minutes)
    const { data, error } = await auth.supabase.storage
      .from(bucket)
      .createSignedUrl(resolvedPath, 300, downloadName ? { download: downloadName } : undefined);

    if (error) {
      console.error("Signed URL error:", error);
      return new Response(JSON.stringify({ error: "CV file not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: data.signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-cv-url error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
