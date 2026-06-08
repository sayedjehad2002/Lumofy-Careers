import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, CheckCircle, Loader2, X, FileText, User, Briefcase, HelpCircle } from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCareers } from "@/contexts/CareersContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/careers/Navbar";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { NATIONALITIES } from "@/data/nationalities";
import { getApplicationFieldErrors } from "@/lib/applicationSchema";
import type { Applicant } from "@/types/careers";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

// ── Progress Steps ──
const STEPS = [
  { label: "Personal Info", icon: User },
  { label: "Upload CV", icon: FileText },
  { label: "Questions", icon: HelpCircle },
];

function ProgressIndicator({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-0">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === current;
        const isDone = i < current;
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : isDone
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className={`mt-1.5 text-[11px] ${isActive ? "font-medium text-primary" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-2 mb-5 h-0.5 w-12 sm:w-20 ${isDone ? "bg-primary/40" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Nationality Searchable Dropdown ──
function NationalitySelect({
  value,
  onChange,
  error,
  id,
  errorId,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  id?: string;
  errorId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search) return NATIONALITIES as unknown as string[];
    const q = search.toLowerCase();
    return (NATIONALITIES as unknown as string[]).filter((n) => n.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="relative">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={!!error}
        aria-describedby={error && errorId ? errorId : undefined}
        className={`flex h-10 w-full items-center rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          error ? "border-destructive" : "border-input"
        }`}
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        {value ? (
          <span className="flex-1">{value}</span>
        ) : (
          <span className="flex-1 text-muted-foreground">Select nationality...</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full z-50 mt-1 flex max-h-64 w-full flex-col overflow-hidden rounded-md border border-border bg-popover shadow-lg">
            <div className="border-b border-border p-2">
              <Input
                ref={inputRef}
                placeholder="Search nationality..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8"
                aria-label="Search nationality"
              />
            </div>
            <div className="flex-1 overflow-y-auto" role="listbox">
              {filtered.length === 0 ? (
                <p className="p-3 text-center text-sm text-muted-foreground">No results found</p>
              ) : (
                filtered.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="option"
                    aria-selected={n === value}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                      n === value ? "bg-primary/10 font-medium text-primary" : ""
                    }`}
                    onClick={() => {
                      onChange(n);
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    {n}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
      {error && <p id={errorId} role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Main Page ──
const ApplyPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getJobById, addApplicant, loading: ctxLoading } = useCareers();
  const job = getJobById(id || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    nationality: "",
    linkedin: "",
    portfolio: "",
    coverLetter: "",
  });
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Determine active step for progress indicator
  const activeStep = useMemo(() => {
    const hasPersonal = formData.fullName && formData.email && formData.phone && formData.location && formData.nationality;
    const hasCv = !!cvFile;
    if (hasPersonal && hasCv) return 2;
    if (hasPersonal) return 1;
    return 0;
  }, [formData, cvFile]);

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main id="main" className="px-4 pt-32 text-center text-muted-foreground">
          <p>Job not found.</p>
          <Link to="/" className="mt-2 inline-block text-primary hover:underline">Back to positions</Link>
        </main>
      </div>
    );
  }

  // Guard against applying to a role that is closed or past its deadline — the
  // server also enforces this (410), but blocking here avoids a wasted CV upload
  // and shows the candidate a clear message up front.
  const deadlineRaw = (job as { deadline?: string }).deadline;
  const deadlineMs = deadlineRaw ? Date.parse(deadlineRaw) : NaN;
  const deadlinePassed = !Number.isNaN(deadlineMs) && Date.now() > deadlineMs + 24 * 60 * 60 * 1000 - 1;
  if (job.status !== "open" || deadlinePassed) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main id="main" className="px-4 pt-32 text-center text-muted-foreground">
          <p>This role is no longer accepting applications.</p>
          <Link to="/jobs" className="mt-2 inline-block text-primary hover:underline">Browse open roles</Link>
        </main>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setCvError("");
    if (!file) return;
    const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      setCvError("Please upload a PDF, DOC, or DOCX file.");
      setCvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setCvError("File size must be under 10MB.");
      setCvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setCvFile(file);
    // Clear any prior submit-time CV requirement error once a valid file is chosen.
    setErrors((prev) => {
      if (!prev.cv) return prev;
      const next = { ...prev };
      delete next.cv;
      return next;
    });
  };

  const validate = () => {
    // Personal-field rules come from the shared zod schema (typed + unit-tested);
    // CV-file + dynamic screening checks stay here (they depend on runtime state).
    const errs: Record<string, string> = getApplicationFieldErrors(formData);
    if (!cvFile) errs.cv = "CV/Resume is required";
    (job.screeningQuestions ?? []).forEach((q) => {
      if (q.required && !screeningAnswers[q.id]?.trim()) errs[`sq_${q.id}`] = "This question is required";
    });
    setErrors(errs);

    // Scroll to + focus the first invalid field so keyboard/SR users land on it.
    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      const container = document.querySelector(`[data-field="${firstKey}"]`);
      container?.scrollIntoView({ behavior: "smooth", block: "center" });
      // Prefer a real focusable control inside the field wrapper.
      const focusable = container?.querySelector<HTMLElement>(
        "input, textarea, select, button, [tabindex]"
      );
      // Defer focus so it doesn't fight the smooth scroll.
      window.setTimeout(() => focusable?.focus(), 0);
    }

    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error("Please fill in all required fields."); return; }
    if (submitting) return;

    setSubmitting(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", cvFile!);
      uploadForm.append("jobId", job.id);
      uploadForm.append("contentType", cvFile!.type);

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke("upload-cv", {
        body: uploadForm,
      });

      if (uploadError || uploadData?.error) {
        toast.error(uploadData?.error || "Failed to upload CV. Please try again.");
        setSubmitting(false);
        return;
      }

      // P0 guard: the upload-cv response must include both storagePath and applicantId
      // before we destructure/use them, otherwise the page would crash on undefined.
      if (!uploadData?.storagePath || !uploadData?.applicantId) {
        toast.error("Upload failed, please try again.");
        setSubmitting(false);
        return;
      }

      const { storagePath, applicantId } = uploadData;

      const newApplicant: Applicant = {
        id: applicantId,
        jobId: job.id,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        nationality: formData.nationality,
        linkedin: formData.linkedin.trim() || undefined,
        portfolio: formData.portfolio.trim() || undefined,
        coverLetter: formData.coverLetter.trim() || undefined,
        cvFileName: cvFile!.name,
        cvStoragePath: storagePath,
        cvFileType: cvFile!.type,
        cvFileSize: cvFile!.size,
        screeningAnswers,
        status: "new",
        appliedDate: new Date().toISOString().split("T")[0],
        notes: [],
      };

      const newApplicantId = await addApplicant(newApplicant);
      setSubmitted(true);
      toast.success("Application submitted successfully!");

      // Fire-and-forget: trigger automatic AI analysis (use the server-created id)
      supabase.functions.invoke("auto-analyze-applicant", {
        body: { applicantId: newApplicantId },
      }).catch((err) => {
        import.meta.env.DEV && console.warn("Auto-analyze trigger failed (non-blocking):", err);
      });
    } catch (err: any) {
      import.meta.env.DEV && console.error("Submit error:", err);
      const msg = err?.message || "";
      if (msg === "already_applied" || msg.includes("duplicate")) {
        toast.error("It looks like you've already applied for this position.");
      } else if (msg.includes("no longer accepting") || msg.includes("deadline has passed")) {
        toast.error(msg);
      } else if (msg === "Job not found") {
        toast.error("This job is no longer available.");
      } else {
        toast.error("We could not submit your application. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    const reveal = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } } };
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main id="main" className="relative overflow-hidden px-4 py-20 pt-32 text-center sm:py-24">
          {/* Signature aurora glow behind the confirmation */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-28 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]"
          />
          <motion.div
            className="relative mx-auto max-w-md"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } }}
          >
            <motion.div
              className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
              variants={{
                hidden: { opacity: 0, scale: 0.5 },
                show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 260, damping: 17 } },
              }}
            >
              {/* One-shot expanding ring pulse */}
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-full ring-2 ring-primary/40"
                initial={{ opacity: 0.7, scale: 0.85 }}
                animate={{ opacity: 0, scale: 1.9 }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
              />
              <CheckCircle className="h-8 w-8 text-primary" aria-hidden="true" />
            </motion.div>
            <motion.h1 variants={reveal} className="mb-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Application submitted
            </motion.h1>
            <motion.p variants={reveal} className="mb-6 text-muted-foreground">
              Thank you for applying to <strong className="text-foreground">{job.title}</strong> at Lumofy. We'll review your application and get back to you soon.
            </motion.p>
            <motion.div variants={reveal}>
              <Button onClick={() => navigate("/")} size="lg" className="h-12 rounded-xl px-8 text-base">Back to Careers</Button>
            </motion.div>
          </motion.div>
        </main>
      </div>
    );
  }

  const field = (key: string, val: string) => ({ value: val, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, [key]: e.target.value }) });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main" className="px-4 py-12 pt-24 sm:py-16 sm:pt-28">
        <div className="mx-auto max-w-2xl">
          <Link to={`/jobs/${job.id}`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to {job.title}
          </Link>

          {/* Job header */}
          <motion.div
            className="mb-8 rounded-2xl border border-border bg-card p-6 light-glow sm:p-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Apply for {job.title}</h1>
                <p className="text-sm text-muted-foreground">{job.department} · {job.location}</p>
              </div>
            </div>
          </motion.div>

          {/* Progress */}
          <ProgressIndicator current={activeStep} />

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Card 1: Personal Information ── */}
            <motion.div
              className="rounded-2xl border border-border bg-card p-6 light-glow sm:p-8"
              initial="hidden"
              animate="show"
              variants={fadeUp}
            >
              <h2 className="text-lg font-bold tracking-tight">Personal Information</h2>
              <p className="mb-6 mt-1 text-sm text-muted-foreground">Tell us about yourself and how we can reach you.</p>

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <div data-field="fullName">
                  <Label htmlFor="fullName" className="text-sm">Full Name <span className="text-destructive">*</span></Label>
                  <Input id="fullName" {...field("fullName", formData.fullName)} className="mt-1.5" aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? "fullName-error" : undefined} />
                  {errors.fullName && <p id="fullName-error" role="alert" className="mt-1 text-xs text-destructive">{errors.fullName}</p>}
                </div>
                <div data-field="email">
                  <Label htmlFor="email" className="text-sm">Email <span className="text-destructive">*</span></Label>
                  <Input id="email" type="email" {...field("email", formData.email)} className="mt-1.5" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
                  {errors.email && <p id="email-error" role="alert" className="mt-1 text-xs text-destructive">{errors.email}</p>}
                </div>
                <div data-field="phone">
                  <Label htmlFor="phone" className="text-sm">Phone <span className="text-destructive">*</span></Label>
                  <Input id="phone" {...field("phone", formData.phone)} className="mt-1.5" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} />
                  {errors.phone && <p id="phone-error" role="alert" className="mt-1 text-xs text-destructive">{errors.phone}</p>}
                </div>
                <div data-field="location">
                  <Label htmlFor="location" className="text-sm">Current Location <span className="text-destructive">*</span></Label>
                  <Input id="location" {...field("location", formData.location)} className="mt-1.5" aria-invalid={!!errors.location} aria-describedby={errors.location ? "location-error" : undefined} />
                  {errors.location && <p id="location-error" role="alert" className="mt-1 text-xs text-destructive">{errors.location}</p>}
                </div>
                <div data-field="nationality">
                  <Label htmlFor="nationality" className="text-sm">Nationality <span className="text-destructive">*</span></Label>
                  <div className="mt-1.5">
                    <NationalitySelect
                      id="nationality"
                      errorId="nationality-error"
                      value={formData.nationality}
                      onChange={(v) => setFormData({ ...formData, nationality: v })}
                      error={errors.nationality}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="linkedin" className="text-sm">LinkedIn Profile</Label>
                  <Input id="linkedin" placeholder="https://linkedin.com/in/..." {...field("linkedin", formData.linkedin)} className="mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="portfolio" className="text-sm">Portfolio / Website</Label>
                  <Input id="portfolio" placeholder="https://..." {...field("portfolio", formData.portfolio)} className="mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="coverLetter" className="text-sm">Cover Letter</Label>
                  <Textarea
                    id="coverLetter"
                    placeholder="Tell us why you're interested in this role..."
                    {...field("coverLetter", formData.coverLetter)}
                    className="mt-1.5 min-h-[120px]"
                  />
                </div>
              </div>
            </motion.div>

            {/* ── Card 2: CV Upload ── */}
            <motion.div
              className="rounded-2xl border border-border bg-card p-6 light-glow sm:p-8"
              initial="hidden"
              animate="show"
              variants={fadeUp}
              data-field="cv"
            >
              <h2 className="text-lg font-bold tracking-tight">Upload CV / Resume</h2>
              <p className="mb-5 mt-1 text-sm text-muted-foreground">PDF, DOC, DOCX · Max 10MB</p>

              {cvFile ? (
                <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <FileText className="h-8 w-8 flex-shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{cvFile.name}</p>
                    <p className="text-xs text-muted-foreground">{cvFile.size < 1024 * 1024 ? `${(cvFile.size / 1024).toFixed(1)} KB` : `${(cvFile.size / 1024 / 1024).toFixed(2)} MB`}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove uploaded CV"
                    onClick={() => { setCvFile(null); setCvError(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className={`w-full rounded-xl border-2 border-dashed p-10 text-center transition-all hover:bg-muted/50 ${
                    cvError ? "border-destructive" : errors.cv ? "border-destructive/60" : "border-border hover:border-primary/40"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload your CV"
                  aria-invalid={!!cvError || !!errors.cv}
                  aria-describedby={cvError ? "cv-error" : errors.cv ? "cv-error" : undefined}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
                  <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
                  <p className="mb-1 text-sm font-medium">Click to upload your CV</p>
                  <p className="text-xs text-muted-foreground">PDF, DOC, DOCX · Max 10MB</p>
                </button>
              )}
              {/* Inline validation feedback — surfaced immediately on file rejection */}
              {cvError && <p id="cv-error" className="mt-2 text-xs text-destructive" role="alert">{cvError}</p>}
              {errors.cv && !cvError && <p id="cv-error" role="alert" className="mt-2 text-xs text-destructive">{errors.cv}</p>}
            </motion.div>

            {/* ── Card 3: Screening Questions ── */}
            {(job.screeningQuestions ?? []).length > 0 && (
              <motion.div
                className="rounded-2xl border border-border bg-card p-6 light-glow sm:p-8"
                initial="hidden"
                animate="show"
                variants={fadeUp}
              >
                <h2 className="text-lg font-bold tracking-tight">Screening Questions</h2>
                <p className="mb-6 mt-1 text-sm text-muted-foreground">Help us understand your fit for this role.</p>

                <div className="space-y-6">
                  {(job.screeningQuestions ?? []).map((q, idx) => (
                    <div key={q.id} data-field={`sq_${q.id}`} className={idx > 0 ? "border-t border-border pt-6" : ""}>
                      <Label htmlFor={`sq-${q.id}`} className="text-sm font-medium">
                        {q.question} {q.required && <span className="text-destructive">*</span>}
                      </Label>
                      {q.type === "short_text" && (
                        <Input
                          id={`sq-${q.id}`}
                          value={screeningAnswers[q.id] || ""}
                          onChange={(e) => setScreeningAnswers({ ...screeningAnswers, [q.id]: e.target.value })}
                          className="mt-2"
                          aria-invalid={!!errors[`sq_${q.id}`]}
                          aria-describedby={errors[`sq_${q.id}`] ? `sq-${q.id}-error` : undefined}
                        />
                      )}
                      {q.type === "long_text" && (
                        <Textarea
                          id={`sq-${q.id}`}
                          value={screeningAnswers[q.id] || ""}
                          onChange={(e) => setScreeningAnswers({ ...screeningAnswers, [q.id]: e.target.value })}
                          className="mt-2 min-h-[100px]"
                          aria-invalid={!!errors[`sq_${q.id}`]}
                          aria-describedby={errors[`sq_${q.id}`] ? `sq-${q.id}-error` : undefined}
                        />
                      )}
                      {q.type === "number" && (
                        <Input
                          id={`sq-${q.id}`}
                          type="number"
                          value={screeningAnswers[q.id] || ""}
                          onChange={(e) => setScreeningAnswers({ ...screeningAnswers, [q.id]: e.target.value })}
                          className="mt-2"
                          aria-invalid={!!errors[`sq_${q.id}`]}
                          aria-describedby={errors[`sq_${q.id}`] ? `sq-${q.id}-error` : undefined}
                        />
                      )}
                      {q.type === "yes_no" && (
                        <RadioGroup
                          value={screeningAnswers[q.id] || ""}
                          onValueChange={(v) => setScreeningAnswers({ ...screeningAnswers, [q.id]: v })}
                          className="mt-3 flex gap-6"
                        >
                          {["Yes", "No"].map((opt) => (
                            <label
                              key={opt}
                              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-2.5 transition-all ${
                                screeningAnswers[q.id] === opt
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/30"
                              }`}
                            >
                              <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                              <span className="text-sm">{opt}</span>
                            </label>
                          ))}
                        </RadioGroup>
                      )}
                      {q.type === "multiple_choice" && q.options && (
                        <RadioGroup
                          value={screeningAnswers[q.id] || ""}
                          onValueChange={(v) => setScreeningAnswers({ ...screeningAnswers, [q.id]: v })}
                          className="mt-3 space-y-2"
                        >
                          {q.options.map((opt) => (
                            <label
                              key={opt}
                              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-2.5 transition-all ${
                                screeningAnswers[q.id] === opt
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/30"
                              }`}
                            >
                              <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                              <span className="text-sm">{opt}</span>
                            </label>
                          ))}
                        </RadioGroup>
                      )}
                      {errors[`sq_${q.id}`] && <p id={`sq-${q.id}-error`} role="alert" className="mt-1.5 text-xs text-destructive">{errors[`sq_${q.id}`]}</p>}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Submit Button ── */}
            <div className="pt-2">
              <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ApplyPage;
