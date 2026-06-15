import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminQuery } from "@/lib/adminQuery";
import { toTitleCase } from "@/lib/utils";
import type { Job, Applicant, ApplicantStatus, AIAnalysis, ScreeningQuestion, CandidateRating, AIScoringWeights, DEFAULT_AI_WEIGHTS } from "@/types/careers";

interface CareersContextType {
  jobs: Job[];
  applicants: Applicant[];
  loading: boolean;
  sessionToken: string | null;
  setSessionToken: (token: string | null) => void;
  authReady: boolean;
  isHrUser: boolean;
  hrRole: string | null;
  hrChecked: boolean;
  addJob: (job: Job) => Promise<void>;
  updateJob: (job: Job) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  archiveJob: (jobId: string) => Promise<void>;
  restoreJob: (jobId: string) => Promise<void>;
  addApplicant: (applicant: Applicant) => Promise<string>;
  deleteApplicant: (applicantId: string) => Promise<void>;
  updateApplicantStatus: (applicantId: string, status: ApplicantStatus) => Promise<void>;
  addApplicantNote: (applicantId: string, note: string) => Promise<void>;
  updateApplicantAI: (applicantId: string, analysis: AIAnalysis) => Promise<void>;
  /** Inline-edit a candidate's identity/contact fields (HR "edit like a Notion page"). */
  updateApplicantFields: (
    applicantId: string,
    fields: Partial<Pick<Applicant, "fullName" | "email" | "phone" | "location" | "nationality" | "linkedin" | "portfolio">>,
  ) => Promise<void>;
  getJobById: (id: string) => Job | undefined;
  refreshData: () => Promise<void>;
  /** Refetch in the background WITHOUT toggling the full-page loading state (no flicker). */
  silentRefresh: () => Promise<void>;
  /** Epoch ms of the last successful data load (for "updated Xs ago"). Null until first load. */
  lastUpdated: number | null;
  /** True while a silent background refetch is in flight. */
  refreshing: boolean;
}

const CareersContext = createContext<CareersContextType | null>(null);

// --- DB row <-> App type converters ---

function dbRowToJob(row: any): Job {
  return {
    id: row.id,
    title: row.title,
    department: row.department,
    location: row.location,
    type: row.type,
    status: row.status as "open" | "closed",
    summary: row.summary,
    description: row.description,
    responsibilities: (row.responsibilities ?? []) as string[],
    requirements: (row.requirements ?? []) as string[],
    benefits: (row.benefits ?? []) as string[],
    salaryRange: row.salary_range || undefined,
    salaryCurrency: row.salary_currency || undefined,
    postedDate: row.posted_date,
    deadline: row.deadline || undefined,
    screeningQuestions: (row.screening_questions ?? []) as ScreeningQuestion[],
    jdFileName: row.jd_file_name || undefined,
    jdFilePath: row.jd_file_path || undefined,
    jdFileSize: row.jd_file_size || undefined,
    jdFileUploadedAt: row.jd_file_uploaded_at || undefined,
    aiScoringWeights: row.ai_scoring_weights || undefined,
    archivedAt: row.archived_at || undefined,
  };
}

function jobToDbRow(job: Job) {
  return {
    id: job.id,
    title: job.title,
    department: job.department,
    location: job.location,
    type: job.type,
    status: job.status,
    summary: job.summary,
    description: job.description,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    benefits: job.benefits,
    salary_range: job.salaryRange || null,
    salary_currency: job.salaryCurrency || null,
    posted_date: job.postedDate,
    deadline: job.deadline || null,
    screening_questions: job.screeningQuestions,
    jd_file_name: job.jdFileName || null,
    jd_file_path: job.jdFilePath || null,
    jd_file_size: job.jdFileSize || null,
    jd_file_uploaded_at: job.jdFileUploadedAt || null,
    ai_scoring_weights: job.aiScoringWeights || null,
    archived_at: job.archivedAt || null,
  };
}

export function dbRowToApplicant(row: any): Applicant {
  return {
    id: row.id,
    jobId: row.job_id,
    jobTitle: row.job_title || undefined,
    fullName: toTitleCase(row.full_name),
    email: row.email,
    phone: row.phone,
    location: row.location,
    nationality: row.nationality || undefined,
    linkedin: row.linkedin || undefined,
    portfolio: row.portfolio || undefined,
    coverLetter: row.cover_letter || undefined,
    cvFileName: row.cv_file_name,
    cvStoragePath: row.cv_storage_path || undefined,
    cvFileType: row.cv_file_type || undefined,
    cvFileSize: row.cv_file_size || undefined,
    screeningAnswers: row.screening_answers as Record<string, string>,
    status: row.status as ApplicantStatus,
    appliedDate: row.applied_date,
    notes: row.notes as string[],
    rating: row.rating as CandidateRating | undefined,
    aiAnalysis: row.ai_analysis as AIAnalysis | undefined,
    stageEnteredAt: row.stage_entered_at || undefined,
  };
}

