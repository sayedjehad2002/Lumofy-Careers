import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { createServiceClient } from "../_shared/validate-session.ts";

// ---------------------------------------------------------------------------
// PUBLIC applicant creation (fix #2). verify_jwt=false — the careers site posts
// here anonymously. Because there is no auth, every trust decision is made
// server-side with the service role:
//   - jobId charset is validated, then the job is looked up; we reject if it is
//     missing (404), not open (410), or past its deadline (410);
//   - all identity/result columns (id, status, ai_analysis, rating, notes,
//     timestamps) are SERVER-set — the client cannot influence them;
//   - duplicate applications (same job + same email, case-insensitive) get 409;
//   - the endpoint is IP rate-limited to blunt spam/abuse.
//
// RLS still allows anonymous INSERT on applicants today; the lead will tighten
// that to service-role-only once the frontend is wired to call this function.
// ---------------------------------------------------------------------------

// jobId is a foreign key into jobs.id (app uses `job_<ts>`; legacy rows are
// UUID-shaped). Restrict to a safe charset before it touches any query.
const SAFE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

// Loose but real email check. We also length-cap to avoid abuse.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Field length caps (defense against oversized payloads landing in the DB).
const MAX = {
  name: 200,
  email: 320,
  phone: 50,
  location: 200,
  nationality: 100,
  url: 2048,
  coverLetter: 20_000,
  fileName: 300,
  storagePath: 400,
  fileType: 200,
};

function str(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // IP rate limit: 10 submissions / 10 min / IP. Generous for a human applying
    // to a few roles, tight enough to deter scripted spam.
    const ip = getClientIp(req);
    const rl = isRateLimited(`submit-application:${ip}`, { maxRequests: 10, windowMs: 10 * 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      jobId,
      full_name, email, phone, location, nationality,
      linkedin, portfolio, cover_letter,
      cv_file_name, cv_storage_path, cv_file_type, cv_file_size,
      screening_answers,
    } = body as Record<string, unknown>;

    // --- jobId ---
    if (typeof jobId !== "string" || !SAFE_ID_RE.test(jobId)) {
      return new Response(JSON.stringify({ error: "Invalid jobId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- required scalar fields ---
    const fullName = str(full_name);
    const emailVal = str(email);
    const phoneVal = str(phone);
    const locationVal = str(location);
    const cvFileName = str(cv_file_name);

    if (!fullName || fullName.length > MAX.name) {
      return new Response(JSON.stringify({ error: "full_name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!emailVal || emailVal.length > MAX.email || !EMAIL_RE.test(emailVal)) {
      return new Response(JSON.stringify({ error: "A valid email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!phoneVal || phoneVal.length > MAX.phone) {
      return new Response(JSON.stringify({ error: "phone is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!locationVal || locationVal.length > MAX.location) {
      return new Response(JSON.stringify({ error: "location is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!cvFileName || cvFileName.length > MAX.fileName) {
      return new Response(JSON.stringify({ error: "cv_file_name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- optional scalar fields (validate shape/length when present) ---
    const nationalityVal = str(nationality);
    const linkedinVal = str(linkedin);
    const portfolioVal = str(portfolio);
    const coverLetterVal = str(cover_letter);
    const cvStoragePath = str(cv_storage_path);
    const cvFileType = str(cv_file_type);

    if (nationalityVal && nationalityVal.length > MAX.nationality) {
      return new Response(JSON.stringify({ error: "nationality too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (linkedinVal && linkedinVal.length > MAX.url) {
      return new Response(JSON.stringify({ error: "linkedin too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (portfolioVal && portfolioVal.length > MAX.url) {
      return new Response(JSON.stringify({ error: "portfolio too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (coverLetterVal && coverLetterVal.length > MAX.coverLetter) {
      return new Response(JSON.stringify({ error: "cover_letter too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (cvStoragePath && cvStoragePath.length > MAX.storagePath) {
      return new Response(JSON.stringify({ error: "cv_storage_path too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (cvFileType && cvFileType.length > MAX.fileType) {
      return new Response(JSON.stringify({ error: "cv_file_type too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // cv_file_size: optional non-negative integer.
    let cvFileSize: number | null = null;
    if (cv_file_size != null) {
      if (typeof cv_file_size !== "number" || !Number.isFinite(cv_file_size) || cv_file_size < 0) {
        return new Response(JSON.stringify({ error: "cv_file_size must be a non-negative number" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      cvFileSize = Math.floor(cv_file_size);
    }

    // screening_answers: optional plain object (stored as jsonb).
    let screeningAnswers: Record<string, unknown> = {};
    if (screening_answers != null) {
      if (typeof screening_answers !== "object" || Array.isArray(screening_answers)) {
        return new Response(JSON.stringify({ error: "screening_answers must be an object" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      screeningAnswers = screening_answers as Record<string, unknown>;
    }

    const supabase = createServiceClient();

    // --- look up the job with the service role and gate on its state ---
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id, status, deadline")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (job.status !== "open") {
      return new Response(JSON.stringify({ error: "This job is no longer accepting applications" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // deadline is a text date (e.g. "2026-07-01"). Reject if it has passed.
    if (job.deadline) {
      const deadlineMs = Date.parse(job.deadline);
      if (!Number.isNaN(deadlineMs)) {
        // Treat the deadline as inclusive through end of that calendar day.
        const endOfDeadline = deadlineMs + 24 * 60 * 60 * 1000 - 1;
        if (Date.now() > endOfDeadline) {
          return new Response(JSON.stringify({ error: "The application deadline has passed" }), {
            status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // --- dedup: same job + same email (case-insensitive) ---
    // Escape LIKE metacharacters (%, _, \) so an email like "a%@x.com" is matched
    // literally rather than as a wildcard pattern.
    const emailLower = emailVal.toLowerCase();
    const emailPattern = emailLower.replace(/([\\%_])/g, "\\$1");
    const { data: existing, error: dupErr } = await supabase
      .from("applicants")
      .select("id")
      .eq("job_id", jobId)
      .ilike("email", emailPattern)
      .limit(1);

    if (dupErr) {
      console.error("submit-application dedup query error:", dupErr);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "already_applied" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- build the row: client supplies profile data; the server owns identity,
    // status, AI fields, and timestamps. ---
    const nowIso = new Date().toISOString();
    const applicantId = crypto.randomUUID();

    const row = {
      // SERVER-set
      id: applicantId,
      status: "new",
      ai_analysis: null,
      rating: null,
      notes: [],
      stage_entered_at: nowIso,
      applied_date: nowIso,
      created_at: nowIso,
      // client-supplied (validated)
      job_id: jobId,
      full_name: fullName,
      email: emailVal,
      phone: phoneVal,
      location: locationVal,
      nationality: nationalityVal,
      linkedin: linkedinVal,
      portfolio: portfolioVal,
      cover_letter: coverLetterVal,
      cv_file_name: cvFileName,
      cv_storage_path: cvStoragePath,
      cv_file_type: cvFileType,
      cv_file_size: cvFileSize,
      screening_answers: screeningAnswers,
    };

    const { error: insertErr } = await supabase.from("applicants").insert(row as any);

    if (insertErr) {
      // A race on the unique (job_id, email) pair can surface as a constraint
      // violation — treat it as a duplicate rather than a generic 500.
      const code = (insertErr as { code?: string }).code;
      if (code === "23505") {
        return new Response(JSON.stringify({ error: "already_applied" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("submit-application insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ applicantId }), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("submit-application error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
