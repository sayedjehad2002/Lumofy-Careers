import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import {
  Search, Upload, FolderTree, ChevronRight, ChevronDown,
  Download, Brain, Pencil, Loader2, X, Tag, FileText,
  AlertCircle, Check, Archive, RefreshCw, User, Mail, Phone,
  Globe, MapPin, Briefcase, Filter, ArrowUpDown, Plus,
  Shield, TrendingUp, Target, BarChart3,
  AlertTriangle, History, Trash2
} from "lucide-react";
import SmartSearch, { parseQuery, type ParsedQuery } from "./cvlibrary/SmartSearch";
import SavedFilters, { type SavedFilter } from "./cvlibrary/SavedFilters";
import DuplicateDetection from "./cvlibrary/DuplicateDetection";
const TalentPoolInsights = lazy(() => import("./cvlibrary/TalentPoolInsights")); // lazy: defers recharts to the Insights sub-tab
import AIJobMatching from "./cvlibrary/AIJobMatching";
import BulkReparse from "./cvlibrary/BulkReparse";
import CandidateTags from "./cvlibrary/CandidateTags";
import PipelineIntegration from "./cvlibrary/PipelineIntegration";
const ExportReporting = lazy(() => import("./cvlibrary/ExportReporting")); // lazy: defers xlsx (~94KB) to the Export sub-tab
import DataCompleteness from "./cvlibrary/DataCompleteness";
import GDPRRetention from "./cvlibrary/GDPRRetention";
import AuditTrail, { type AuditEntry } from "./cvlibrary/AuditTrail";
import TrashBin from "./cvlibrary/TrashBin";
import CandidateAnalysis, { type CVAIAnalysis } from "./cvlibrary/CandidateAnalysis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TONE_SOFT, TONE_TEXT, TONE_BORDER, scoreTone } from "./statusColors";

interface CVCandidate {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  country: string | null;
  location: string | null;
  years_experience: string | null;
  skills: string[];
  industries: string[];
  roles_summary: string | null;
  tags: string[];
  status: string;
  resume_file_name: string;
  resume_file_path: string;
  resume_file_type: string | null;
  resume_file_size: number | null;
  extracted_text: string | null;
  suggested_department: string | null;
  suggested_job_title: string | null;
  classification_confidence: string | null;
  classification_reasoning: string | null;
  classification_evidence: string[];
  suggested_department_2: string | null;
  suggested_job_title_2: string | null;
  classification_confidence_2: string | null;
  manual_department: string | null;
  manual_job_title: string | null;
  manual_overrides: Record<string, any>;
  uploaded_at: string;
  updated_at: string;
  ai_analysis: CVAIAnalysis | null;
}

const DEPARTMENTS = [
  "Human Resources", "Customer Success", "Account Management", "Client Services",
  "Customer Experience", "Sales", "Revenue Operations", "Product", "Engineering",
  "Data & Analytics", "Marketing", "Finance", "Operations", "Project Management", "Design",
];

const CV_STATUSES = [
  { value: "new", label: "New", color: "bg-[hsl(var(--chart-1)/0.2)] text-[hsl(var(--chart-1))]" },
  { value: "reviewed", label: "Reviewed", color: TONE_SOFT.warning },
  { value: "shortlisted", label: "Shortlisted", color: TONE_SOFT.success },
  { value: "archived", label: "Archived", color: "bg-muted text-muted-foreground" },
];

const CONFIDENCE_COLORS: Record<string, string> = {
  High: TONE_SOFT.success,
  Medium: TONE_SOFT.warning,
  Low: TONE_SOFT.danger,
};

const RECOMMENDATION_COLORS: Record<string, string> = {
  "Fast-Track to Interview": `${TONE_SOFT.success} ${TONE_BORDER.success}`,
  "Proceed to Next Stage": "bg-[hsl(var(--chart-1)/0.2)] text-[hsl(var(--chart-1))] border-[hsl(var(--chart-1)/0.3)]",
  "Hold for Review": `${TONE_SOFT.warning} ${TONE_BORDER.warning}`,
  "Not Recommended": `${TONE_SOFT.danger} ${TONE_BORDER.danger}`,
};

type CVSubTab = "library" | "duplicates" | "insights" | "matching" | "reparse" | "export" | "completeness" | "gdpr" | "audit" | "trash";

