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
import type { Applicant } from "@/types/careers";

// ── Progress Steps ──
const STEPS = [
  { label: "Personal Info", icon: User },
  { label: "Upload CV", icon: FileText },
  { label: "Questions", icon: HelpCircle },
];

function ProgressIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === current;
        const isDone = i < current;
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : isDone
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[11px] mt-1.5 ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-16 sm:w-24 h-0.5 mx-2 mb-5 ${isDone ? "bg-primary/40" : "bg-border"}`} />
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
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
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
      <div
        className={`flex h-10 w-full items-center rounded-md border bg-secondary px-3 py-2 text-sm cursor-pointer transition-colors ${
          error ? "border-destructive/50" : "border-border"
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
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-64 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-border">
              <Input
                ref={inputRef}
                placeholder="Search nationality..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 bg-background"
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground text-center">No results found</p>
              ) : (
                filtered.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${
                      n === value ? "bg-primary/10 text-primary font-medium" : ""
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
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
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
        <div className="pt-24 text-center text-muted-foreground">
          <p>Job not found.</p>
          <Link to="/" className="text-primary hover:underline mt-2 inline-block">Back to positions</Link>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setCvError("");
    if (!file) return;
    const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) { setCvError("Please upload a PDF, DOC, or DOCX file."); return; }
    if (file.size > 10 * 1024 * 1024) { setCvError("File size must be under 10MB."); return; }
    setCvFile(file);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) errs.fullName = "Full name is required";
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = "Valid email is required";
    if (!formData.phone.trim()) errs.phone = "Phone number is required";
    if (!formData.location.trim()) errs.location = "Location is required";
    if (!formData.nationality.trim()) errs.nationality = "Please select your nationality";
    if (!cvFile) errs.cv = "CV/Resume is required";
    job.screeningQuestions.forEach((q) => {
      if (q.required && !screeningAnswers[q.id]?.trim()) errs[`sq_${q.id}`] = "This question is required";
    });
    setErrors(errs);

    // Scroll to first error
    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      const el = document.querySelector(`[data-field="${firstKey}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
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

      await addApplicant(newApplicant);
      setSubmitted(true);
      toast.success("Application submitted successfully!");

      // Fire-and-forget: trigger automatic AI analysis
      supabase.functions.invoke("auto-analyze-applicant", {
        body: { applicantId },
      }).catch((err) => {
        import.meta.env.DEV && console.warn("Auto-analyze trigger failed (non-blocking):", err);
      });
    } catch (err: any) {
      import.meta.env.DEV && console.error("Submit error:", err);
      const msg = err?.message || "";
      if (msg.includes("row-level security") || msg.includes("RLS")) {
        toast.error("We could not submit your application. Please try again later.");
      } else if (msg.includes("duplicate")) {
        toast.error("It looks like you've already applied for this position.");
      } else if (msg.includes("violates")) {
        toast.error("Please complete all required fields correctly.");
      } else {
        toast.error(msg || "We could not submit your application. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 pb-20 px-4 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Application Submitted!</h1>
            <p className="text-muted-foreground mb-6">
              Thank you for applying to <strong>{job.title}</strong> at Lumofy. We'll review your application and get back to you soon.
            </p>
            <Button onClick={() => navigate("/")} size="lg">Back to Careers</Button>
          </motion.div>
        </div>
      </div>
    );
  }

  const field = (key: string, val: string) => ({ value: val, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, [key]: e.target.value }) });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-[960px] mx-auto">
          <Link to={`/jobs/${job.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to {job.title}
          </Link>

          {/* Job header */}
          <motion.div className="rounded-2xl bg-card border border-border p-6 sm:p-8 mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Apply for {job.title}</h1>
                <p className="text-muted-foreground text-sm">{job.department} · {job.location}</p>
              </div>
            </div>
          </motion.div>

          {/* Progress */}
          <ProgressIndicator current={activeStep} />

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ── Card 1: Personal Information ── */}
            <motion.div
              className="rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-sm"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <h2 className="text-lg font-semibold mb-1">Personal Information</h2>
              <p className="text-sm text-muted-foreground mb-6">Tell us about yourself and how we can reach you.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <div data-field="fullName">
                  <Label className="text-sm">Full Name <span className="text-destructive">*</span></Label>
                  <Input {...field("fullName", formData.fullName)} className="bg-secondary border-border mt-1.5" />
                  {errors.fullName && <p className="text-destructive text-xs mt-1">{errors.fullName}</p>}
                </div>
                <div data-field="email">
                  <Label className="text-sm">Email <span className="text-destructive">*</span></Label>
                  <Input type="email" {...field("email", formData.email)} className="bg-secondary border-border mt-1.5" />
                  {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
                </div>
                <div data-field="phone">
                  <Label className="text-sm">Phone <span className="text-destructive">*</span></Label>
                  <Input {...field("phone", formData.phone)} className="bg-secondary border-border mt-1.5" />
                  {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone}</p>}
                </div>
                <div data-field="location">
                  <Label className="text-sm">Current Location <span className="text-destructive">*</span></Label>
                  <Input {...field("location", formData.location)} className="bg-secondary border-border mt-1.5" />
                  {errors.location && <p className="text-destructive text-xs mt-1">{errors.location}</p>}
                </div>
                <div data-field="nationality">
                  <Label className="text-sm">Nationality <span className="text-destructive">*</span></Label>
                  <div className="mt-1.5">
                    <NationalitySelect
                      value={formData.nationality}
                      onChange={(v) => setFormData({ ...formData, nationality: v })}
                      error={errors.nationality}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">LinkedIn Profile</Label>
                  <Input placeholder="https://linkedin.com/in/..." {...field("linkedin", formData.linkedin)} className="bg-secondary border-border mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm">Portfolio / Website</Label>
                  <Input placeholder="https://..." {...field("portfolio", formData.portfolio)} className="bg-secondary border-border mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm">Cover Letter</Label>
                  <Textarea
                    placeholder="Tell us why you're interested in this role..."
                    {...field("coverLetter", formData.coverLetter)}
                    className="bg-secondary border-border mt-1.5 min-h-[120px]"
                  />
                </div>
              </div>
            </motion.div>

            {/* ── Card 2: CV Upload ── */}
            <motion.div
              className="rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-sm"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              data-field="cv"
            >
              <h2 className="text-lg font-semibold mb-1">Upload CV / Resume</h2>
              <p className="text-sm text-muted-foreground mb-5">PDF, DOC, DOCX — Max 10MB</p>

              {cvFile ? (
                <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cvFile.name}</p>
                    <p className="text-xs text-muted-foreground">{cvFile.size < 1024 * 1024 ? `${(cvFile.size / 1024).toFixed(1)} KB` : `${(cvFile.size / 1024 / 1024).toFixed(2)} MB`}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setCvFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all hover:bg-secondary/50 ${
                    errors.cv ? "border-destructive/50" : "border-border hover:border-primary/40"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">Click to upload your CV</p>
                  <p className="text-xs text-muted-foreground">PDF, DOC, DOCX – Max 2MB</p>
                </div>
              )}
              {cvError && <p className="text-destructive text-xs mt-2">{cvError}</p>}
              {errors.cv && !cvError && <p className="text-destructive text-xs mt-2">{errors.cv}</p>}
            </motion.div>

            {/* ── Card 3: Screening Questions ── */}
            {job.screeningQuestions.length > 0 && (
              <motion.div
                className="rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-sm"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h2 className="text-lg font-semibold mb-1">Screening Questions</h2>
                <p className="text-sm text-muted-foreground mb-6">Help us understand your fit for this role.</p>

                <div className="space-y-6">
                  {job.screeningQuestions.map((q, idx) => (
                    <div key={q.id} data-field={`sq_${q.id}`} className={idx > 0 ? "pt-6 border-t border-border" : ""}>
                      <Label className="text-sm font-medium">
                        {q.question} {q.required && <span className="text-destructive">*</span>}
                      </Label>
                      {q.type === "short_text" && (
                        <Input
                          value={screeningAnswers[q.id] || ""}
                          onChange={(e) => setScreeningAnswers({ ...screeningAnswers, [q.id]: e.target.value })}
                          className="bg-secondary border-border mt-2"
                        />
                      )}
                      {q.type === "long_text" && (
                        <Textarea
                          value={screeningAnswers[q.id] || ""}
                          onChange={(e) => setScreeningAnswers({ ...screeningAnswers, [q.id]: e.target.value })}
                          className="bg-secondary border-border mt-2 min-h-[100px]"
                        />
                      )}
                      {q.type === "number" && (
                        <Input
                          type="number"
                          value={screeningAnswers[q.id] || ""}
                          onChange={(e) => setScreeningAnswers({ ...screeningAnswers, [q.id]: e.target.value })}
                          className="bg-secondary border-border mt-2"
                        />
                      )}
                      {q.type === "yes_no" && (
                        <RadioGroup
                          value={screeningAnswers[q.id] || ""}
                          onValueChange={(v) => setScreeningAnswers({ ...screeningAnswers, [q.id]: v })}
                          className="flex gap-6 mt-3"
                        >
                          {["Yes", "No"].map((opt) => (
                            <label
                              key={opt}
                              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border cursor-pointer transition-all ${
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
                          className="space-y-2 mt-3"
                        >
                          {q.options.map((opt) => (
                            <label
                              key={opt}
                              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border cursor-pointer transition-all ${
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
                      {errors[`sq_${q.id}`] && <p className="text-destructive text-xs mt-1.5">{errors[`sq_${q.id}`]}</p>}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Submit Button ── */}
            <div className="pt-2">
              <Button type="submit" size="lg" className="w-full h-[52px] text-base shadow-md" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplyPage;
