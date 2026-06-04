import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminQuery } from "@/lib/adminQuery";
import type { Job, Applicant, ApplicantStatus, AIAnalysis, ScreeningQuestion, CandidateRating, AIScoringWeights, DEFAULT_AI_WEIGHTS } from "@/types/careers";

interface CareersContextType {
  jobs: Job[];
  applicants: Applicant[];
  loading: boolean;
  sessionToken: string | null;
  setSessionToken: (token: string | null) => void;
  addJob: (job: Job) => Promise<void>;
  updateJob: (job: Job) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  addApplicant: (applicant: Applicant) => Promise<void>;
  deleteApplicant: (applicantId: string) => Promise<void>;
  updateApplicantStatus: (applicantId: string, status: ApplicantStatus) => Promise<void>;
  addApplicantNote: (applicantId: string, note: string) => Promise<void>;
  updateApplicantAI: (applicantId: string, analysis: AIAnalysis) => Promise<void>;
  getJobById: (id: string) => Job | undefined;
  refreshData: () => Promise<void>;
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
    responsibilities: row.responsibilities as string[],
    requirements: row.requirements as string[],
    benefits: row.benefits as string[],
    salaryRange: row.salary_range || undefined,
    salaryCurrency: row.salary_currency || undefined,
    postedDate: row.posted_date,
    deadline: row.deadline || undefined,
    screeningQuestions: row.screening_questions as ScreeningQuestion[],
    jdFileName: row.jd_file_name || undefined,
    jdFilePath: row.jd_file_path || undefined,
    jdFileSize: row.jd_file_size || undefined,
    jdFileUploadedAt: row.jd_file_uploaded_at || undefined,
    aiScoringWeights: row.ai_scoring_weights || undefined,
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
  };
}

export function dbRowToApplicant(row: any): Applicant {
  return {
    id: row.id,
    jobId: row.job_id,
    fullName: row.full_name,
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

  const fetchData = useCallback(async () => {
    try {
      // Jobs loaded via secure DB function (only public-safe fields)
      const jobsRes = await supabase.rpc("get_public_jobs");
      if (jobsRes.data) setJobs((jobsRes.data as any[]).map(dbRowToJob));

      // Applicants require session token (fetched via edge function)
      if (sessionToken) {
        const { data, error } = await supabase.functions.invoke("get-applicants", {
          body: { sessionToken },
        });
        if (!error && data?.applicants) {
          setApplicants(data.applicants.map(dbRowToApplicant));
        }
      }
    } catch (e) {
      import.meta.env.DEV && console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addJob = useCallback(async (job: Job) => {
    if (!sessionToken) throw new Error("Not authenticated");
    setJobs(prev => [...prev, job]);
    const { error } = await adminQuery(sessionToken, "insert", "jobs", { data: jobToDbRow(job) });
    if (error) { import.meta.env.DEV && console.error("addJob error:", error); setJobs(prev => prev.filter(j => j.id !== job.id)); throw new Error(error); }
  }, [sessionToken]);

  const updateJob = useCallback(async (job: Job) => {
    if (!sessionToken) throw new Error("Not authenticated");
    setJobs(prev => prev.map(j => j.id === job.id ? job : j));
    const { error } = await adminQuery(sessionToken, "update", "jobs", { data: jobToDbRow(job), eq: { id: job.id } });
    if (error) { import.meta.env.DEV && console.error("updateJob error:", error); throw new Error(error); }
  }, [sessionToken]);

  const deleteJob = useCallback(async (jobId: string) => {
    if (!sessionToken) throw new Error("Not authenticated");
    setJobs(prev => prev.filter(j => j.id !== jobId));
    const { error } = await adminQuery(sessionToken, "delete", "jobs", { eq: { id: jobId } });
    if (error) { import.meta.env.DEV && console.error("deleteJob error:", error); throw new Error(error); }
  }, [sessionToken]);

  const addApplicant = useCallback(async (applicant: Applicant) => {
    setApplicants(prev => [...prev, applicant]);
    const { error } = await supabase.from("applicants").insert(applicantToDbRow(applicant) as any);
    if (error) { import.meta.env.DEV && console.error("addApplicant error:", error); setApplicants(prev => prev.filter(a => a.id !== applicant.id)); throw error; }
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
    let newNotes: string[] = [];
    setApplicants(prev => prev.map(a => {
      if (a.id === applicantId) {
        newNotes = [...a.notes, note];
        return { ...a, notes: newNotes };
      }
      return a;
    }));
    if (newNotes.length > 0) {
      const { error } = await supabase.functions.invoke("update-applicant", {
        body: { sessionToken, applicantId, updates: { notes: newNotes } },
      });
      if (error) import.meta.env.DEV && console.error("addApplicantNote error:", error);
    }
  }, [sessionToken]);

  const updateApplicantAI = useCallback(async (applicantId: string, analysis: AIAnalysis) => {
    if (!sessionToken) throw new Error("Not authenticated");
    setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, aiAnalysis: analysis } : a));
    const { error } = await supabase.functions.invoke("update-applicant", {
      body: { sessionToken, applicantId, updates: { ai_analysis: analysis } },
    });
    if (error) import.meta.env.DEV && console.error("updateApplicantAI error:", error);
  }, [sessionToken]);

  const getJobById = useCallback((id: string) => jobs.find(j => j.id === id), [jobs]);

  return (
    <CareersContext.Provider value={{ jobs, applicants, loading, sessionToken, setSessionToken, addJob, updateJob, deleteJob, addApplicant, deleteApplicant, updateApplicantStatus, addApplicantNote, updateApplicantAI, getJobById, refreshData: fetchData }}>
      {children}
    </CareersContext.Provider>
  );
}

export function useCareers() {
  const ctx = useContext(CareersContext);
  if (!ctx) throw new Error("useCareers must be used within CareersProvider");
  return ctx;
}