interface Props {
  sessionToken: string;
  jobs?: { id: string; title: string; department: string; status: string; requirements: string[] }[];
  onSessionExpired?: () => void;
}

export default function CVLibrary({ sessionToken, jobs = [], onSessionExpired }: Props) {
  const [candidates, setCandidates] = useState<CVCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterConfidence, setFilterConfidence] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedCandidate, setSelectedCandidate] = useState<CVCandidate | null>(null);
  const [editCandidate, setEditCandidate] = useState<CVCandidate | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [folderOpen, setFolderOpen] = useState<Record<string, boolean>>({});
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [subTab, setSubTab] = useState<CVSubTab>("library");
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery>({ include: [], exclude: [], raw: "" });
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  const addAudit = useCallback((candidateId: string, candidateName: string, action: AuditEntry["action"], details?: string) => {
    setAuditLog(prev => [{
      id: crypto.randomUUID(),
      candidateId,
      candidateName,
      action,
      details,
      timestamp: new Date().toISOString(),
    }, ...prev].slice(0, 500));
  }, []);

  const fetchCandidates = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("cv-library-manage", {
        body: { action: "list", sessionToken },
      });
      if (error) {
        // Check for session expiry
        if (error.message?.includes("401") || error.message?.includes("non-2xx") || (data && data.error?.includes("expired"))) {
          onSessionExpired?.();
          return;
        }
        throw error;
      }
      if (data?.error?.includes("expired") || data?.error?.includes("Unauthorized")) {
        onSessionExpired?.();
        return;
      }
      const normalized = (data.candidates || []).map((c: any) => ({
        ...c,
        skills: c.skills || [],
        industries: c.industries || [],
        tags: c.tags || [],
        classification_evidence: c.classification_evidence || [],
        manual_overrides: c.manual_overrides || {},
      }));
      setCandidates(normalized);
      return normalized as CVCandidate[];
    } catch (e) {
      import.meta.env.DEV && console.error("Fetch error:", e);
      toast.error("Failed to load CV library");
    } finally {
      setLoading(false);
    }
  }, [sessionToken, onSessionExpired]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("sessionToken", sessionToken);
      for (let i = 0; i < files.length; i++) {
        formData.append(`file${i}`, files[i]);
      }

      const url = `${SUPABASE_URL}/functions/v1/cv-library-upload`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
        body: formData,
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Upload failed");

      toast.success(`Uploaded ${result.uploaded.length} CV(s)${result.errors.length > 0 ? `, ${result.errors.length} failed` : ""}`);

      await fetchCandidates();

      for (const uploaded of result.uploaded) {
        processCandidate(uploaded.id);
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const processCandidate = async (candidateId: string) => {
    setProcessingIds(prev => new Set(prev).add(candidateId));
    try {
      // Step 1: Parse CV
      const { error: parseErr } = await supabase.functions.invoke("cv-library-parse", {
        body: { candidateId, sessionToken },
      });
      if (parseErr) import.meta.env.DEV && console.error("Parse error:", parseErr);

      // Step 2: Classify
      const { error: classErr } = await supabase.functions.invoke("cv-library-classify", {
        body: { candidateId, sessionToken },
      });
      if (classErr) import.meta.env.DEV && console.error("Classify error:", classErr);

      // Step 3: AI Analysis
      await runAIAnalysis(candidateId);

      // Refresh the open profile too — parse/classify update the DB + list, not
      // the already-open selectedCandidate, so without this its header + AI
      // Classification would show stale "Unknown / Not extracted" after analysis.
      const fresh = await fetchCandidates();
      const updated = fresh?.find((c) => c.id === candidateId);
      if (updated) {
        setSelectedCandidate((prev) =>
          prev && prev.id === candidateId
            ? { ...updated, ai_analysis: updated.ai_analysis ?? prev.ai_analysis }
            : prev
        );
      }
    } catch (e) {
      import.meta.env.DEV && console.error("Processing error:", e);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
    }
  };

  const runAIAnalysis = async (candidateId: string) => {
    setAnalyzingIds(prev => new Set(prev).add(candidateId));
    try {
      const { data, error } = await supabase.functions.invoke("cv-library-analyze", {
        body: { candidateId, sessionToken },
      });
      if (error) throw error;
      if (data?.analysis) {
        setCandidates(prev => prev.map(c =>
          c.id === candidateId ? { ...c, ai_analysis: data.analysis } : c
        ));
        setSelectedCandidate(prev =>
          prev?.id === candidateId ? { ...prev, ai_analysis: data.analysis } : prev
        );
      }
    } catch (e: any) {
      import.meta.env.DEV && console.error("AI analysis error:", e);
      toast.error("AI analysis failed");
    } finally {
      setAnalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
    }
  };

  const handleDownload = async (candidateId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("cv-library-manage", {
        body: { action: "download", sessionToken, candidateId },
      });
      if (error) throw error;
      window.open(data.url, "_blank");
    } catch {
      toast.error("Download failed");
    }
  };

  const handleUpdateCandidate = async (candidateId: string, updates: Record<string, any>) => {
    try {
      const existing = candidates.find((c) => c.id === candidateId);
      const manualOverrides = {
        ...(existing?.manual_overrides || {}),
        ...(updates.manual_overrides || {}),
      };

      const overrideFields = ["name", "email", "phone", "nationality", "country", "location", "years_experience", "status"];
      for (const field of overrideFields) {
        if (field in updates) {
          manualOverrides[field] = true;
        }
      }

      if ("manual_department" in updates || "suggested_department" in updates) manualOverrides.department = true;
      if ("manual_job_title" in updates || "suggested_job_title" in updates) manualOverrides.job_title = true;

      const finalUpdates = {
        ...updates,
        manual_department: updates.manual_department ?? updates.suggested_department ?? null,
        manual_job_title: updates.manual_job_title ?? updates.suggested_job_title ?? null,
        manual_overrides: manualOverrides,
      };

      const { error } = await supabase.functions.invoke("cv-library-manage", {
        body: { action: "update", sessionToken, candidateId, updates: finalUpdates },
      });
      if (error) throw error;

      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, ...finalUpdates } : c)));
      setSelectedCandidate((prev) => (prev?.id === candidateId ? { ...prev, ...finalUpdates } : prev));
      await fetchCandidates();
      toast.success("Changes saved successfully");
      return true;
    } catch {
      toast.error("Update failed");
      return false;
    }
  };

  const handleDelete = async (candidateId: string) => {
    if (!confirm("Move this CV to Trash? You can restore it from the Trash tab, or delete it permanently there.")) return;
    try {
      const { error } = await supabase.functions.invoke("cv-library-manage", {
        body: { action: "delete", sessionToken, candidateId },
      });
      if (error) throw error;
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      if (selectedCandidate?.id === candidateId) setSelectedCandidate(null);
      toast.success("Moved to Trash");
    } catch {
      toast.error("Delete failed");
    }
  };

  // Build folder tree
  const folderTree = useMemo(() => {
    const tree: Record<string, Set<string>> = {};
    let unclassifiedCount = 0;
    candidates.forEach(c => {
      const dept = c.manual_department || c.suggested_department;
      const title = c.manual_job_title || c.suggested_job_title;
      if (!dept || c.classification_confidence === "Low") {
        unclassifiedCount++;
        return;
      }
      if (!tree[dept]) tree[dept] = new Set();
      if (title) tree[dept].add(title);
    });
    return { tree, unclassifiedCount };
  }, [candidates]);

  // Filtered and sorted candidates
  const filteredCandidates = useMemo(() => {
    let result = [...candidates];

    if (selectedFolder !== "all") {
      if (selectedFolder === "unclassified") {
        result = result.filter(c => {
          const dept = c.manual_department || c.suggested_department;
          return !dept || c.classification_confidence === "Low";
        });
      } else if (selectedFolder.includes("::")) {
        const [dept, title] = selectedFolder.split("::");
        result = result.filter(c => {
          const cDept = c.manual_department || c.suggested_department;
          const cTitle = c.manual_job_title || c.suggested_job_title;
          return cDept === dept && cTitle === title;
        });
      } else {
        result = result.filter(c => {
          const cDept = c.manual_department || c.suggested_department;
          return cDept === selectedFolder;
        });
      }
    }

    // Smart boolean search
    if (parsedQuery.include.length > 0 || parsedQuery.exclude.length > 0) {
      result = result.filter(c => {
        const text = [
          c.name, c.email, c.phone, c.nationality, c.country, c.location,
          c.roles_summary, c.suggested_department, c.suggested_job_title,
          c.manual_department, c.manual_job_title,
          ...(c.skills || []), ...(c.industries || []), ...(c.tags || []),
        ].filter(Boolean).join(" ").toLowerCase();

        const includeMatch = parsedQuery.include.every(term => text.includes(term));
        const excludeMatch = parsedQuery.exclude.some(term => text.includes(term));
        return includeMatch && !excludeMatch;
      });
    } else if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.name?.toLowerCase().includes(q)) ||
        (c.email?.toLowerCase().includes(q)) ||
        (c.phone?.includes(q)) ||
        (c.skills?.some(s => s.toLowerCase().includes(q))) ||
        (c.suggested_job_title?.toLowerCase().includes(q)) ||
        (c.suggested_department?.toLowerCase().includes(q))
      );
    }

    if (filterDept !== "all") result = result.filter(c => (c.manual_department || c.suggested_department) === filterDept);
    if (filterStatus !== "all") result = result.filter(c => c.status === filterStatus);
    if (filterConfidence !== "all") result = result.filter(c => c.classification_confidence === filterConfidence);

    switch (sortBy) {
      case "name": result.sort((a, b) => (a.name || "").localeCompare(b.name || "")); break;
      case "confidence": {
        const order = { High: 0, Medium: 1, Low: 2 };
        result.sort((a, b) => (order[a.classification_confidence as keyof typeof order] ?? 3) - (order[b.classification_confidence as keyof typeof order] ?? 3));
        break;
      }
      case "experience": result.sort((a, b) => parseFloat(b.years_experience || "0") - parseFloat(a.years_experience || "0")); break;
      default: result.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
    }

    return result;
  }, [candidates, selectedFolder, searchQuery, filterDept, filterStatus, filterConfidence, sortBy]);

  // ---- Sub-tab helpers (must be before early return) ----
  const handleSmartSearch = useCallback((query: string, parsed: ParsedQuery) => {
    setSearchQuery(query);
    setParsedQuery(parsed);
  }, []);

  const handleApplySavedFilter = useCallback((f: SavedFilter) => {
    setSearchQuery(f.searchQuery);
    setParsedQuery(parseQuery(f.searchQuery));
    setFilterDept(f.filterDept);
    setFilterStatus(f.filterStatus);
    setFilterConfidence(f.filterConfidence);
    setSortBy(f.sortBy);
    setSelectedFolder(f.selectedFolder);
    setSubTab("library");
    toast.success(`Applied filter: ${f.name}`);
  }, []);

  const handleUpdateTags = useCallback(async (candidateId: string, tags: string[]) => {
    await handleUpdateCandidate(candidateId, { tags });
    const name = candidates.find(c => c.id === candidateId)?.name || "Unknown";
    addAudit(candidateId, name, "tag_change", `Tags: ${tags.join(", ")}`);
  }, [candidates, handleUpdateCandidate, addAudit]);

  const handleViewFromSubTab = useCallback((candidateId: string) => {
    const c = candidates.find(c => c.id === candidateId);
    if (c) setSelectedCandidate(c);
  }, [candidates]);

  // ---- Candidate Profile View ----
  if (selectedCandidate) {
    const c = selectedCandidate;
    const dept = c.manual_department || c.suggested_department;
    const title = c.manual_job_title || c.suggested_job_title;
    const isProcessing = processingIds.has(c.id);
    const isAnalyzing = analyzingIds.has(c.id);
    const isBusy = isProcessing || isAnalyzing;
    const ai = c.ai_analysis;

    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => setSelectedCandidate(null)}>
          ← Back to CV library
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Candidate Info + AI Analysis */}
          <div className="lg:col-span-2 space-y-4">
            {/* Candidate Card */}
            <div className="rounded-2xl bg-card border border-border p-6 light-glow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold">{c.name || "Unknown Candidate"}</h1>
                  <p className="text-sm text-muted-foreground mt-1">{c.resume_file_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={CV_STATUSES.find(s => s.value === c.status)?.color || ""}>
                    {CV_STATUSES.find(s => s.value === c.status)?.label || c.status}
                  </Badge>
                  {c.classification_confidence && (
                    <Badge className={CONFIDENCE_COLORS[c.classification_confidence] || ""}>
                      {c.classification_confidence} Confidence
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={c.email} />
                <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={c.phone} />
                <InfoRow icon={<Globe className="w-4 h-4" />} label="Nationality" value={c.nationality} />
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="Country" value={c.country} />
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="Location" value={c.location} />
                <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Experience" value={c.years_experience ? `${c.years_experience} years` : null} />
              </div>

              {(c.skills || []).length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(c.skills || []).map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3">
                <CandidateTags candidateId={c.id} currentTags={c.tags || []} onUpdateTags={(cId, tags) => {
                  handleUpdateCandidate(cId, { tags });
                  addAudit(cId, c.name || "Unknown", "tag_change", `Tags: ${tags.join(", ")}`);
                }} />
              </div>

              {c.roles_summary && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Roles Summary</p>
                  <p className="text-sm">{c.roles_summary}</p>
                </div>
              )}
            </div>

            {/* AI Classification */}
            <div className="rounded-2xl bg-card border border-border p-6 light-glow">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" /> AI Classification
              </h3>
              {dept ? (
                <div className="space-y-4">
                  {/* Primary Suggestion */}
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">Best Fit</p>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Department</p>
                        <p className="font-medium">{dept}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Job Title</p>
                        <p className="font-medium">{title || "—"}</p>
                      </div>
                      {c.classification_confidence && (
                        <div>
                          <p className="text-xs text-muted-foreground">Confidence</p>
                          <Badge className={CONFIDENCE_COLORS[c.classification_confidence] || ""}>{c.classification_confidence}</Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Secondary Suggestion */}
                  {c.suggested_department_2 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">2nd Best Fit</p>
                      <div className="flex gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Department</p>
                          <p className="font-medium">{c.suggested_department_2}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Job Title</p>
                          <p className="font-medium">{c.suggested_job_title_2 || "—"}</p>
                        </div>
                        {c.classification_confidence_2 && (
                          <div>
                            <p className="text-xs text-muted-foreground">Confidence</p>
                            <Badge className={CONFIDENCE_COLORS[c.classification_confidence_2] || ""}>{c.classification_confidence_2}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {c.classification_reasoning && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground mb-1">Reasoning</p>
                      <p className="text-sm">{c.classification_reasoning}</p>
                    </div>
                  )}
                  {(c.classification_evidence || []).length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Evidence</p>
                      <ul className="text-sm space-y-1">
                        {(c.classification_evidence || []).map((e, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check className={`w-3 h-3 mt-0.5 flex-shrink-0 ${TONE_TEXT.success}`} aria-hidden="true" />
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not classified yet.</p>
              )}
            </div>

            {/* ====== AI ANALYSIS ====== */}
            <CandidateAnalysis
              ai={ai}
              analyzing={isBusy}
              onRun={() => {
                processCandidate(c.id);
                addAudit(c.id, c.name || "Unknown", "ai_parse");
              }}
              disabled={isBusy}
            />
          </div>

          {/* Right: Actions */}
          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-2xl bg-card border border-border p-4 space-y-2 light-glow">
              <h3 className="font-semibold text-sm mb-3">Actions</h3>
              <Button className="w-full justify-start" variant="outline" size="sm" onClick={() => handleDownload(c.id)}>
                <Download className="w-4 h-4 mr-2" /> Download CV
              </Button>
              <Button
                className="w-full justify-start" variant="outline" size="sm"
                disabled={isBusy}
                onClick={() => processCandidate(c.id)}
              >
                {isBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                Run AI analysis
              </Button>
              <p className="text-[10px] text-muted-foreground px-1">Refresh candidate analysis using the latest CV, job details, and screening answers.</p>
              <Button className="w-full justify-start" variant="outline" size="sm" onClick={() => {
                setEditCandidate(c);
                addAudit(c.id, c.name || "Unknown", "edit");
              }}>
                <Pencil className="w-4 h-4 mr-2" /> Edit fields
              </Button>
              {jobs.length > 0 && (
                <div className="pt-1">
                  <PipelineIntegration candidate={c as any} jobs={jobs as any} sessionToken={sessionToken} />
                </div>
              )}

              <div className="border-t border-border pt-2 mt-2">
                <p className="text-xs text-muted-foreground mb-2">Status</p>
                <Select
                  value={c.status}
                  onValueChange={(v) => {
                    handleUpdateCandidate(c.id, { status: v });
                    setSelectedCandidate({ ...c, status: v });
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CV_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t border-border pt-2 mt-2">
                <Button className="w-full justify-start text-destructive" variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Move to Trash
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Sub-tab helpers (moved inline, defined above early return) ----

  const SUB_TABS: { id: CVSubTab; label: string; icon: React.ReactNode }[] = [
    { id: "library", label: "Library", icon: <FolderTree className="w-3.5 h-3.5" /> },
    { id: "duplicates", label: "Duplicates", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { id: "insights", label: "Insights", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: "matching", label: "Job Match", icon: <Target className="w-3.5 h-3.5" /> },
    { id: "reparse", label: "Re-Parse", icon: <RefreshCw className="w-3.5 h-3.5" /> },
    { id: "export", label: "Export", icon: <Download className="w-3.5 h-3.5" /> },
    { id: "completeness", label: "Quality", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "gdpr", label: "GDPR", icon: <Shield className="w-3.5 h-3.5" /> },
    { id: "audit", label: "Audit", icon: <History className="w-3.5 h-3.5" /> },
    { id: "trash", label: "Trash", icon: <Trash2 className="w-3.5 h-3.5" /> },
  ];

  // ---- Main CV Library View ----
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">CV Library</h1>
          <p className="text-sm text-muted-foreground">{candidates.length} CVs stored · {filteredCandidates.length} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild disabled={uploading}>
            <label className="cursor-pointer">
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload CVs
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </Button>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              subTab === tab.id
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:bg-secondary border border-transparent"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-Tab Content */}
      {subTab === "duplicates" && (
        <DuplicateDetection
          candidates={candidates as any}
          onView={handleViewFromSubTab}
          onDelete={handleDelete}
        />
      )}

      {subTab === "insights" && (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" /></div>}>
          <TalentPoolInsights candidates={candidates as any} />
        </Suspense>
      )}

      {subTab === "matching" && (
        <AIJobMatching
          candidates={candidates as any}
          jobs={jobs as any}
          onViewCandidate={handleViewFromSubTab}
        />
      )}

      {subTab === "reparse" && (
        <BulkReparse
          candidates={candidates as any}
          filteredIds={filteredCandidates.map(c => c.id)}
          onReparse={async (id) => { await processCandidate(id); }}
          onRefresh={fetchCandidates}
        />
      )}

      {subTab === "export" && (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" /></div>}>
          <ExportReporting candidates={filteredCandidates as any} />
        </Suspense>
      )}

      {subTab === "completeness" && (
        <DataCompleteness
          candidates={candidates as any}
          onViewCandidate={handleViewFromSubTab}
          onBulkReparse={() => setSubTab("reparse")}
        />
      )}

      {subTab === "gdpr" && (
        <GDPRRetention
          candidates={candidates as any}
          onDelete={handleDelete}
          onViewCandidate={handleViewFromSubTab}
        />
      )}

      {subTab === "audit" && (
        <AuditTrail entries={auditLog} />
      )}

      {subTab === "trash" && (
        <TrashBin sessionToken={sessionToken} onChange={fetchCandidates} />
      )}

      {/* Main Library Tab */}
      {subTab === "library" && (
        <>
          {/* Smart Search */}
          <SmartSearch onSearch={handleSmartSearch} />

          {/* Saved Filters */}
          <div className="mt-3 mb-3">
            <SavedFilters
              currentFilters={{ searchQuery, filterDept, filterStatus, filterConfidence, sortBy, selectedFolder }}
              onApply={handleApplySavedFilter}
            />
          </div>

          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-1" /> Filters
            </Button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44"><ArrowUpDown className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
                <SelectItem value="confidence">Confidence High→Low</SelectItem>
                <SelectItem value="experience">Experience</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-lg bg-card border border-border">
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {CV_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterConfidence} onValueChange={setFilterConfidence}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Confidence" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidence</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-4">
            {/* Folder Tree */}
            <div className="hidden lg:block w-56 flex-shrink-0">
              <div className="rounded-xl bg-card border border-border p-3 sticky top-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Folders</p>
                <button
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-md ${selectedFolder === "all" ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary text-foreground"}`}
                  onClick={() => setSelectedFolder("all")}
                >
                  All CVs ({candidates.length})
                </button>

                {Object.entries(folderTree.tree).sort(([a], [b]) => a.localeCompare(b)).map(([dept, titles]) => {
                  const deptCount = candidates.filter(c => (c.manual_department || c.suggested_department) === dept).length;
                  const isOpen = folderOpen[dept] ?? false;
                  return (
                    <div key={dept}>
                      <button
                        className={`w-full flex items-center gap-1 text-sm px-2 py-1.5 rounded-md ${selectedFolder === dept ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary text-foreground"}`}
                        onClick={() => {
                          setFolderOpen(prev => ({ ...prev, [dept]: !prev[dept] }));
                          setSelectedFolder(dept);
                        }}
                      >
                        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span className="truncate">{dept}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{deptCount}</span>
                      </button>
                      {isOpen && Array.from(titles).sort().map(title => {
                        const titleCount = candidates.filter(c =>
                          (c.manual_department || c.suggested_department) === dept &&
                          (c.manual_job_title || c.suggested_job_title) === title
                        ).length;
                        const key = `${dept}::${title}`;
                        return (
                          <button
                            key={key}
                            className={`w-full text-left text-xs pl-7 pr-2 py-1 rounded-md ${selectedFolder === key ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary text-muted-foreground"}`}
                            onClick={() => setSelectedFolder(key)}
                          >
                            <span className="truncate">{title}</span>
                            <span className="ml-auto text-[10px]"> ({titleCount})</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {folderTree.unclassifiedCount > 0 && (
                  <button
                    className={`w-full flex items-center gap-1 text-sm px-2 py-1.5 rounded-md ${selectedFolder === "unclassified" ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary text-foreground"}`}
                    onClick={() => setSelectedFolder("unclassified")}
                  >
                    <AlertCircle className="w-3 h-3 text-destructive" />
                    <span>Unclassified</span>
                    <span className="text-xs text-muted-foreground ml-auto">{folderTree.unclassifiedCount}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Main Table */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No CVs found</p>
                  <p className="text-sm mt-1">Upload CVs to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCandidates.map(c => {
                    const dept = c.manual_department || c.suggested_department;
                    const title = c.manual_job_title || c.suggested_job_title;
                    const isProcessing = processingIds.has(c.id);
                    const statusInfo = CV_STATUSES.find(s => s.value === c.status);
                    const ai = c.ai_analysis;
                    const initials = c.name
                      ? c.name.split(/\s+/).length >= 2
                        ? (c.name.split(/\s+/)[0][0] + c.name.split(/\s+/).pop()![0]).toUpperCase()
                        : c.name.substring(0, 2).toUpperCase()
                      : "??";

                    const isDuplicate = candidates.some(
                      other => other.id !== c.id && ((c.email && other.email === c.email) || (c.phone && other.phone === c.phone))
                    );

                    return (
                      <div
                        key={c.id}
                        className="group rounded-2xl bg-card border border-border p-4 cursor-pointer transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5 light-glow"
                        onClick={() => {
                          setSelectedCandidate(c);
                          addAudit(c.id, c.name || "Unknown", "view");
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{c.name || "Processing..."}</span>
                              <Badge className={`text-[10px] border-0 ${statusInfo?.color}`}>{statusInfo?.label}</Badge>
                              {c.classification_confidence && (
                                <Badge className={`text-[10px] border-0 ${CONFIDENCE_COLORS[c.classification_confidence]}`}>
                                  {c.classification_confidence}
                                </Badge>
                              )}
                              {ai && (
                                <Badge className={`text-[10px] border-0 ${TONE_SOFT[scoreTone(ai.fitScore)]}`}>
                                  <Brain className="w-2.5 h-2.5 mr-1" aria-hidden="true" /> {ai.fitScore}/100
                                </Badge>
                              )}
                              {isDuplicate && (
                                <Badge variant="destructive" className="text-[10px]">Possible Duplicate</Badge>
                              )}
                            </div>
                            {/* Tags inline */}
                            {c.tags && c.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5" onClick={e => e.stopPropagation()}>
                                <CandidateTags candidateId={c.id} currentTags={c.tags} onUpdateTags={handleUpdateTags} compact />
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                              {c.email && <span>{c.email}</span>}
                              {c.phone && <span>{c.phone}</span>}
                              {c.nationality && <span>{c.nationality}</span>}
                              {c.country && <span>{c.country}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              {dept && <span className="text-primary/80 font-medium">{dept}</span>}
                              {dept && title && <span className="text-muted-foreground">·</span>}
                              {title && <span className="text-muted-foreground">{title}</span>}
                              {c.suggested_department_2 && (
                                <>
                                  <span className="text-muted-foreground">|</span>
                                  <span className="text-muted-foreground/70">{c.suggested_department_2}</span>
                                  {c.suggested_job_title_2 && (
                                    <>
                                      <span className="text-muted-foreground/50">·</span>
                                      <span className="text-muted-foreground/70">{c.suggested_job_title_2}</span>
                                    </>
                                  )}
                                </>
                              )}
                              {ai?.recommendation && (
                                <>
                                  <span className="text-muted-foreground">·</span>
                                  <Badge className={`text-[10px] border ${RECOMMENDATION_COLORS[ai.recommendation] || ""}`}>
                                    {ai.recommendation}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                              handleDownload(c.id);
                              addAudit(c.id, c.name || "Unknown", "download");
                            }}>
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="h-7 w-7 p-0"
                              disabled={isProcessing}
                              onClick={() => {
                                processCandidate(c.id);
                                addAudit(c.id, c.name || "Unknown", "ai_parse");
                              }}
                            >
                              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Edit Dialog */}
      {editCandidate && (
        <EditCandidateDialog
          candidate={editCandidate}
          onClose={() => setEditCandidate(null)}
          onSave={async (updates) => {
            const saved = await handleUpdateCandidate(editCandidate.id, updates);
            if (saved) {
              setEditCandidate(null);
              addAudit(editCandidate.id, editCandidate.name || "Unknown", "edit", `Fields updated`);
            }
            return saved;
          }}
        />
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className={value ? "font-medium" : "text-muted-foreground italic"}>{value || "Not found"}</span>
    </div>
  );
}

function EditCandidateDialog({
  candidate,
  onClose,
  onSave,
}: {
  candidate: CVCandidate;
  onClose: () => void;
  onSave: (updates: Record<string, any>) => Promise<boolean>;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: candidate.name || "",
    email: candidate.email || "",
    phone: candidate.phone || "",
    nationality: candidate.nationality || "",
    country: candidate.country || "",
    location: candidate.location || "",
    years_experience: candidate.years_experience || "",
    suggested_department: candidate.manual_department || candidate.suggested_department || "",
    suggested_job_title: candidate.manual_job_title || candidate.suggested_job_title || "",
    status: candidate.status || "new",
    tags: (candidate.tags || []).join(", "),
    internal_notes: String(candidate.manual_overrides?.internal_notes || ""),
  });

  const DEPARTMENTS_LIST = [
    "Human Resources", "Customer Success", "Account Management", "Client Services",
    "Customer Experience", "Sales", "Revenue Operations", "Product", "Engineering",
    "Data & Analytics", "Marketing", "Finance", "Operations", "Project Management", "Design",
  ];

  const handleSubmit = async () => {
    setSaving(true);
    const saved = await onSave({
      name: form.name || null,
      email: form.email || null,
      phone: form.phone || null,
      nationality: form.nationality || null,
      country: form.country || null,
      location: form.location || null,
      years_experience: form.years_experience || null,
      suggested_department: form.suggested_department || null,
      suggested_job_title: form.suggested_job_title || null,
      status: form.status,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      manual_overrides: {
        ...(candidate.manual_overrides || {}),
        internal_notes: form.internal_notes || null,
      },
    });
    setSaving(false);
    if (!saved) return;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Candidate</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Candidate Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
          <div><Label>Phone Number</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
          <div><Label>Nationality</Label><Input value={form.nationality} onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))} /></div>
          <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></div>
          <div><Label>Years Experience</Label><Input value={form.years_experience} onChange={(e) => setForm((f) => ({ ...f, years_experience: e.target.value }))} /></div>
          <div>
            <Label>Suggested Department</Label>
            <Select value={form.suggested_department} onValueChange={(v) => setForm((f) => ({ ...f, suggested_department: v }))}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS_LIST.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Suggested Job Title</Label><Input value={form.suggested_job_title} onChange={(e) => setForm((f) => ({ ...f, suggested_job_title: e.target.value }))} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="e.g. Bahrain market, Immediate joiner" /></div>
          <div>
            <Label>Internal Comments</Label>
            <Textarea value={form.internal_notes} onChange={(e) => setForm((f) => ({ ...f, internal_notes: e.target.value }))} placeholder="Internal HR notes..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
