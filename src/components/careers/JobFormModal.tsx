import { useState } from "react";
import { DEFAULT_AI_WEIGHTS, type AIScoringWeights } from "@/types/careers";
import { X, Plus, Trash2, Upload, FileText, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { departments, jobTypes } from "@/data/jobs";
import type { Job, ScreeningQuestion } from "@/types/careers";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AIJobAssistModal from "./AIJobAssistModal";
import lumofyLogo from "@/assets/lumofy-logo.jpg";

interface JobFormModalProps {
  job?: Job | null;
  onSave: (job: Job) => void;
  onClose: () => void;
  sessionToken: string;
}

const allDepartments = [
  ...new Set([
    ...departments,
    "Human Resources",
    "Marketing",
    "Operations",
    "Customer Success",
    "Product",
    "Engineering",
    "Finance",
    "Sales",
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
  screeningQuestions: [],
};

const JobFormModal = ({ job, onSave, onClose, sessionToken }: JobFormModalProps) => {
  const isEdit = !!job;
  const [form, setForm] = useState<Omit<Job, "id">>(() => {
    if (job) {
      const { id, ...rest } = job;
      return rest;
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

  // JD file state
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdFileName, setJdFileName] = useState(job?.jdFileName || "");
  const [jdFilePath, setJdFilePath] = useState(job?.jdFilePath || "");
  const [jdUploading, setJdUploading] = useState(false);

  // AI modal state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalType, setAiModalType] = useState<
    "summary" | "description" | "requirements" | "responsibilities" | "screening_questions"
  >("summary");

  const setField = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateListItem = (field: "responsibilities" | "requirements", index: number, value: string) => {
    setForm((prev) => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const addListItem = (field: "responsibilities" | "requirements") => {
    setForm((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  };

  const removeListItem = (field: "responsibilities" | "requirements", index: number) => {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const addScreeningQuestion = () => {
    setScreeningQuestions((prev) => [
      ...prev,
      { id: `sq_${Date.now()}`, question: "", type: "short_text", required: false },
    ]);
  };

  const updateQuestion = (index: number, updates: Partial<ScreeningQuestion>) => {
    setScreeningQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...updates } : q)));
  };

  const removeQuestion = (index: number) => {
    setScreeningQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // JD file upload handler
  const handleJdFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_JD_TYPES.includes(file.type)) {
      toast.error("Only PDF, DOC, DOCX files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }

    setJdFile(file);
    setJdFileName(file.name);
  };

  const uploadJdFile = async (jobId: string): Promise<{ path: string; name: string; size: number } | null> => {
    if (!jdFile) return jdFilePath ? { path: jdFilePath, name: jdFileName, size: 0 } : null;

    setJdUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", jdFile);
      formData.append("jobId", jobId);
      formData.append("contentType", jdFile.type);
      formData.append("sessionToken", sessionToken);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-jd`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await response.json();
      return { path: data.storagePath, name: data.fileName, size: data.fileSize };
    } catch (err: any) {
      toast.error(err.message || "Failed to upload JD");
      return null;
    } finally {
      setJdUploading(false);
    }
  };

  const removeJdFile = () => {
    setJdFile(null);
    setJdFileName("");
    setJdFilePath("");
  };

  const openAiModal = (
    type: "summary" | "description" | "requirements" | "responsibilities" | "screening_questions",
  ) => {
    if (type === "screening_questions" && !jdFilePath && !jdFile) {
      toast.error("Upload the Job Description (PDF) to generate screening questions.");
      return;
    }
    if ((type === "summary" || type === "description") && (!form.title || !form.department)) {
      toast.error("Job Title and Department are required for AI generation.");
      return;
    }
    setAiModalType(type);
    setAiModalOpen(true);
  };

  const handleSave = async (status: Job["status"]) => {
    if (!form.title.trim()) {
      toast.error("Job title is required");
      return;
    }
    if (!form.department) {
      toast.error("Department is required");
      return;
    }

    const jobId = job?.id || `job_${Date.now()}`;

    // Upload JD file if new
    const jdResult = await uploadJdFile(jobId);

    const salaryRange =
      salaryEnabled && salaryMin && salaryMax && showSalary
        ? `${Number(salaryMin).toLocaleString()} - ${Number(salaryMax).toLocaleString()}`
        : undefined;

    const finalJob: Job = {
      id: jobId,
      ...form,
      status,
      salaryRange,
      salaryCurrency: salaryEnabled ? salaryCurrency : undefined,
      responsibilities: form.responsibilities.filter((r) => r.trim()),
      requirements: form.requirements.filter((r) => r.trim()),
      benefits: [],
      screeningQuestions,
      postedDate: job?.postedDate || new Date().toISOString().split("T")[0],
      jdFileName: jdResult?.name || jdFileName || undefined,
      jdFilePath: jdResult?.path || jdFilePath || undefined,
      jdFileSize: jdResult?.size || undefined,
      jdFileUploadedAt: jdResult ? new Date().toISOString() : job?.jdFileUploadedAt,
      aiScoringWeights: aiWeights,
    };

    onSave(finalJob);
  };

  const jobDataForAI = {
    title: form.title,
    department: form.department,
    location: form.location,
    type: form.type,
    summary: form.summary,
    description: form.description,
    responsibilities: form.responsibilities.filter((r) => r.trim()),
    requirements: form.requirements.filter((r) => r.trim()),
    jdFilePath: jdFilePath || undefined,
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 pt-10 pb-10">
        <div className="w-full max-w-3xl rounded-2xl bg-card border border-border shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{isEdit ? "Edit Job" : "Add New Job"}</h2>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <img src={lumofyLogo} alt="" className="w-3.5 h-3.5 rounded" />
                AI by Lumofy
              </span>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* JD File Upload */}
          <div className="rounded-xl bg-secondary/50 border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Job Description (PDF)
              </Label>
            </div>
            {jdFileName ? (
              <div className="flex items-center gap-3 rounded-lg bg-card border border-border p-3">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{jdFileName}</p>
                  {jdFile && <p className="text-xs text-muted-foreground">{(jdFile.size / 1024).toFixed(0)} KB</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={removeJdFile}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer">
                <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Upload Job Description</span>
                <span className="text-xs text-muted-foreground mt-0.5">PDF, DOC, DOCX – Max 10MB</span>
                <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleJdFileSelect} />
              </label>
            )}
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Job Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  className="bg-secondary border-border mt-1"
                />
              </div>
              <div>
                <Label>Department *</Label>
                <Select value={form.department} onValueChange={(v) => setField("department", v)}>
                  <SelectTrigger className="bg-secondary border-border mt-1">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {allDepartments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setField("location", e.target.value)}
                  className="bg-secondary border-border mt-1"
                />
              </div>
              <div>
                <Label>Employment Type</Label>
                <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                  <SelectTrigger className="bg-secondary border-border mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Full-time", "Part-time", "Contract", "Internship"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Summary with AI */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Summary</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs gap-1"
                  onClick={() => openAiModal("summary")}
                  disabled={!form.title || !form.department}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Write with AI
                </Button>
              </div>
              <Textarea
                value={form.summary}
                onChange={(e) => setField("summary", e.target.value)}
                className="bg-secondary border-border min-h-[60px]"
                placeholder="Brief summary for job cards..."
              />
            </div>
            {/* About the Role with AI */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>About the Role</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs gap-1"
                  onClick={() => openAiModal("description")}
                  disabled={!form.title || !form.department}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Write with AI
                </Button>
              </div>
              <Textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className="bg-secondary border-border min-h-[100px]"
                placeholder="Detailed description about the role..."
              />
            </div>
            {/* Responsibilities with AI */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Key Responsibilities</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary text-xs gap-1"
                    onClick={() => openAiModal("responsibilities")}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate with AI
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => addListItem("responsibilities")}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
              {form.responsibilities.map((r, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input
                    value={r}
                    onChange={(e) => updateListItem("responsibilities", i, e.target.value)}
                    className="bg-secondary border-border"
                  />
                  {form.responsibilities.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeListItem("responsibilities", i)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {/* Requirements with AI */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Requirements</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary text-xs gap-1"
                    onClick={() => openAiModal("requirements")}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate with AI
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => addListItem("requirements")}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
              {form.requirements.map((r, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input
                    value={r}
                    onChange={(e) => updateListItem("requirements", i, e.target.value)}
                    className="bg-secondary border-border"
                  />
                  {form.requirements.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeListItem("requirements", i)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Salary */}
            <div className="rounded-xl bg-secondary/50 border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Optional Salary Range</Label>
                <Switch checked={salaryEnabled} onCheckedChange={setSalaryEnabled} />
              </div>
              {salaryEnabled && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Min</Label>
                      <Input
                        type="number"
                        value={salaryMin}
                        onChange={(e) => setSalaryMin(e.target.value)}
                        className="bg-secondary border-border mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Max</Label>
                      <Input
                        type="number"
                        value={salaryMax}
                        onChange={(e) => setSalaryMax(e.target.value)}
                        className="bg-secondary border-border mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Currency</Label>
                      <Select value={salaryCurrency} onValueChange={(v) => setSalaryCurrency(v as "BHD" | "USD")}>
                        <SelectTrigger className="bg-secondary border-border mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BHD">BHD</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
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
            {/* Screening Questions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Screening Questions</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary text-xs gap-1"
                    onClick={() => openAiModal("screening_questions")}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate with AI
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={addScreeningQuestion}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Question
                  </Button>
                </div>
              </div>
              {screeningQuestions.map((q, i) => (
                <div key={q.id} className="rounded-lg bg-secondary/50 border border-border p-3 mb-2 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={q.question}
                      onChange={(e) => updateQuestion(i, { question: e.target.value })}
                      placeholder="Question text..."
                      className="bg-secondary border-border"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeQuestion(i)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex gap-3 items-center">
                    <Select
                      value={q.type}
                      onValueChange={(v) => updateQuestion(i, { type: v as ScreeningQuestion["type"] })}
                    >
                      <SelectTrigger className="w-40 bg-secondary border-border text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
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
                    <Input
                      placeholder="Options (comma separated)"
                      value={q.options?.join(", ") || ""}
                      onChange={(e) =>
                        updateQuestion(i, {
                          options: e.target.value
                            .split(",")
                            .map((o) => o.trim())
                            .filter(Boolean),
                        })
                      }
                      className="bg-secondary border-border text-xs"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Scoring Weights */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Scoring Configuration
            </Label>
            <p className="text-xs text-muted-foreground mb-3">Adjust how AI weighs each dimension when ranking candidates.</p>
            <div className="space-y-3 bg-secondary/50 rounded-lg p-4">
              {([
                { key: "skills" as const, label: "Required Skills" },
                { key: "tools" as const, label: "Tools & Technologies" },
                { key: "experience" as const, label: "Relevant Experience" },
                { key: "industry" as const, label: "Industry Match" },
                { key: "education" as const, label: "Education" },
                { key: "stability" as const, label: "Career Stability" },
              ]).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-36">{label}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={aiWeights[key]}
                    onChange={(e) => {
                      const newVal = Number(e.target.value);
                      const oldVal = aiWeights[key];
                      const diff = newVal - oldVal;
                      const otherKeys = (["skills","tools","experience","industry","education","stability"] as const).filter(k => k !== key);
                      const otherTotal = otherKeys.reduce((s, k) => s + aiWeights[k], 0);
                      if (otherTotal === 0 && diff > 0) return;
                      const updated = { ...aiWeights, [key]: newVal };
                      otherKeys.forEach(k => {
                        updated[k] = Math.max(0, Math.round(aiWeights[k] - (diff * aiWeights[k] / (otherTotal || 1))));
                      });
                      const total = Object.values(updated).reduce((a: number, b: number) => a + b, 0);
                      if (total !== 100) {
                        const largest = otherKeys.sort((a, b) => updated[b] - updated[a])[0];
                        updated[largest] += 100 - total;
                      }
                      setAiWeights(updated);
                    }}
                    className="flex-1 h-1.5 accent-[hsl(var(--primary))]"
                  />
                  <span className="text-xs font-bold w-8 text-right">{aiWeights[key]}%</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-border text-xs">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-emerald-400">
                  {Object.values(aiWeights).reduce((a: number, b: number) => a + b, 0)}%
                </span>
              </div>
            </div>
          </div>


          <div className="flex items-center justify-between p-6 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSave("closed")} disabled={jdUploading}>
                {jdUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save as Draft
              </Button>
              <Button onClick={() => handleSave("open")} disabled={jdUploading}>
                {jdUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {isEdit ? "Update & Publish" : "Publish Job"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Modal */}
      <AIJobAssistModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        type={aiModalType}
        sessionToken={sessionToken}
        jobData={jobDataForAI}
        onInsertSummary={(s) => setField("summary", s)}
        onInsertDescription={(s) => setField("description", s)}
        onInsertRequirements={(items) =>
          setForm((prev) => ({ ...prev, requirements: [...prev.requirements.filter((r) => r.trim()), ...items] }))
        }
        onInsertResponsibilities={(items) =>
          setForm((prev) => ({
            ...prev,
            responsibilities: [...prev.responsibilities.filter((r) => r.trim()), ...items],
          }))
        }
        onInsertQuestions={(qs) => setScreeningQuestions((prev) => [...prev, ...qs])}
      />
    </>
  );
};

export default JobFormModal;