function applicantToDbRow(a: Applicant) {
  return {
    id: a.id,
    job_id: a.jobId,
    job_title: a.jobTitle || null,
    full_name: a.fullName,
    email: a.email,
    phone: a.phone,
    location: a.location,
    nationality: a.nationality || null,
    linkedin: a.linkedin || null,
    portfolio: a.portfolio || null,
    cover_letter: a.coverLetter || null,
    cv_file_name: a.cvFileName,
    cv_storage_path: a.cvStoragePath || null,
    cv_file_type: a.cvFileType || null,
    cv_file_size: a.cvFileSize || null,
    screening_answers: a.screeningAnswers,
    status: a.status,
    applied_date: a.appliedDate,
    notes: a.notes,
    rating: a.rating || null,
    ai_analysis: a.aiAnalysis || null,
    stage_entered_at: a.stageEnteredAt || new Date().toISOString(),
  };
}

export function CareersProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isHrUser, setIsHrUser] = useState(false);
  const [hrRole, setHrRole] = useState<string | null>(null);
  const [hrChecked, setHrChecked] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // `silent` refetches in the background: it updates the data but never toggles the
  // full-page `loading` state, so the live dashboard re-renders without flicker.
  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (silent) setRefreshing(true);
    try {
      if (sessionToken) {
        // Admin: load ALL jobs (incl. closed/draft) with full columns so the
        // dashboard can manage them and AI scoring weights are available for
        // manual analysis (the public RPC intentionally omits both).
        // Jobs + applicants are independent, so fetch them concurrently: the
        // data critical path becomes max(jobs, applicants) instead of the sum.
        const [jobsRes, applicantsRes] = await Promise.all([
          adminQuery<any[]>(sessionToken, "select", "jobs", {
            order: { column: "created_at", ascending: false },
          }),
          supabase.functions.invoke("get-applicants", { body: { sessionToken } }),
        ]);
        if (jobsRes.data) setJobs(jobsRes.data.map(dbRowToJob));
        if (!applicantsRes.error && applicantsRes.data?.applicants) {
          setApplicants(applicantsRes.data.applicants.map(dbRowToApplicant));
        }
      } else {
        // Public: only open jobs, candidate-safe fields, via the secure RPC.
        const jobsRes = await supabase.rpc("get_public_jobs");
        if (jobsRes.data) setJobs((jobsRes.data as any[]).map(dbRowToJob));
      }
      setLastUpdated(Date.now());
    } catch (e) {
      import.meta.env.DEV && console.error("Failed to fetch data:", e);
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, [sessionToken]);

  const silentRefresh = useCallback(() => fetchData({ silent: true }), [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Auth: drive sessionToken from the Supabase Auth session ---
  // Login is supabase.auth.signInWithPassword (see DashboardAuth). supabase-js
  // persists + auto-refreshes the session in localStorage, so we restore it on
  // load and keep `sessionToken` pointed at the CURRENT access token — which is
  // what every admin edge function validates (see _shared/validate-session).
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSessionToken(data.session?.access_token ?? null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionToken(session?.access_token ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // Authorization: is the signed-in user on the HR allowlist? Drives whether the
  // HR Dashboard button + route are shown. (The server enforces this regardless;
  // this is just the UI's view so we don't show a door that won't open.)
  useEffect(() => {
    if (!authReady) return;
    let active = true;
    if (!sessionToken) { setIsHrUser(false); setHrRole(null); setHrChecked(true); return; }
    setHrChecked(false);
    supabase.functions
      .invoke("hr-me", { body: { sessionToken } })
      .then(({ data }) => {
        if (!active) return;
        setIsHrUser(!!data?.authorized);
        setHrRole((data?.role as string) ?? null);
        setHrChecked(true);
      })
      .catch(() => { if (active) { setIsHrUser(false); setHrRole(null); setHrChecked(true); } });
    return () => { active = false; };
  }, [sessionToken, authReady]);

  const addJob = useCallback(async (job: Job) => {
    if (!sessionToken) throw new Error("Not authenticated");
    setJobs(prev => [...prev, job]);
    const { error } = await adminQuery(sessionToken, "insert", "jobs", { data: jobToDbRow(job) });
    if (error) { import.meta.env.DEV && console.error("addJob error:", error); setJobs(prev => prev.filter(j => j.id !== job.id)); throw new Error(error); }
  }, [sessionToken]);

  const updateJob = useCallback(async (job: Job) => {
    if (!sessionToken) throw new Error("Not authenticated");
    let prevJob: Job | undefined;
    setJobs(prev => { prevJob = prev.find(j => j.id === job.id); return prev.map(j => j.id === job.id ? job : j); });
    const { error } = await adminQuery(sessionToken, "update", "jobs", { data: jobToDbRow(job), eq: { id: job.id } });
    if (error) {
      import.meta.env.DEV && console.error("updateJob error:", error);
      if (prevJob) setJobs(prev => prev.map(j => j.id === job.id ? prevJob! : j)); // rollback optimistic update
      throw new Error(error);
    }
  }, [sessionToken]);

  const deleteJob = useCallback(async (jobId: string) => {
    if (!sessionToken) throw new Error("Not authenticated");
    setJobs(prev => prev.filter(j => j.id !== jobId));
    const { error } = await adminQuery(sessionToken, "delete", "jobs", { eq: { id: jobId } });
    if (error) { import.meta.env.DEV && console.error("deleteJob error:", error); throw new Error(error); }
  }, [sessionToken]);

  // Soft-delete: archiving keeps the job + its applicants (hidden from the public
  // site, kept in the dashboard) instead of a hard delete that CASCADE-wipes applicants.
  const archiveJob = useCallback(async (jobId: string) => {
    if (!sessionToken) throw new Error("Not authenticated");
    const nowIso = new Date().toISOString();
    let prev: Job | undefined;
    setJobs(p => { prev = p.find(j => j.id === jobId); return p.map(j => j.id === jobId ? { ...j, archivedAt: nowIso } : j); });
    const { error } = await adminQuery(sessionToken, "update", "jobs", { data: { archived_at: nowIso }, eq: { id: jobId } });
    if (error) { if (prev) { const pj = prev; setJobs(p => p.map(j => j.id === jobId ? pj : j)); } import.meta.env.DEV && console.error("archiveJob error:", error); throw new Error(error); }
  }, [sessionToken]);

  const restoreJob = useCallback(async (jobId: string) => {
    if (!sessionToken) throw new Error("Not authenticated");
    let prev: Job | undefined;
    setJobs(p => { prev = p.find(j => j.id === jobId); return p.map(j => j.id === jobId ? { ...j, archivedAt: undefined } : j); });
    const { error } = await adminQuery(sessionToken, "update", "jobs", { data: { archived_at: null }, eq: { id: jobId } });
    if (error) { if (prev) { const pj = prev; setJobs(p => p.map(j => j.id === jobId ? pj : j)); } import.meta.env.DEV && console.error("restoreJob error:", error); throw new Error(error); }
  }, [sessionToken]);

  const addApplicant = useCallback(async (applicant: Applicant): Promise<string> => {
    // Public applications now go through the secure submit-application edge function:
    // it validates the job is open + not past deadline, server-sets status/AI/rating/
    // timestamps, dedups, and rate-limits — instead of a raw anon INSERT.
    const { data, error } = await supabase.functions.invoke("submit-application", {
      body: {
        jobId: applicant.jobId,
        full_name: applicant.fullName,
        email: applicant.email,
        phone: applicant.phone,
        location: applicant.location,
        nationality: applicant.nationality,
        linkedin: applicant.linkedin,
        portfolio: applicant.portfolio,
        cover_letter: applicant.coverLetter,
        cv_file_name: applicant.cvFileName,
        cv_storage_path: applicant.cvStoragePath,
        cv_file_type: applicant.cvFileType,
        cv_file_size: applicant.cvFileSize,
        screening_answers: applicant.screeningAnswers,
      },
    });
    if (error) {
      // supabase-js puts the JSON body of a non-2xx response on error.context.
      let serverError = "";
      try { serverError = ((await (error as any).context?.json?.()) || {}).error || ""; } catch { /* ignore */ }
      throw new Error(serverError || error.message || "submit_failed");
    }
    if (data?.error) throw new Error(data.error);
    return (data?.applicantId as string) ?? "";
  }, []);

  const deleteApplicant = useCallback(async (applicantId: string) => {
    if (!sessionToken) throw new Error("Not authenticated");
    const prev = applicants;
    setApplicants(p => p.filter(a => a.id !== applicantId));
    const { data, error } = await supabase.functions.invoke("delete-applicant", {
      body: { sessionToken, applicantId },
    });
    if (error || data?.error) {
      import.meta.env.DEV && console.error("deleteApplicant error:", error || data?.error);
      setApplicants(prev);
      throw new Error(error?.message || data?.error || "Delete failed");
    }
  }, [sessionToken, applicants]);

  const updateApplicantStatus = useCallback(async (applicantId: string, status: ApplicantStatus) => {
    if (!sessionToken) throw new Error("Not authenticated");
    let oldStatus: ApplicantStatus | null = null;
    let oldStageEnteredAt: string | undefined;
    const now = new Date().toISOString();
    setApplicants(prev => prev.map(a => {
      if (a.id === applicantId) { oldStatus = a.status; oldStageEnteredAt = a.stageEnteredAt; return { ...a, status, stageEnteredAt: now }; }
      return a;
    }));
    const { data, error } = await supabase.functions.invoke("update-applicant", {
      body: { sessionToken, applicantId, updates: { status, stage_entered_at: now } },
    });
    if (error || data?.error) {
      import.meta.env.DEV && console.error("updateApplicantStatus error:", error || data?.error);
      if (oldStatus) setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, status: oldStatus!, stageEnteredAt: oldStageEnteredAt } : a));
      throw new Error(error?.message || data?.error || "Update failed");
    }
  }, [sessionToken]);

  const addApplicantNote = useCallback(async (applicantId: string, note: string) => {
    if (!sessionToken) throw new Error("Not authenticated");
    // Server-side atomic append: sending the whole notes array from client state
    // duplicated notes (re-entrant updates) and let stale tabs erase other users'
    // notes (last-writer-wins). The server appends ONE note and returns the truth.
    let prevNotes: string[] | null = null;
    setApplicants(prev => prev.map(a => {
      if (a.id === applicantId) {
        prevNotes = a.notes;
        return { ...a, notes: [...a.notes, note] };
      }
      return a;
    }));
    const { data, error } = await supabase.functions.invoke("update-applicant", {
      body: { sessionToken, applicantId, updates: { appendNote: note } },
    });
    if (error || data?.error) {
      import.meta.env.DEV && console.error("addApplicantNote error:", error || data?.error);
      if (prevNotes) setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, notes: prevNotes! } : a));
      throw new Error(error?.message || data?.error || "Failed to save note");
    }
    // Reconcile with the server's authoritative array (includes notes added elsewhere).
    if (Array.isArray(data?.notes)) {
      setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, notes: data.notes } : a));
    }
  }, [sessionToken]);

  const updateApplicantAI = useCallback(async (applicantId: string, analysis: AIAnalysis) => {
    if (!sessionToken) throw new Error("Not authenticated");
    let prevAnalysis: AIAnalysis | undefined;
    let found = false;
    setApplicants(prev => prev.map(a => {
      if (a.id === applicantId) { prevAnalysis = a.aiAnalysis; found = true; return { ...a, aiAnalysis: analysis }; }
      return a;
    }));
    const { data, error } = await supabase.functions.invoke("update-applicant", {
      body: { sessionToken, applicantId, updates: { ai_analysis: analysis } },
    });
    if (error || data?.error) {
      import.meta.env.DEV && console.error("updateApplicantAI error:", error || data?.error);
      if (found) setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, aiAnalysis: prevAnalysis } : a));
      throw new Error(error?.message || data?.error || "Failed to save analysis");
    }
  }, [sessionToken]);

  const updateApplicantFields = useCallback(async (
    applicantId: string,
    fields: Partial<Pick<Applicant, "fullName" | "email" | "phone" | "location" | "nationality" | "linkedin" | "portfolio">>,
  ) => {
    if (!sessionToken) throw new Error("Not authenticated");
    const COLS: Record<string, string> = {
      fullName: "full_name", email: "email", phone: "phone",
      location: "location", nationality: "nationality", linkedin: "linkedin", portfolio: "portfolio",
    };
    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      const col = COLS[k];
      if (col) updates[col] = typeof v === "string" ? v.trim() : v;
    }
    if (Object.keys(updates).length === 0) return;

    const { data, error } = await supabase.functions.invoke("update-applicant", {
      body: { sessionToken, applicantId, updates },
    });
    if (error || data?.error) {
      throw new Error(error?.message || data?.error || "Failed to save changes");
    }
    // Mirror the server write locally (names display Title Case, same as on fetch).
    setApplicants(prev => prev.map(a => a.id === applicantId
      ? { ...a, ...fields, ...(fields.fullName != null ? { fullName: toTitleCase(fields.fullName) } : {}) }
      : a));
  }, [sessionToken]);

  const getJobById = useCallback((id: string) => jobs.find(j => j.id === id), [jobs]);

  return (
    <CareersContext.Provider value={{ jobs, applicants, loading, sessionToken, setSessionToken, authReady, isHrUser, hrRole, hrChecked, addJob, updateJob, deleteJob, archiveJob, restoreJob, addApplicant, deleteApplicant, updateApplicantStatus, addApplicantNote, updateApplicantAI, updateApplicantFields, getJobById, refreshData: fetchData, silentRefresh, lastUpdated, refreshing }}>
      {children}
    </CareersContext.Provider>
  );
}

export function useCareers() {
  const ctx = useContext(CareersContext);
  if (!ctx) throw new Error("useCareers must be used within CareersProvider");
  return ctx;
}
