import { supabase } from "@/integrations/supabase/client";
import { toTitleCase } from "@/lib/utils";

/** The library-candidate fields needed to promote someone into a pipeline. */
export interface LibraryCandidateForAdd {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  location: string | null;
  resume_file_name: string;
  resume_file_path: string;
  resume_file_type: string | null;
  resume_file_size: number | null;
}

export interface JobForAdd {
  id: string;
  title: string;
}

/** Gemini can't read Word files — callers skip AI analysis for these. */
export const isWordCv = (path: string | null | undefined) => /\.docx?$/i.test(path || "");

// Module-level in-flight guard so a bulk run can NEVER overlap another, even
// across React remounts (switching CV-Library sub-tabs, opening a candidate
// profile, or leaving and returning to the CV Library tab all unmount the
// dialog while its async loop keeps running). Two overlapping runs would create
// duplicate applicant rows AND fire concurrent Gemini calls — which this
// project's key cannot take (sustained overload 5xx).
let _bulkRunActive = false;
export const isBulkRunActive = () => _bulkRunActive;
export const setBulkRunActive = (v: boolean) => { _bulkRunActive = v; };

/**
 * Promote a CV-library candidate into a job's pipeline: creates the applicant
 * (status "new", CV file reused via cv_storage_path) and marks the LIBRARY row
 * Shortlisted (direct cv-library-manage call, NOT the edit-dialog path, so the
 * automated change doesn't set manual_overrides; non-fatal if it fails).
 *
 * Deliberately does NOT trigger AI analysis — the single-add flow fires it
 * in the background, while bulk adds run analyses strictly one at a time
 * afterwards (concurrent Gemini calls overload this project's key).
 *
 * Returns the created applicantId. Throws if the create itself fails.
 */
export async function addLibraryCandidateToJob(
  candidate: LibraryCandidateForAdd,
  job: JobForAdd,
  sessionToken: string,
): Promise<string> {
  const applicantId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { data, error } = await supabase.functions.invoke("update-applicant", {
    body: {
      sessionToken,
      action: "create",
      applicant: {
        id: applicantId,
        job_id: job.id,
        job_title: job.title,
        // Persist ONLY a name that was genuinely read from the document. Never a
        // placeholder ("Unknown") and never a filename GUESS: a guess is
        // indistinguishable from a real name once stored, so it would survive
        // forever and block the AI backfill (which refuses to overwrite a
        // non-junk name). The filename fallback stays a DISPLAY-only affordance —
        // an empty string satisfies the NOT NULL column while staying falsy, so
        // auto-analyze-applicant can fill in the real name from the CV itself.
        full_name: toTitleCase(candidate.name),
        email: candidate.email || null,
        phone: candidate.phone || "",
        location: candidate.location || "",
        nationality: candidate.nationality,
        cv_file_name: candidate.resume_file_name,
        cv_storage_path: candidate.resume_file_path,
        cv_file_type: candidate.resume_file_type,
        cv_file_size: candidate.resume_file_size,
        status: "new",
        applied_date: now.split("T")[0],
        screening_answers: {},
        notes: [`Added from CV Library on ${new Date().toLocaleDateString()}`],
      },
    },
  });
  if (error) throw error;

  await supabase.functions.invoke("cv-library-manage", {
    body: { action: "update", sessionToken, candidateId: candidate.id, updates: { status: "shortlisted" } },
  }).catch(() => { /* non-fatal — the applicant was already created */ });

  return (data?.applicantId as string) || applicantId;
}

/** Trigger the job-fit AI analysis for a newly created applicant. */
export function analyzeApplicant(applicantId: string, sessionToken: string) {
  return supabase.functions.invoke("auto-analyze-applicant", {
    body: { applicantId, sessionToken },
  });
}
