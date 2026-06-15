import { useState } from "react";
import { DEFAULT_AI_WEIGHTS, type AIScoringWeights } from "@/types/careers";
import {
  Plus, Trash2, Upload, FileText, Sparkles, Loader2, Wand2, RefreshCw,
  Calendar, ChevronDown, Briefcase, X, MessageSquarePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { departments } from "@/data/jobs";
import type { Job, ScreeningQuestion } from "@/types/careers";
import { toast } from "sonner";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { TONE_TEXT } from "./statusColors";
import lumofyLogo from "@/assets/lumofy-mark.png";

const WEIGHT_KEYS = ["skills", "tools", "experience", "industry", "education", "stability"] as const;
const SENIORITY = ["Intern", "Junior", "Mid", "Senior", "Lead"] as const;

type AIType = "summary" | "description" | "responsibilities" | "requirements" | "screening_questions" | "scoring_weights";

/** Shape of the structured job the `parse_jd` action returns from a read JD. */
interface ParsedJd {
  unreadable?: boolean;
  reason?: string;
  title?: string;
  department?: string;
  location?: string;
  employmentType?: string;
  seniority?: string;
  summary?: string;
  description?: string;
  responsibilities?: string[];
  requirements?: { must_have?: string[]; nice_to_have?: string[] };
  screening_questions?: Array<{ question?: string; type?: ScreeningQuestion["type"]; options?: string[]; required?: boolean }>;
  scoring_weights?: Partial<AIScoringWeights>;
  salary_present?: boolean;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  deadline?: string;
  benefits?: string[];
}
const SECTION_LABELS: Record<AIType, string> = {
  summary: "Summary",
  description: "About the role",
  responsibilities: "Responsibilities",
  requirements: "Requirements",
  screening_questions: "Screening questions",
  scoring_weights: "Scoring weights",
};

/** Scale weights so they sum to exactly 100 (largest bucket absorbs rounding). */
function normalizeWeights(weights: AIScoringWeights): AIScoringWeights {
  const total = WEIGHT_KEYS.reduce((s, k) => s + (weights[k] || 0), 0);
  if (total === 0) return weights;
  const scaled = {} as AIScoringWeights;
  WEIGHT_KEYS.forEach((k) => {
    scaled[k] = Math.max(0, Math.round((weights[k] || 0) * (100 / total)));
  });
  const scaledTotal = WEIGHT_KEYS.reduce((s, k) => s + scaled[k], 0);
  if (scaledTotal !== 100) {
    const largest = [...WEIGHT_KEYS].sort((a, b) => scaled[b] - scaled[a])[0];
    scaled[largest] += 100 - scaledTotal;
  }
  return scaled;
}

interface JobFormModalProps {
  job?: Job | null;
  onSave: (job: Job) => void;
  onClose: () => void;
  sessionToken: string;
}

const allDepartments = [
  ...new Set([
    ...departments,
    "Human Resources", "Marketing", "Operations", "Customer Success",
    "Product", "Engineering", "Finance", "Sales",
  ]),
];

const ALLOWED_JD_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const emptyJob: Omit<Job, "id"> = {
  title: "",
  department: "",
  location: "Bahrain",
  type: "Full-time",
  status: "open",
  summary: "",
  description: "",
  responsibilities: [""],
  requirements: [""],
  benefits: [],
  postedDate: new Date().toISOString().split("T")[0],
  deadline: "",
  screeningQuestions: [],
};

const JobFormModal = ({ job, onSave, onClose, sessionToken }: JobFormModalProps) => {
  const isEdit = !!job;
  const [form, setForm] = useState<Omit<Job, "id">>(() => {
    if (job) {
      const { id, ...rest } = job;
      return { ...emptyJob, ...rest };
    }
    return { ...emptyJob };
  });
  const [salaryEnabled, setSalaryEnabled] = useState(!!job?.salaryRange);
  const [salaryMin, setSalaryMin] = useState(job?.salaryRange?.split(" - ")[0]?.replace(/,/g, "") || "");
  const [salaryMax, setSalaryMax] = useState(job?.salaryRange?.split(" - ")[1]?.replace(/,/g, "") || "");
  const [salaryCurrency, setSalaryCurrency] = useState<"BHD" | "USD">(job?.salaryCurrency || "BHD");
  const [showSalary, setShowSalary] = useState(!!job?.salaryRange);
  const [screeningQuestions, setScreeningQuestions] = useState<ScreeningQuestion[]>(job?.screeningQuestions || []);
  const [aiWeights, setAiWeights] = useState<AIScoringWeights>(job?.aiScoringWeights || { ...DEFAULT_AI_WEIGHTS });

  // Stable id so an attached JD can be uploaded immediately (and reused on save).
  const [jobId] = useState(() => job?.id || `job_${Date.now()}`);

  // JD file state
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdFileName, setJdFileName] = useState(job?.jdFileName || "");
  const [jdFilePath, setJdFilePath] = useState(job?.jdFilePath || "");
  const [jdFileSize, setJdFileSize] = useState<number>(job?.jdFileSize || 0);
  const [jdUploading, setJdUploading] = useState(false);
  const [jdReading, setJdReading] = useState(false);

  // AI Compose state
  const [brief, setBrief] = useState("");
  const [seniority, setSeniority] = useState<typeof SENIORITY[number]>("Mid");
  const [draftingAll, setDraftingAll] = useState(false);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [instrFor, setInstrFor] = useState<AIType | null>(null);
  const [instrText, setInstrText] = useState("");
  const [scoringOpen, setScoringOpen] = useState(false);

  const setField = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateListItem = (field: "responsibilities" | "requirements", index: number, value: string) => {
    setForm((prev) => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };
  const addListItem = (field: "responsibilities" | "requirements") =>
    setForm((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  const removeListItem = (field: "responsibilities" | "requirements", index: number) =>
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));

  const addScreeningQuestion = () =>
    setScreeningQuestions((prev) => [...prev, { id: `sq_${Date.now()}`, question: "", type: "short_text", required: false }]);
  const updateQuestion = (index: number, updates: Partial<ScreeningQuestion>) =>
    setScreeningQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...updates } : q)));
  const removeQuestion = (index: number) =>
    setScreeningQuestions((prev) => prev.filter((_, i) => i !== index));

  // ── JD upload + AI auto-read ──
  // Upload a JD to storage and record its path/size in state. Returns the stored
  // file info, or null on failure (a toast is shown).
  const uploadJd = async (file: File): Promise<{ path: string; name: string; size: number } | null> => {
    setJdUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jobId", jobId);
      formData.append("contentType", file.type);
      formData.append("sessionToken", sessionToken);
      const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-jd`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      const data = await response.json();
      setJdFilePath(data.storagePath);
      setJdFileName(data.fileName);
      setJdFileSize(data.fileSize || file.size);
      setJdFile(null); // uploaded — no need to re-upload on save
      return { path: data.storagePath, name: data.fileName, size: data.fileSize || file.size };
    } catch (err: any) {
      toast.error(err.message || "Failed to upload JD");
      return null;
    } finally {
      setJdUploading(false);
    }
  };

  /** Apply an AI-extracted job to the form. On a brand-new job we fill everything;
   * when editing a job that already has content we fill ONLY blank fields so manual
   * edits are never overwritten. Returns how many fields were filled. */
  const applyExtracted = (r: ParsedJd): number => {
    if (!r || typeof r !== "object") return 0;
    const fillEmptyOnly = isEdit;
    const blankStr = (v: unknown) => !String(v ?? "").trim();
    const blankArr = (a: unknown) => !(Array.isArray(a) && a.filter((x) => String(x).trim()).length);
    let n = 0;

    if (r.title && (!fillEmptyOnly || blankStr(form.title))) { setField("title", String(r.title)); n++; }

    // Department must match an existing Select option.
    if (r.department && (!fillEmptyOnly || blankStr(form.department))) {
      const want = String(r.department).trim().toLowerCase();
      const match = allDepartments.find((d) => d.toLowerCase() === want)
        || allDepartments.find((d) => d.toLowerCase().includes(want) || want.includes(d.toLowerCase()));
      if (match) { setField("department", match); n++; }
    }

    if (r.location && (!fillEmptyOnly || blankStr(form.location))) { setField("location", String(r.location)); n++; }

    const empTypes = ["Full-time", "Part-time", "Contract", "Internship"];
    if (r.employmentType && empTypes.includes(r.employmentType) && (!fillEmptyOnly || blankStr(form.type))) { setField("type", r.employmentType); n++; }

    // Seniority is a generation hint, not user content — set it whenever valid.
    if (r.seniority && (SENIORITY as readonly string[]).includes(r.seniority)) setSeniority(r.seniority as typeof SENIORITY[number]);

    if (r.summary && (!fillEmptyOnly || blankStr(form.summary))) { setField("summary", String(r.summary)); n++; }
    if (r.description && (!fillEmptyOnly || blankStr(form.description))) { setField("description", String(r.description)); n++; }

    if (Array.isArray(r.responsibilities) && r.responsibilities.length && (!fillEmptyOnly || blankArr(form.responsibilities))) {
      const items = r.responsibilities.map((x) => String(x)).filter(Boolean);
      if (items.length) { setField("responsibilities", items); n++; }
    }

    const reqs = [...(r.requirements?.must_have || []), ...(r.requirements?.nice_to_have || [])].map((x) => String(x)).filter(Boolean);
    if (reqs.length && (!fillEmptyOnly || blankArr(form.requirements))) { setField("requirements", reqs); n++; }

    if (Array.isArray(r.screening_questions) && r.screening_questions.length && (!fillEmptyOnly || screeningQuestions.length === 0)) {
      setScreeningQuestions(r.screening_questions.map((q, i) => ({
        id: `sq_${Date.now()}_${i}`,
        question: q.question || "",
        type: q.type || "short_text",
        required: !!q.required,
        ...(q.options?.length ? { options: q.options } : {}),
      })));
      n++;
    }

    // Scoring weights: only on a fresh job — don't disturb tuned weights when editing.
    if (!fillEmptyOnly && r.scoring_weights) {
      const w: AIScoringWeights = {
        skills: Number(r.scoring_weights.skills) || 0, tools: Number(r.scoring_weights.tools) || 0,
        experience: Number(r.scoring_weights.experience) || 0, industry: Number(r.scoring_weights.industry) || 0,
        education: Number(r.scoring_weights.education) || 0, stability: Number(r.scoring_weights.stability) || 0,
      };
      if (WEIGHT_KEYS.reduce((s, k) => s + w[k], 0) > 0) { setAiWeights(normalizeWeights(w)); n++; }
    }

    // Salary — extract-only (never invented server-side); ignore an inverted range.
    if (r.salary_present && Number(r.salary_min) > 0 && Number(r.salary_max) > 0 && Number(r.salary_min) <= Number(r.salary_max) && (!fillEmptyOnly || (!salaryMin && !salaryMax))) {
      setSalaryEnabled(true);
      setSalaryMin(String(Math.round(Number(r.salary_min))));
      setSalaryMax(String(Math.round(Number(r.salary_max))));
      if (r.salary_currency === "USD" || r.salary_currency === "BHD") setSalaryCurrency(r.salary_currency);
      setShowSalary(true);
      n++;
    }

    // Deadline — extract-only, ISO date.
    if (typeof r.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.deadline) && (!fillEmptyOnly || blankStr(form.deadline))) {
      setField("deadline", r.deadline); n++;
    }

    if (Array.isArray(r.benefits) && r.benefits.length && (!fillEmptyOnly || blankArr(form.benefits))) {
      const items = r.benefits.map((x) => String(x)).filter(Boolean);
      if (items.length) { setField("benefits", items); n++; }
    }

    return n;
  };

  // Read an already-uploaded JD with AI and fill the form from it.
  const readJdIntoForm = async (storagePath: string) => {
    setJdReading(true);
    try {
      const result = await callAssist("parse_jd", { jdFilePath: storagePath, brief, allowedDepartments: allDepartments }) as ParsedJd;
      if (result?.unreadable) {
        toast.error(result.reason === "word"
          ? "Can't read Word files directly. Save the JD as a PDF and re-upload, or describe the role in the Brief and click Generate full draft."
          : "Couldn't read that file. Try re-uploading, or use the Brief.");
        return;
      }
      const filled = applyExtracted(result);
      if (filled > 0) toast.success(`Read the JD and filled ${filled} field${filled === 1 ? "" : "s"} — refine anything.`);
      else if (isEdit) toast("Read the JD — your existing fields already have content, so nothing was overwritten.");
      else toast("Couldn't pull structured fields from this JD. Add a Brief and click Generate full draft.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg && !/non-2xx/i.test(msg) ? msg : "Failed to read the JD. Please try again.");
    } finally {
      setJdReading(false);
    }
  };

  const handleJdFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!ALLOWED_JD_TYPES.includes(file.type)) { toast.error("Only PDF, DOC, DOCX files are allowed"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("File size must be under 10MB"); return; }
    setJdFileName(file.name);
    const up = await uploadJd(file);
    if (up) await readJdIntoForm(up.path);
  };

  const reReadJd = async () => {
    if (!jdFilePath) return;
    await readJdIntoForm(jdFilePath);
  };

  const removeJdFile = () => { setJdFile(null); setJdFileName(""); setJdFilePath(""); setJdFileSize(0); };

  // ── AI generation ──
  const buildContext = () => ({
    jobTitle: form.title,
    department: form.department,
    location: form.location,
    employmentType: form.type,
    summary: form.summary,
    description: form.description,
    responsibilities: form.responsibilities.filter((r) => r.trim()),
    requirements: form.requirements.filter((r) => r.trim()),
    jdFilePath: jdFilePath || undefined,
    seniority,
  });

  const callAssist = async (type: AIType | "parse_jd", opts: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("ai-job-assist", {
      body: { type, sessionToken, ...buildContext(), ...opts },
    });
    if (error) {
      // On a non-2xx, supabase-js hides the function's JSON body (which carries the
      // specific message, e.g. "Rate limit exceeded") on error.context as a Response.
      // Surface that instead of the opaque "non-2xx status code" wrapper.
      let serverMsg = "";
      try {
        const ctx = (error as { context?: unknown }).context;
        if (ctx instanceof Response) serverMsg = (await ctx.clone().json())?.error || "";
      } catch { /* ignore — fall back to the generic message */ }
      throw new Error(serverMsg || error.message || "AI request failed");
    }
    if (data?.error) throw new Error(data.error);
    return data.result;
  };

  const applyResult = (type: AIType, result: any) => {
    if (!result) return;
    if (type === "summary" && result.summary != null) setField("summary", String(result.summary));
    else if (type === "description" && result.description != null) setField("description", String(result.description));
    else if (type === "responsibilities" && Array.isArray(result.responsibilities))
      setField("responsibilities", result.responsibilities.length ? result.responsibilities : [""]);
    else if (type === "requirements") {
      const merged = [...(result.must_have || []), ...(result.nice_to_have || [])];
      setField("requirements", merged.length ? merged : [""]);
    } else if (type === "screening_questions" && Array.isArray(result.questions)) {
      setScreeningQuestions(result.questions.map((q: any, i: number) => ({
        id: `sq_${Date.now()}_${i}`,
        question: q.question || "",
        type: q.type || "short_text",
        required: !!q.required,
        ...(q.options?.length ? { options: q.options } : {}),
      })));
    } else if (type === "scoring_weights") {
      const w: AIScoringWeights = {
        skills: Number(result.skills) || 0, tools: Number(result.tools) || 0,
        experience: Number(result.experience) || 0, industry: Number(result.industry) || 0,
        education: Number(result.education) || 0, stability: Number(result.stability) || 0,
      };
      if (WEIGHT_KEYS.reduce((s, k) => s + w[k], 0) > 0) setAiWeights(normalizeWeights(w));
    }
  };

  const generateFullDraft = async () => {
    if (!form.title.trim() || !form.department) { toast.error("Add a job title and department first."); return; }
    const sections: AIType[] = ["summary", "description", "responsibilities", "requirements", "screening_questions", "scoring_weights"];
    setDraftingAll(true);
    setGenerating(Object.fromEntries(sections.map((s) => [s, true])));
    await Promise.all(sections.map(async (type) => {
      try {
        const opts: Record<string, unknown> = { instruction: brief };
        if (type === "screening_questions") opts.count = 4;
        if (type === "responsibilities" || type === "requirements") opts.count = 6;
        applyResult(type, await callAssist(type, opts));
      } catch {
        toast.error(`Couldn't generate ${SECTION_LABELS[type]}.`);
      } finally {
        setGenerating((g) => ({ ...g, [type]: false }));
      }
    }));
    setDraftingAll(false);
    toast.success("Draft ready — refine any section.");
  };

  const regenerateSection = async (type: AIType, withInstruction?: string) => {
    if (!form.title.trim() || !form.department) { toast.error("Add a job title and department first."); return; }
    setGenerating((g) => ({ ...g, [type]: true }));
    try {
      const opts: Record<string, unknown> = { instruction: (withInstruction ?? "").trim() || brief };
      if (type === "screening_questions") opts.count = Math.max(3, screeningQuestions.length || 4);
      if (type === "responsibilities") opts.count = Math.max(4, form.responsibilities.filter((r) => r.trim()).length || 6);
      if (type === "requirements") opts.count = Math.max(4, form.requirements.filter((r) => r.trim()).length || 6);
      applyResult(type, await callAssist(type, opts));
    } catch {
      toast.error("Regeneration failed.");
    } finally {
      setGenerating((g) => ({ ...g, [type]: false }));
      setInstrFor(null); setInstrText("");
    }
  };

  /** Per-section controls: one-click Regenerate (immediate, uses the brief),
   * plus a secondary button that opens an optional instruction box for a
   * targeted tweak ("punchier", "more senior", …). */
  const aiControl = (type: AIType) => {
    const busy = !!generating[type];
    const open = instrFor === type;
    return (
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button" disabled={busy || draftingAll}
            onClick={() => regenerateSection(type)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3 w-3" aria-hidden="true" />}
            {busy ? "Generating…" : "Regenerate"}
          </button>
          <button
            type="button" disabled={busy || draftingAll}
            onClick={() => (open ? setInstrFor(null) : (setInstrFor(type), setInstrText("")))}
            aria-label="Regenerate with a specific instruction"
            className="inline-flex items-center justify-center rounded-lg border border-primary/30 bg-primary/10 p-1.5 text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            <MessageSquarePlus className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
        {open && !busy && (
          <div className="flex items-center gap-1.5">
            <Input
              value={instrText} onChange={(e) => setInstrText(e.target.value)}
              placeholder='e.g. "punchier", "more senior"…'
              className="h-8 w-52 text-xs"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); regenerateSection(type, instrText); } }}
            />
            <Button type="button" size="sm" className="h-8" onClick={() => regenerateSection(type, instrText)}>Go</Button>
          </div>
        )}
      </div>
    );
  };

  const handleSave = async (status: Job["status"]) => {
    if (!form.title.trim()) { toast.error("Job title is required"); return; }
    if (!form.department) { toast.error("Department is required"); return; }

    const weightsTotal = WEIGHT_KEYS.reduce((s, k) => s + (aiWeights[k] || 0), 0);
    if (weightsTotal === 0) { toast.error("AI scoring weights can't all be zero. Assign at least one dimension."); return; }
    const normalizedWeights = normalizeWeights(aiWeights);

    // JD is uploaded the moment it's attached; only upload here if a picked file
    // somehow wasn't uploaded yet. Otherwise reuse the stored path.
    const jdResult = jdFile
      ? await uploadJd(jdFile)
      : (jdFilePath ? { path: jdFilePath, name: jdFileName, size: jdFileSize } : null);

    const salaryRange = salaryEnabled && salaryMin && salaryMax && showSalary
      ? `${Number(salaryMin).toLocaleString()} - ${Number(salaryMax).toLocaleString()}`
      : undefined;

    const finalJob: Job = {
      id: jobId,
      ...form,
      status,
      deadline: form.deadline || undefined,
      salaryRange,
      salaryCurrency: salaryEnabled ? salaryCurrency : undefined,
      responsibilities: form.responsibilities.filter((r) => r.trim()),
      requirements: form.requirements.filter((r) => r.trim()),
      benefits: form.benefits ?? [],
      screeningQuestions,
      postedDate: job?.postedDate || new Date().toISOString().split("T")[0],
      jdFileName: jdResult?.name || jdFileName || undefined,
      jdFilePath: jdResult?.path || jdFilePath || undefined,
      jdFileSize: jdResult?.size || jdFileSize || undefined,
      jdFileUploadedAt: jdResult ? new Date().toISOString() : job?.jdFileUploadedAt,
      aiScoringWeights: normalizedWeights,
    };
    setAiWeights(normalizedWeights);
    onSave(finalJob);
  };

  const summaryLen = (form.summary || "").length;
  const canGenerate = !!form.title.trim() && !!form.department;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-3xl w-full p-0 gap-0 max-h-[92vh] overflow-hidden flex flex-col bg-card"
        onInteractOutside={(e) => { if (jdUploading || jdReading || draftingAll) e.preventDefault(); }}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center gap-3 p-5 border-b border-border space-y-0 text-left">
          <img src={lumofyLogo} alt="" className="h-7 w-7" aria-hidden="true" />
          <div className="flex-1">
            <DialogTitle className="text-lg font-extrabold tracking-tight leading-none">
              {isEdit ? "Edit job" : "Create a job"}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
              Draft it with AI, then refine.
            </DialogDescription>
          </div>
          <Badge className="border-0 bg-primary/15 text-[10px] text-primary">AI by Lumofy</Badge>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 sm:px-6">

          {/* ===== AI COMPOSE HERO ===== */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/12 via-card to-card p-5 light-glow">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /></span>
                <h2 className="text-base font-bold">Draft this job with AI</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Give the gist. AI writes the summary, role overview, responsibilities, requirements, screening questions, and suggested scoring — then you refine each part.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Job title <span className="text-destructive">*</span></Label>
                  <Input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="e.g. Growth Marketing Manager" className="mt-1 bg-secondary border-border" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Department <span className="text-destructive">*</span></Label>
                  <Select value={form.department} onValueChange={(v) => setField("department", v)}>
                    <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>{allDepartments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Brief — describe the role in a sentence or two</Label>
                <Textarea
                  value={brief} onChange={(e) => setBrief(e.target.value)}
                  placeholder="e.g. Mid-level growth marketer, owns paid + lifecycle + PLG, MENA, remote-friendly. Strong analytics + B2B SaaS."
                  className="mt-1 min-h-[64px] bg-secondary border-border"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Seniority</span>
                  <div className="flex gap-0.5 rounded-lg bg-secondary/70 p-0.5">
                    {SENIORITY.map((s) => (
                      <button key={s} type="button" onClick={() => setSeniority(s)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${seniority === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary ${(jdUploading || jdReading) ? "pointer-events-none opacity-60" : ""}`}>
                  {(jdUploading || jdReading) ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
                  {jdUploading ? "Uploading…" : jdReading ? "Reading JD…" : jdFileName ? "Replace JD" : "Attach JD — auto-fills the form (PDF)"}
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" disabled={jdUploading || jdReading} onChange={handleJdFileSelect} />
                </label>
                {jdFileName && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2 py-1 text-xs">
                    <FileText className="h-3 w-3 text-primary" aria-hidden="true" />
                    <span className="max-w-[140px] truncate">{jdFileName}</span>
                    {jdFilePath && !jdReading && !jdUploading && (
                      <button type="button" onClick={reReadJd} aria-label="Re-read JD" className="font-medium text-primary hover:underline">Re-read</button>
                    )}
                    <button type="button" onClick={removeJdFile} aria-label="Remove JD"><X className="h-3 w-3 text-muted-foreground hover:text-destructive" /></button>
                  </span>
                )}
                <Button className="ml-auto h-10 rounded-xl px-5 btn-sheen" disabled={draftingAll || jdReading || jdUploading || !canGenerate} onClick={generateFullDraft}>
                  {draftingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />}
                  {draftingAll ? "Drafting…" : "Generate full draft"}
                </Button>
              </div>
              {!canGenerate && <p className="text-xs text-muted-foreground">Add a job title and department, or attach a PDF JD to auto-fill everything.</p>}
            </div>
          </div>

          {/* ===== BASICS ===== */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Basics</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setField("location", e.target.value)} className="mt-1 bg-secondary border-border" />
              </div>
              <div>
                <Label>Employment type</Label>
                <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                  <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Full-time", "Part-time", "Contract", "Internship"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Application deadline</Label>
                <Input type="date" value={form.deadline || ""} onChange={(e) => setField("deadline", e.target.value)} className="mt-1 bg-secondary border-border" />
              </div>
            </div>
          </div>

          {/* ===== CONTENT ===== */}
          <div className="space-y-5 rounded-2xl border border-border bg-secondary/20 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Content · edit anything, or regenerate per section
            </div>

            {/* Summary */}
            <div>
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <Label>Summary <span className={`ml-1 text-xs font-normal ${summaryLen > 180 ? "text-destructive" : "text-muted-foreground"}`}>{summaryLen}/180</span></Label>
                {aiControl("summary")}
              </div>
              <Textarea value={form.summary} onChange={(e) => setField("summary", e.target.value)} className="bg-secondary border-border min-h-[56px]" placeholder="One or two lines for the job card…" />
            </div>

            {/* About */}
            <div>
              <div className="mb-1.5 flex items-start justify-between gap-2"><Label>About the role</Label>{aiControl("description")}</div>
              <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} className="bg-secondary border-border min-h-[110px]" placeholder="2-4 paragraphs about the role…" />
            </div>

            {/* Responsibilities */}
            <div>
              <div className="mb-2 flex items-start justify-between gap-2">
                <Label>Key responsibilities</Label>
                <div className="flex items-start gap-2">
                  {aiControl("responsibilities")}
                  <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => addListItem("responsibilities")}><Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Add</Button>
                </div>
              </div>
              {form.responsibilities.map((r, i) => (
                <div key={i} className="mb-2 flex gap-2">
                  <Input value={r} onChange={(e) => updateListItem("responsibilities", i, e.target.value)} className="bg-secondary border-border" />
                  {form.responsibilities.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeListItem("responsibilities", i)} aria-label="Remove responsibility"><Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" /></Button>
                  )}
                </div>
              ))}
            </div>

            {/* Requirements */}
            <div>
              <div className="mb-2 flex items-start justify-between gap-2">
                <Label>Requirements</Label>
                <div className="flex items-start gap-2">
                  {aiControl("requirements")}
                  <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => addListItem("requirements")}><Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Add</Button>
                </div>
              </div>
              {form.requirements.map((r, i) => (
                <div key={i} className="mb-2 flex gap-2">
                  <Input value={r} onChange={(e) => updateListItem("requirements", i, e.target.value)} className="bg-secondary border-border" />
                  {form.requirements.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeListItem("requirements", i)} aria-label="Remove requirement"><Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" /></Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ===== SALARY ===== */}
          <div className="rounded-2xl bg-secondary/40 border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Salary range (optional)</Label>
              <Switch checked={salaryEnabled} onCheckedChange={setSalaryEnabled} />
            </div>
            {salaryEnabled && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">Min</Label><Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} className="mt-1 bg-secondary border-border" /></div>
                  <div><Label className="text-xs">Max</Label><Input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} className="mt-1 bg-secondary border-border" /></div>
                  <div>
                    <Label className="text-xs">Currency</Label>
                    <Select value={salaryCurrency} onValueChange={(v) => setSalaryCurrency(v as "BHD" | "USD")}>
                      <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="BHD">BHD</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={showSalary} onCheckedChange={setShowSalary} />
                  <Label className="text-xs text-muted-foreground">Show salary to candidates</Label>
                </div>
              </>
            )}
          </div>

          {/* ===== SCREENING ===== */}
          <div>
            <div className="mb-2 flex items-start justify-between gap-2">
              <Label>Screening questions</Label>
              <div className="flex items-start gap-2">
                {aiControl("screening_questions")}
                <Button type="button" variant="ghost" size="sm" className="h-7" onClick={addScreeningQuestion}><Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Add</Button>
              </div>
            </div>
            {screeningQuestions.length === 0 && (
              <p className="rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">No screening questions yet. Generate a full draft, hit Regenerate, or add one manually.</p>
            )}
            {screeningQuestions.map((q, i) => (
              <div key={q.id} className="mb-2 rounded-lg bg-secondary/50 border border-border p-3 space-y-2">
                <div className="flex gap-2">
                  <Input value={q.question} onChange={(e) => updateQuestion(i, { question: e.target.value })} placeholder="Question text…" className="bg-secondary border-border" />
                  <Button variant="ghost" size="icon" onClick={() => removeQuestion(i)} aria-label="Remove screening question"><Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" /></Button>
                </div>
                <div className="flex gap-3 items-center">
                  <Select value={q.type} onValueChange={(v) => updateQuestion(i, { type: v as ScreeningQuestion["type"] })}>
                    <SelectTrigger className="w-40 bg-secondary border-border text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short_text">Short Text</SelectItem>
                      <SelectItem value="long_text">Long Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="yes_no">Yes/No</SelectItem>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={q.required} onCheckedChange={(v) => updateQuestion(i, { required: v })} />
                    <span className="text-xs text-muted-foreground">Required</span>
                  </div>
                </div>
                {q.type === "multiple_choice" && (
                  <Input placeholder="Options (comma separated)" value={q.options?.join(", ") || ""}
                    onChange={(e) => updateQuestion(i, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                    className="bg-secondary border-border text-xs" />
                )}
              </div>
            ))}
          </div>

          {/* ===== ADVANCED: AI SCORING ===== */}
          <div className="rounded-2xl border border-border">
            <button type="button" onClick={() => setScoringOpen(!scoringOpen)} className="flex w-full items-center justify-between px-4 py-3 text-left">
              <span className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> Advanced · AI scoring weights</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge className="border-0 bg-primary/15 text-[10px] text-primary">AI-suggested</Badge>
                <ChevronDown className={`h-4 w-4 transition-transform ${scoringOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </span>
            </button>
            {scoringOpen && (
              <div className="space-y-3 border-t border-border p-4">
                <p className="text-xs text-muted-foreground">How AI weighs each dimension when ranking candidates. Generate a full draft to get role-specific suggestions, or tune manually.</p>
                {([
                  { key: "skills" as const, label: "Required Skills" },
                  { key: "tools" as const, label: "Tools & Technologies" },
                  { key: "experience" as const, label: "Relevant Experience" },
                  { key: "industry" as const, label: "Industry Match" },
                  { key: "education" as const, label: "Education" },
                  { key: "stability" as const, label: "Career Stability" },
                ]).map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-36 text-xs text-muted-foreground">{label}</span>
                    <input
                      type="range" min={0} max={100} value={aiWeights[key]}
                      onChange={(e) => {
                        const newVal = Number(e.target.value);
                        const otherKeys = WEIGHT_KEYS.filter((k) => k !== key);
                        const otherTotal = otherKeys.reduce((s, k) => s + aiWeights[k], 0);
                        const remainder = 100 - newVal;
                        const updated = { ...aiWeights, [key]: newVal };
                        if (otherTotal === 0) {
                          const base = Math.floor(remainder / otherKeys.length);
                          otherKeys.forEach((k, i) => { updated[k] = base + (i < remainder - base * otherKeys.length ? 1 : 0); });
                        } else {
                          otherKeys.forEach((k) => { updated[k] = Math.max(0, Math.round(aiWeights[k] * (remainder / otherTotal))); });
                        }
                        const total = WEIGHT_KEYS.reduce((s, k) => s + updated[k], 0);
                        if (total !== 100) {
                          const largest = [...otherKeys].sort((a, b) => updated[b] - updated[a])[0];
                          updated[largest] = Math.max(0, updated[largest] + (100 - total));
                        }
                        setAiWeights(updated);
                      }}
                      className="flex-1 h-1.5 accent-[hsl(var(--primary))]"
                    />
                    <span className="w-8 text-right text-xs font-bold">{aiWeights[key]}%</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-border text-xs">
                  <span className="text-muted-foreground">Total</span>
                  <span className={`font-bold ${TONE_TEXT.success}`}>{WEIGHT_KEYS.reduce((a, k) => a + aiWeights[k], 0)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* End scrollable body */}

        <DialogFooter className="flex-row items-center justify-between p-5 border-t border-border sm:justify-between">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave("closed")} disabled={jdUploading || jdReading || draftingAll}>
              {jdUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" aria-hidden="true" /> : null}
              Save as draft
            </Button>
            <Button className="btn-sheen" onClick={() => handleSave("open")} disabled={jdUploading || jdReading || draftingAll}>
              {jdUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" aria-hidden="true" /> : <Briefcase className="w-4 h-4 mr-2" aria-hidden="true" />}
              {isEdit ? "Update & publish" : "Publish job"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JobFormModal;
