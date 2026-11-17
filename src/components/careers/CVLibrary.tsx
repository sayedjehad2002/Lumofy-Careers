import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import {
  Search, Upload, FolderTree, ChevronRight, ChevronDown,
  Download, Eye, Brain, Pencil, Loader2, X, Tag, FileText,
  AlertCircle, Check, Archive, RefreshCw, User, Mail, Phone,
  Globe, MapPin, Briefcase, Filter, ArrowUpDown, Plus,
  TrendingUp, Target,
  AlertTriangle, Trash2, UserPlus, ArrowLeft, Sparkles
} from "lucide-react";
import SmartSearch, { parseQuery, type ParsedQuery } from "./cvlibrary/SmartSearch";
import SavedFilters, { type SavedFilter } from "./cvlibrary/SavedFilters";
import DuplicateDetection from "./cvlibrary/DuplicateDetection";
const TalentPoolInsights = lazy(() => import("./cvlibrary/TalentPoolInsights")); // lazy: defers recharts to the Insights sub-tab
import AIJobMatching from "./cvlibrary/AIJobMatching";
import BulkReparse from "./cvlibrary/BulkReparse";
import CandidateTags from "./cvlibrary/CandidateTags";
import PipelineIntegration from "./cvlibrary/PipelineIntegration";
import BulkPipelineAdd from "./cvlibrary/BulkPipelineAdd";
import { useCareers } from "@/contexts/CareersContext";
import { toTitleCase, candidateDisplayName } from "@/lib/utils";
const ExportReporting = lazy(() => import("./cvlibrary/ExportReporting")); // lazy: defers xlsx (~94KB) to the Export sub-tab
import TrashBin from "./cvlibrary/TrashBin";
import CandidateAnalysis, { type CVAIAnalysis } from "./cvlibrary/CandidateAnalysis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { TONE_SOFT, TONE_TEXT, fitBand } from "./statusColors";
import { Link } from "react-router-dom";
import { roleFamily } from "@/lib/roleFamilies";
import { PageHeader, EmptyState } from "./dashboard/primitives";

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
  "Professional Services",
];

const CV_STATUSES = [
  { value: "new", label: "New", color: "bg-[hsl(var(--chart-1)/0.2)] text-[hsl(var(--chart-1))]" },
  { value: "reviewed", label: "Reviewed", color: TONE_SOFT.warning },
  { value: "shortlisted", label: "Shortlisted", color: TONE_SOFT.success },
  { value: "archived", label: "Archived", color: "bg-muted text-muted-foreground" },
];

/** Status dot colours for the library's own four statuses (not the pipeline's). */
const CV_STATUS_DOT: Record<string, string> = {
  new: "hsl(var(--chart-1))",
  reviewed: "hsl(var(--chart-5))",
  shortlisted: "hsl(var(--intel-success))",
  archived: "var(--dx-line-2)",
};

/** Initials for the avatar: first and last name part, or the first two letters. */
function initialsOf(name: string | null | undefined): string {
  if (!name) return "??";
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
}

/** Classification confidence as a three-step meter, so High/Medium/Low read at a glance. */
function ConfidenceMeter({ level }: { level: string }) {
  const steps = level === "High" ? 3 : level === "Medium" ? 2 : 1;
  return (
    <span className={`cv-conf cv-conf--${level.toLowerCase()}`} title={`${level} confidence in the department and title`}>
      <span className="cv-conf__bars" aria-hidden="true">
        {[1, 2, 3].map((n) => <i key={n} className={n <= steps ? "is-on" : undefined} />)}
      </span>
      {level}
    </span>
  );
}

type CVSubTab = "library" | "duplicates" | "insights" | "matching" | "reparse" | "export" | "trash";

interface Props {
  sessionToken: string;
  jobs?: { id: string; title: string; department: string; status: string; requirements: string[] }[];
  onSessionExpired?: () => void;
  /** Sub-tab taken from the URL (/dashboard/cv-library/<sub>), so each view is
   *  linkable and can be opened in its own tab. */
  subTab?: string;
  onSubTabChange?: (sub: string) => void;
}

const SUB_TAB_IDS: CVSubTab[] = ['library','duplicates','insights','matching','reparse','export','trash'];
const isSubTab = (v?: string): v is CVSubTab => !!v && (SUB_TAB_IDS as string[]).includes(v);

export default function CVLibrary({ sessionToken, jobs = [], onSessionExpired, subTab: subTabProp, onSubTabChange }: Props) {
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
  const { refreshData, applicants } = useCareers(); // refresh + detect who's already in the pipeline
  // Emails of candidates already linked into the pipeline (matched case-insensitively),
  // so the CV Library can show an "In pipeline" state instead of a duplicate "Add" action.
  const pipelineEmails = useMemo(
    () => new Set(applicants.map((a) => a.email?.trim().toLowerCase()).filter(Boolean)),
    [applicants]
  );
  // CV-file paths of applicants promoted FROM the library: update-applicant "create"
  // copies cv_storage_path verbatim from resume_file_path ("library/<id>.<ext>"), so
  // this is a deterministic link that works even when the candidate has NO email.
  const pipelinePaths = useMemo(
    () => new Set(applicants.map((a) => a.cvStoragePath).filter(Boolean) as string[]),
    [applicants]
  );
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [folderOpen, setFolderOpen] = useState<Record<string, boolean>>({});
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  // Driven by the URL when the dashboard supplies it, so every view has its own
  // address and can be opened in a new tab. Falls back to local state otherwise.
  const [localSubTab, setLocalSubTab] = useState<CVSubTab>("library");
  const subTab: CVSubTab = isSubTab(subTabProp) ? subTabProp : (onSubTabChange ? "library" : localSubTab);
  const setSubTab = useCallback((t: CVSubTab) => {
    if (onSubTabChange) onSubTabChange(t); else setLocalSubTab(t);
  }, [onSubTabChange]);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery>({ include: [], exclude: [], raw: "" });
  // Multi-select for bulk actions (survives filter/folder changes on purpose —
  // HR builds a selection across several searches, then adds everyone at once).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAddOpen, setBulkAddOpen] = useState(false);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectedCandidates = useMemo(
    () => candidates.filter(c => selectedIds.has(c.id)),
    [candidates, selectedIds]
  );

  // Prune the selection when candidates disappear (deleted / trashed away).
  useEffect(() => {
    setSelectedIds(prev => {
      if (prev.size === 0) return prev;
      const alive = new Set(candidates.map(c => c.id));
      const next = new Set([...prev].filter(id => alive.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [candidates]);


  const fetchCandidates = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("cv-library-manage", {
        body: { action: "list", sessionToken },
      });
      if (error) {
        // Sign out ONLY on real auth failures (401/403). supabase-js reports every
        // non-2xx as "non-2xx", so a transient 500/429 must NOT end the session.
        const status = (error as { context?: { status?: number } })?.context?.status;
        if (status === 401 || status === 403 || (data && data.error?.includes("expired"))) {
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

      // Process STRICTLY ONE upload at a time (fire-and-forget runner so the upload
      // button re-enables immediately; per-card spinners cover the processing phase).
      // Live-tested constraint on this project's Gemini key: even two concurrent
      // candidate chains trigger sustained "model overloaded" 5xx failures that stamp
      // fresh uploads with the unreadable/ai_error marker. Same discipline as
      // BulkReparse: sequential + a breather.
      //
      // Upload only READS the CV (parse + classify, so the card has a name, contact
      // and department). The scoring analysis is manual: HR runs it per candidate.
      void (async () => {
        for (let i = 0; i < result.uploaded.length; i++) {
          await processCandidate(result.uploaded[i].id, { analyze: false });
          if (i + 1 < result.uploaded.length) {
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
      })();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Extract the PDF's text layer IN THE BROWSER (pdf.js runs reliably here; the
  // edge runtime's PDF tooling does not). Used to rescue CVs whose multimodal
  // parse gets a blocked/empty model response (LinkedIn exports etc.).
  const extractPdfTextClientSide = async (candidateId: string): Promise<string | null> => {
    try {
      const { data } = await supabase.functions.invoke("cv-library-manage", {
        body: { action: "download", sessionToken, candidateId },
      });
      if (!data?.url) return null;
      const buf = new Uint8Array(await (await fetch(data.url)).arrayBuffer());
      const unpdfUrl = "https://esm.sh/unpdf@0.12.1";
      const { extractText, getDocumentProxy } = await import(/* @vite-ignore */ unpdfUrl);
      const doc = await getDocumentProxy(buf);
      const { text } = await extractText(doc, { mergePages: true });
      const raw = String(text || "").replace(/\s+/g, " ").trim();
      return raw.length >= 200 ? raw.slice(0, 30000) : null;
    } catch {
      return null; // best-effort — caller falls back to the unreadable marker
    }
  };

  // Returns true only when the FULL chain (parse -> classify -> analyze) succeeded —
  // bulk re-parse uses this to report truthful succeeded/failed counts. Never throws
  // (single-candidate button callers rely on that). `analyze: false` (upload)
  // stops after classify: AI analysis only runs when HR asks for it.
  const processCandidate = async (
    candidateId: string,
    { analyze = true }: { analyze?: boolean } = {},
  ): Promise<boolean> => {
    setProcessingIds(prev => new Set(prev).add(candidateId));
    try {
      // Step 1: Parse CV
      let { data: parseData, error: parseErr } = await supabase.functions.invoke("cv-library-parse", {
        body: { candidateId, sessionToken },
      });
      if (parseErr) import.meta.env.DEV && console.error("Parse error:", parseErr);

      // AI-blocked file? Extract the text layer in the browser and retry ONCE with
      // the text supplied — rescues LinkedIn-style PDFs the model refuses to read.
      if (parseData?.unreadable && parseData.reason === "ai_error") {
        const clientText = await extractPdfTextClientSide(candidateId);
        if (clientText) {
          const retry = await supabase.functions.invoke("cv-library-parse", {
            body: { candidateId, sessionToken, clientExtractedText: clientText },
          });
          if (retry.data) parseData = retry.data;
        }
      }

      // Fail fast on unreadable CVs (Word docs / no extractable text): parse already
      // flagged ai_analysis as unreadable — reflect it and SKIP classify + analyze
      // (saves two slow AI calls and avoids a meaningless score).
      if (parseData?.unreadable) {
        // Mirror the server guard: never replace a REAL stored analysis with the
        // failure marker in local state — the server preserved it too, so a
        // transient AI error on re-parse must not flip the card to "Couldn't read".
        const hasRealAnalysis = (c: CVCandidate | null | undefined) =>
          !!c?.ai_analysis && (c.ai_analysis as { unreadable?: boolean }).unreadable !== true;
        const marker = { unreadable: true, reason: parseData.reason } as unknown as CVAIAnalysis;
        setCandidates(prev => prev.map(c => c.id === candidateId && !hasRealAnalysis(c) ? { ...c, ai_analysis: marker } : c));
        setSelectedCandidate(prev => prev?.id === candidateId && !hasRealAnalysis(prev) ? { ...prev, ai_analysis: marker } : prev);
        toast.error(parseData.reason === "word"
          ? "Couldn't read this Word file — re-upload the CV as a PDF."
          : parseData.reason === "ai_error"
          ? "AI couldn't process this CV — re-parse to retry, or re-upload a clearer PDF."
          : "Couldn't read this file — re-upload a clear PDF.");
        return false; // no aligned data was produced — bulk counts this as failed
      }

      // Step 2: Classify
      const { error: classErr } = await supabase.functions.invoke("cv-library-classify", {
        body: { candidateId, sessionToken },
      });
      if (classErr) import.meta.env.DEV && console.error("Classify error:", classErr);

      // Step 3: AI Analysis — the step that writes the ALIGNED classification.
      const analyzed = analyze ? await runAIAnalysis(candidateId) : !classErr;

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
      return analyzed;
    } catch (e) {
      import.meta.env.DEV && console.error("Processing error:", e);
      return false;
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
    }
  };

  // Returns true on success so bulk callers can count real failures — analyze is
  // the sole writer of the aligned classification, so a swallowed failure here
  // would let a bulk run report "succeeded" while the row stayed unaligned.
  const runAIAnalysis = async (candidateId: string): Promise<boolean> => {
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
      return true;
    } catch (e: any) {
      import.meta.env.DEV && console.error("AI analysis error:", e);
      toast.error("AI analysis failed");
      return false;
    } finally {
      setAnalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
    }
  };

  // View = open the PDF in a new tab; Download = save it (served as an attachment).
  const openCv = async (candidateId: string, download: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke("cv-library-manage", {
        body: { action: "download", sessionToken, candidateId, download },
      });
      if (error || data?.error || !data?.url) throw error || new Error(data?.error || "No URL");
      let url: string = data.url;
      if (!download) {
        // Belt-and-braces: strip any download-disposition param so View always
        // renders inline, even if a stale edge-function version appended it. The
        // param is not part of the signed token, so removing it keeps the URL valid.
        try {
          const u = new URL(url);
          u.searchParams.delete("download");
          url = u.toString();
        } catch { /* keep original URL */ }
      }
      window.open(url, "_blank");
    } catch {
      toast.error(download ? "Download failed" : "Couldn't open the CV");
    }
  };
  const handleView = (candidateId: string) => openCv(candidateId, false);
  const handleDownload = (candidateId: string) => openCv(candidateId, true);

  const handleUpdateCandidate = async (candidateId: string, updates: Record<string, any>) => {
    try {
      const existing = candidates.find((c) => c.id === candidateId);
      const manualOverrides = {
        ...(existing?.manual_overrides || {}),
        ...(updates.manual_overrides || {}),
      };

      // Flag a field as HR-overridden ONLY when its value actually CHANGED to a
      // non-empty value. The Edit dialog submits EVERY field on save, so flagging
      // all present keys locked null names/emails as "manual" forever — blocking
      // the AI backfills and keeping candidates permanently "Unnamed".
      const overrideFields = ["name", "email", "phone", "nationality", "country", "location", "years_experience"];
      for (const field of overrideFields) {
        if (!(field in updates)) continue;
        const next = updates[field];
        const cur = (existing as any)?.[field] ?? null;
        if (next !== null && next !== "" && next !== cur) {
          manualOverrides[field] = true;
        }
      }

      const finalUpdates: typeof updates = { ...updates, manual_overrides: manualOverrides };

      // Classification: only pin a manual department/title when HR actually picked a
      // DIFFERENT non-empty value than what's currently effective — re-saving the
      // dialog unchanged must NOT freeze the AI classification to a stale value.
      const effDept = existing?.manual_department || existing?.suggested_department || null;
      const newDept = updates.manual_department ?? updates.suggested_department ?? null;
      if (("manual_department" in updates || "suggested_department" in updates) && newDept && newDept !== effDept) {
        manualOverrides.department = true;
        finalUpdates.manual_department = newDept;
      } else {
        delete finalUpdates.manual_department;
      }
      const effTitle = existing?.manual_job_title || existing?.suggested_job_title || null;
      const newTitle = updates.manual_job_title ?? updates.suggested_job_title ?? null;
      if (("manual_job_title" in updates || "suggested_job_title" in updates) && newTitle && newTitle !== effTitle) {
        manualOverrides.job_title = true;
        finalUpdates.manual_job_title = newTitle;
      } else {
        delete finalUpdates.manual_job_title;
      }

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

  // `skipConfirm` lets bulk callers (e.g. GDPR "Delete all flagged") show ONE
  // confirmation themselves instead of N+1 sequential browser dialogs.
  const handleDelete = async (candidateId: string, skipConfirm = false) => {
    if (!skipConfirm && !confirm("Move this CV to Trash? You can restore it from the Trash tab, or delete it permanently there.")) return;
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

  // THE single folder-membership rule: an HR-set manual department is ALWAYS
  // classified (regardless of AI confidence — HR's pick must visibly "work");
  // otherwise a candidate needs a suggested department with non-Low confidence.
  // Used by the folder tree, the Unclassified filter, folder counts, AND
  // BulkReparse's scope — one rule so every number agrees.
  const isUnclassified = useCallback((c: CVCandidate) =>
    !c.manual_department && (!c.suggested_department || c.classification_confidence === "Low"),
  []);

  const effDeptOf = useCallback((c: CVCandidate) => c.manual_department || c.suggested_department || "", []);
  const effTitleOf = useCallback((c: CVCandidate) => c.manual_job_title || c.suggested_job_title || "", []);
  const familyOf = useCallback(
    (c: CVCandidate) => roleFamily(effDeptOf(c), effTitleOf(c)).family,
    [effDeptOf, effTitleOf]
  );

  // Everything EXCEPT the folder facet: search, department, status, confidence.
  // The sidebar counts THIS, so a folder's number predicts what clicking it
  // returns. Counting the raw `candidates` array made the tree promise
  // "Engineering 99" while an active status filter returned 6 on click.
  const facetBase = useMemo(() => {
    let result = candidates;

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

    // Same membership rule as the tree. Without the isUnclassified guard a
    // Low-confidence CV sat in the tree's "Unclassified" folder AND in this
    // select's department simultaneously, so two controls both labelled
    // Engineering returned different sets.
    if (filterDept === "unclassified") result = result.filter(isUnclassified);
    else if (filterDept !== "all") {
      result = result.filter(c => !isUnclassified(c) && effDeptOf(c) === filterDept);
    }
    if (filterStatus !== "all") result = result.filter(c => c.status === filterStatus);
    if (filterConfidence !== "all") result = result.filter(c => c.classification_confidence === filterConfidence);

    return result;
  }, [candidates, parsedQuery, searchQuery, filterDept, filterStatus, filterConfidence, isUnclassified, effDeptOf]);

  /** Department -> role family -> { count, the original titles inside it }.
   *  Families are derived at render time (src/lib/roleFamilies.ts) — nothing in
   *  the database is rewritten and the original title stays the row's label. */
  const buildTree = useCallback((list: CVCandidate[]) => {
    const tree = new Map<string, Map<string, { n: number; titles: Map<string, number> }>>();
    const deptTotals = new Map<string, number>();
    let unclassifiedCount = 0;
    for (const c of list) {
      if (isUnclassified(c)) { unclassifiedCount++; continue; }
      const dept = effDeptOf(c);
      const family = familyOf(c);
      deptTotals.set(dept, (deptTotals.get(dept) || 0) + 1);
      let fams = tree.get(dept);
      if (!fams) { fams = new Map(); tree.set(dept, fams); }
      let entry = fams.get(family);
      if (!entry) { entry = { n: 0, titles: new Map() }; fams.set(family, entry); }
      entry.n++;
      const label = effTitleOf(c) || "No title on file";
      entry.titles.set(label, (entry.titles.get(label) || 0) + 1);
    }
    return { tree, deptTotals, unclassifiedCount };
  }, [isUnclassified, effDeptOf, effTitleOf, familyOf]);

  // One pass each, instead of re-filtering all 410 candidates per folder row.
  const folderTree = useMemo(() => buildTree(facetBase), [buildTree, facetBase]);
  /** Unfiltered totals, so a filtered folder can honestly read "12 / 99". */
  const fullTree = useMemo(() => buildTree(candidates), [buildTree, candidates]);
  const filtersActive =
    !!searchQuery || filterDept !== "all" || filterStatus !== "all" || filterConfidence !== "all";

  // A re-classification can dissolve the selected folder (candidate moved to a
  // different department) — fall back to "All CVs" instead of silently filtering
  // the list down to a misleading "No CVs found" empty state.
  useEffect(() => {
    if (selectedFolder === "all" || selectedFolder === "unclassified") return;
    const [dept, family] = selectedFolder.includes("::")
      ? selectedFolder.split("::")
      : [selectedFolder, null as string | null];
    const exists = family ? !!fullTree.tree.get(dept)?.has(family) : fullTree.tree.has(dept);
    if (!exists) setSelectedFolder("all");
  }, [fullTree, selectedFolder]);

  // Filtered and sorted candidates — search/status/confidence/department already
  // applied by facetBase, so only the folder facet and sorting happen here.
  const filteredCandidates = useMemo(() => {
    let result = [...facetBase];

    if (selectedFolder !== "all") {
      if (selectedFolder === "unclassified") {
        result = result.filter(isUnclassified);
      } else if (selectedFolder.includes("::")) {
        const [dept, family] = selectedFolder.split("::");
        result = result.filter(c => !isUnclassified(c) && effDeptOf(c) === dept && familyOf(c) === family);
      } else {
        result = result.filter(c => !isUnclassified(c) && effDeptOf(c) === selectedFolder);
      }
    }

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
  }, [facetBase, selectedFolder, sortBy, isUnclassified, effDeptOf, familyOf]);

  // CVs that share an email or phone with another CV. Counted once per data
  // change: the row used to re-scan the whole library for every row on every render.
  const duplicateIds = useMemo(() => {
    const emails = new Map<string, number>();
    const phones = new Map<string, number>();
    for (const c of candidates) {
      if (c.email) emails.set(c.email, (emails.get(c.email) ?? 0) + 1);
      if (c.phone) phones.set(c.phone, (phones.get(c.phone) ?? 0) + 1);
    }
    return new Set(
      candidates
        .filter((c) => (c.email && (emails.get(c.email) ?? 0) > 1) || (c.phone && (phones.get(c.phone) ?? 0) > 1))
        .map((c) => c.id),
    );
  }, [candidates]);

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
  }, [candidates, handleUpdateCandidate]);

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

    const displayName = candidateDisplayName(c.name, c.resume_file_name);
    const statusInfo = CV_STATUSES.find(s => s.value === c.status);
    const unreadable = ai?.unreadable === true;

    return (
      <div className="cv-detail">
        <button type="button" className="cv-back" onClick={() => setSelectedCandidate(null)}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to CV library
        </button>

        {/* ── Identity: who, which file, where they stand, and the three things you do with a CV ── */}
        <section className="cv-hero dx-card">
          <div className="cv-hero__id">
            <span className="cv-hero__avatar" aria-hidden="true">
              {isBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : initialsOf(displayName)}
            </span>
            <div className="min-w-0">
              {/* Match the applicant profile: state the absence honestly rather
                  than inventing a person called "Unknown". */}
              {displayName
                ? <h1 className="dx-title">{displayName}</h1>
                : <h1 className="dx-title text-muted-foreground">No name on file</h1>}
              <p className="cv-hero__file" title={c.resume_file_name}>
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                {c.resume_file_name}
              </p>
              <div className="cv-hero__badges">
                <span className="ar-stage">
                  <i style={{ background: CV_STATUS_DOT[c.status] ?? "var(--dx-line-2)" }} aria-hidden="true" />
                  {statusInfo?.label || c.status}
                </span>
                {c.classification_confidence && <ConfidenceMeter level={c.classification_confidence} />}
                {ai && !unreadable && (
                  <span className={`ar-fit ar-fit--${fitBand(ai.fitScore)}`} title={`AI fit score ${ai.fitScore} of 100`}>
                    {ai.fitScore}
                  </span>
                )}
                {ai?.recommendation && <span className="cv-rec">{ai.recommendation}</span>}
              </div>
            </div>
          </div>
          <div className="cv-hero__actions">
            <button type="button" className="dx-btn dx-btn--secondary" onClick={() => handleView(c.id)}>
              <Eye aria-hidden="true" /> View CV
            </button>
            <button type="button" className="dx-btn dx-btn--secondary" onClick={() => handleDownload(c.id)}>
              <Download aria-hidden="true" /> Download
            </button>
            <button type="button" className="dx-btn dx-btn--primary" disabled={isBusy} onClick={() => processCandidate(c.id)}>
              {isBusy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Brain aria-hidden="true" />}
              Run AI analysis
            </button>
          </div>
        </section>

        <div className="cv-detail__grid">
          <div className="cv-detail__main">
            {/* ── Profile facts ── */}
            <section className="dx-card cv-panel" aria-labelledby="cv-profile">
              <h2 className="cv-panel__title" id="cv-profile">Profile</h2>
              <dl className="cv-facts">
                <Fact icon={<Mail />} label="Email" value={c.email} />
                <Fact icon={<Phone />} label="Phone" value={c.phone} />
                <Fact icon={<Briefcase />} label="Experience" value={c.years_experience ? `${c.years_experience} years` : null} />
                <Fact icon={<MapPin />} label="Location" value={c.location} />
                <Fact icon={<MapPin />} label="Country" value={c.country} />
                <Fact icon={<Globe />} label="Nationality" value={c.nationality} />
              </dl>

              {/* Summary beside skills and tags: a readable line length for the
                  prose, and the right half of the card does work instead of
                  sitting empty. Without a summary, skills and tags take the row. */}
              <div className={`cv-profile-split${c.roles_summary ? "" : " is-single"}`}>
                {c.roles_summary && (
                  <figure className="cv-summary">
                    <figcaption className="dx-label">Career summary</figcaption>
                    <p>{c.roles_summary}</p>
                  </figure>
                )}

                <div className="cv-profile-side">
                  {(c.skills || []).length > 0 && <SkillList key={c.id} skills={c.skills || []} />}

                  <div className="cv-block cv-tags">
                    <CandidateTags candidateId={c.id} currentTags={c.tags || []} onUpdateTags={(cId, tags) => {
                      handleUpdateCandidate(cId, { tags });
                    }} />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Where they fit (classification) ── */}
            <section className="dx-card cv-panel" aria-labelledby="cv-fit">
              <h2 className="cv-panel__title" id="cv-fit">
                <Brain className="h-4 w-4" aria-hidden="true" /> Where they fit
              </h2>
              {dept ? (
                <>
                  <div className="cv-fits">
                    <div className="cv-fitcard cv-fitcard--best">
                      <p className="cv-fitcard__kicker">Best fit</p>
                      <p className="cv-fitcard__dept">{dept}</p>
                      <p className="cv-fitcard__title">{title || "No title suggested"}</p>
                      {c.classification_confidence && <ConfidenceMeter level={c.classification_confidence} />}
                    </div>
                    {c.suggested_department_2 && (
                      <div className="cv-fitcard">
                        <p className="cv-fitcard__kicker">Second best fit</p>
                        <p className="cv-fitcard__dept">{c.suggested_department_2}</p>
                        <p className="cv-fitcard__title">{c.suggested_job_title_2 || "No title suggested"}</p>
                        {c.classification_confidence_2 && <ConfidenceMeter level={c.classification_confidence_2} />}
                      </div>
                    )}
                  </div>

                  {c.classification_reasoning && (
                    <div className="cv-block">
                      <p className="dx-label">Reasoning</p>
                      <p className="cv-prose">{c.classification_reasoning}</p>
                    </div>
                  )}
                  {(c.classification_evidence || []).length > 0 && (
                    <div className="cv-block">
                      <p className="dx-label">Evidence from the CV</p>
                      <ul className="cv-evidence">
                        {(c.classification_evidence || []).map((e, i) => (
                          <li key={i}>
                            <Check className={`h-3.5 w-3.5 ${TONE_TEXT.success}`} aria-hidden="true" />
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="cv-prose text-muted-foreground">Not classified yet. Re-parse the CV to assign a department and title.</p>
              )}
            </section>

            {/* ====== AI ANALYSIS ====== */}
            <CandidateAnalysis
              ai={ai}
              analyzing={isBusy}
              onRun={() => {
                processCandidate(c.id);
              }}
              disabled={isBusy}
            />
          </div>

          {/* ── Next steps rail ── */}
          <aside className="cv-detail__rail">
            <section className="dx-card cv-panel" aria-labelledby="cv-next">
              <h2 className="cv-panel__title" id="cv-next">Next steps</h2>
              {jobs.length > 0 && (
                <PipelineIntegration
                  candidate={c as any}
                  jobs={jobs as any}
                  sessionToken={sessionToken}
                  onDone={async () => {
                    // The add also flips the LIBRARY row to "shortlisted", so refresh
                    // both datasets and patch the open profile (a stale state copy).
                    refreshData();
                    const fresh = await fetchCandidates();
                    const updated = fresh?.find((x) => x.id === c.id);
                    if (updated) setSelectedCandidate((prev) => (prev?.id === c.id ? { ...prev, ...updated } : prev));
                  }}
                  inPipeline={(!!c.email && pipelineEmails.has(c.email.trim().toLowerCase())) || pipelinePaths.has(c.resume_file_path)}
                />
              )}

              <div className="cv-rail-block">
                <p className="dx-label">Library status</p>
                <Select
                  value={c.status}
                  onValueChange={(v) => {
                    handleUpdateCandidate(c.id, { status: v });
                    setSelectedCandidate({ ...c, status: v });
                  }}
                >
                  <SelectTrigger className="dx-tool w-full" aria-label="Library status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CV_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="cv-rail-block cv-rail-links">
                <button type="button" className="cv-rail-link" onClick={() => setEditCandidate(c)}>
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Edit fields
                </button>
                <button type="button" className="cv-rail-link cv-rail-link--danger" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Move to Trash
                </button>
              </div>
              <p className="cv-hint">Run AI analysis refreshes the score from the latest CV and job details.</p>
            </section>
          </aside>
        </div>

        {/* Edit dialog must be mounted in THIS profile early-return too: its only
            trigger ("Edit fields", above) lives here, but the dialog was rendered
            only in the list-view return — so it never opened. */}
        {editCandidate && (
          <EditCandidateDialog
            candidate={editCandidate}
            onClose={() => setEditCandidate(null)}
            onSave={async (updates) => {
              const saved = await handleUpdateCandidate(editCandidate.id, updates);
              if (saved) {
                setEditCandidate(null);
              }
              return saved;
            }}
          />
        )}
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
    { id: "trash", label: "Trash", icon: <Trash2 className="w-3.5 h-3.5" /> },
  ];

  // ---- Main CV Library View ----
  return (
    <div>
      {/* Header */}
      <PageHeader
        eyebrow="Talent"
        title="CV Library"
        summary={
          loading ? <>Loading the library…</> : <>
            <b>{candidates.length}</b> CVs across <b>{fullTree.tree.size}</b> departments
            {candidates.some((c) => c.status === "shortlisted") && (
              <> · <b>{candidates.filter((c) => c.status === "shortlisted").length}</b> shortlisted</>
            )}
            {fullTree.unclassifiedCount > 0 && (
              <> · <span className="is-warn">{fullTree.unclassifiedCount} not classified yet</span></>
            )}
            {filtersActive && <> · <b>{filteredCandidates.length}</b> shown</>}
          </>
        }
        actions={
          <label
            className="dx-btn dx-btn--primary focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--dx-sirius)]"
            aria-disabled={uploading || undefined}
          >
            {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
            Upload CVs
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx"
              className="sr-only"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        }
      />

      {/* Sub-Tab Navigation */}
      <div className="dx-tabs mb-4">
        {SUB_TABS.map(tab => {
          const cls = `dx-tab${subTab === tab.id ? " is-on" : ""}`;
          // Anchors when the dashboard owns the route, so right-click offers
          // "Open link in new tab"; plain buttons in any standalone usage.
          return onSubTabChange ? (
            <Link
              key={tab.id}
              to={`/dashboard/cv-library/${tab.id}`}
              aria-current={subTab === tab.id ? "page" : undefined}
              className={cls}
            >
              {tab.icon}
              {tab.label}
            </Link>
          ) : (
            <button key={tab.id} onClick={() => setSubTab(tab.id)} className={cls}>
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Bulk add-to-pipeline dialog. Rendered here (NOT inside the library
          sub-tab) so an in-flight run survives switching sub-tabs mid-run —
          the dialog stays mounted and keeps showing live progress. */}
      <BulkPipelineAdd
        candidates={selectedCandidates}
        jobs={jobs}
        sessionToken={sessionToken}
        open={bulkAddOpen}
        onOpenChange={setBulkAddOpen}
        onRefresh={() => { refreshData(); fetchCandidates(); }}
        onResolved={ids => setSelectedIds(prev => {
          const next = new Set(prev);
          ids.forEach(id => next.delete(id));
          return next;
        })}
      />

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
          onReparse={async (id) => {
            // Surface real failures to Promise.allSettled so the bulk summary's
            // succeeded/failed counts are truthful (analyze writes the alignment).
            const ok = await processCandidate(id);
            if (!ok) throw new Error("processing failed");
          }}
          onRefresh={fetchCandidates}
        />
      )}

      {subTab === "export" && (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" /></div>}>
          <ExportReporting candidates={filteredCandidates as any} />
        </Suspense>
      )}

      {subTab === "trash" && (
        <TrashBin sessionToken={sessionToken} onChange={fetchCandidates} />
      )}

      {/* Main Library Tab */}
      {subTab === "library" && (
        <>
          {/* Smart Search */}
          <SmartSearch value={searchQuery} onSearch={handleSmartSearch} />

          {/* Saved Filters */}
          <div className="mt-3 mb-3">
            <SavedFilters
              currentFilters={{ searchQuery, filterDept, filterStatus, filterConfidence, sortBy, selectedFolder }}
              onApply={handleApplySavedFilter}
            />
          </div>

          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Button variant="outline" size="sm" className="dx-tool" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-1" /> Filters
            </Button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="dx-tool w-48"><ArrowUpDown className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
                <SelectItem value="confidence">Confidence High→Low</SelectItem>
                <SelectItem value="experience">Experience</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showFilters && (
            <div className="dx-card flex flex-wrap gap-3 mb-4 p-3">
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
            {/* 224px could not fit a role name: after padding, the 28px indent, the
                scrollbar and the count, only ~122px of text survived — about 19
                characters, which is exactly where "Frontend Developer (" was being
                cut. Wider column + slim scrollbar + wrapping fixes it. */}
            <div className="hidden lg:block w-72 xl:w-80 flex-shrink-0">
              {/* Sticky sidebar with its OWN scroll: an expanded department (e.g. 39
                  Customer Success roles) grows taller than the viewport — without
                  max-h + overflow the wheel can't reach the items below the fold. */}
              <div className="dx-card p-3 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain scrollbar-slim">
                <p className="dx-label px-2 pt-1">Folders</p>
                <button
                  className={`cv-folder${selectedFolder === "all" ? " is-on" : ""}`}
                  onClick={() => setSelectedFolder("all")}
                >
                  <span className="min-w-0 flex-1">All CVs</span>
                  <span className="cv-folder__n">{filtersActive ? `${facetBase.length}/${candidates.length}` : candidates.length}</span>
                </button>

                {Array.from(fullTree.tree.keys()).sort((a, b) => a.localeCompare(b)).map(dept => {
                  const shown = folderTree.deptTotals.get(dept) ?? 0;
                  const total = fullTree.deptTotals.get(dept) ?? 0;
                  const isOpen = folderOpen[dept] ?? false;
                  // Families present in the UNFILTERED tree, so a family never
                  // vanishes mid-search; its count just drops to 0.
                  const families = Array.from(fullTree.tree.get(dept)?.entries() ?? [])
                    .sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));
                  return (
                    <div key={dept}>
                      <button
                        className={`cv-folder${selectedFolder === dept ? " is-on" : ""}`}
                        onClick={() => {
                          setFolderOpen(prev => ({ ...prev, [dept]: !prev[dept] }));
                          setSelectedFolder(dept);
                        }}
                        title={dept}
                      >
                        {isOpen
                          ? <ChevronDown className="w-3 h-3 mt-1 flex-shrink-0" aria-hidden="true" />
                          : <ChevronRight className="w-3 h-3 mt-1 flex-shrink-0" aria-hidden="true" />}
                        <span className="min-w-0 flex-1 leading-snug">{dept}</span>
                        <span className="cv-folder__n">
                          {filtersActive ? `${shown}/${total}` : total}
                        </span>
                      </button>

                      {isOpen && families.map(([family, full]) => {
                        const key = `${dept}::${family}`;
                        const match = folderTree.tree.get(dept)?.get(family)?.n ?? 0;
                        const variants = full.titles.size;
                        return (
                          <button
                            key={key}
                            // Two-line wrap plus a native tooltip: the longest real
                            // title is 73 characters, so a single clipped line can
                            // never identify it.
                            title={`${family} — ${variants} title variant${variants === 1 ? "" : "s"}:\n${Array.from(full.titles.keys()).join("\n")}`}
                            className={`cv-folder cv-folder--family${selectedFolder === key ? " is-on" : ""}`}
                            onClick={() => setSelectedFolder(key)}
                          >
                            <span className="min-w-0 flex-1 line-clamp-2 leading-snug">{family}</span>
                            <span className="cv-folder__n">
                              {filtersActive ? `${match}/${full.n}` : full.n}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {fullTree.unclassifiedCount > 0 && (
                  <button
                    className={`cv-folder${selectedFolder === "unclassified" ? " is-on" : ""}`}
                    onClick={() => setSelectedFolder("unclassified")}
                    title="No department could be determined from these CVs — re-parse or set one by hand."
                  >
                    <AlertCircle className="w-3 h-3 text-destructive flex-shrink-0" aria-hidden="true" />
                    <span>Unclassified</span>
                    <span className="cv-folder__n">
                      {filtersActive
                        ? `${folderTree.unclassifiedCount}/${fullTree.unclassifiedCount}`
                        : fullTree.unclassifiedCount}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Main Table */}
            <div className="flex-1 min-w-0">
              {selectedIds.size > 0 && (
                <div className="cv-selbar sticky top-[7.5rem] lg:top-2 z-20 mb-3">
                  <span className="text-sm font-semibold">{selectedIds.size} selected</span>
                  <Button
                    variant="ghost" size="sm" className="h-7 px-2 text-xs"
                    onClick={() => setSelectedIds(prev => new Set([...prev, ...filteredCandidates.map(c => c.id)]))}
                  >
                    Select all {filteredCandidates.length} shown
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear
                  </Button>
                  <div className="flex-1" />
                  <Button size="sm" className="h-8 gap-1.5" onClick={() => setBulkAddOpen(true)} disabled={jobs.length === 0}>
                    <UserPlus className="w-3.5 h-3.5" />
                    Add {selectedIds.size} to pipeline
                  </Button>
                </div>
              )}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredCandidates.length === 0 ? (
                <EmptyState icon={FileText} title="No CVs found">
                  <p>Upload CVs to get started, or clear the filters.</p>
                </EmptyState>
              ) : (
                <div className="dx-list cv-table">
                  <div className="cv-head" aria-hidden="true">
                    <span />
                    <span>Candidate</span>
                    <span>Best fit</span>
                    <span>Status</span>
                    <span className="text-right">AI fit</span>
                    <span />
                  </div>
                  {filteredCandidates.map(c => {
                    const dept = c.manual_department || c.suggested_department;
                    const title = c.manual_job_title || c.suggested_job_title;
                    const isProcessing = processingIds.has(c.id);
                    const statusInfo = CV_STATUSES.find(s => s.value === c.status);
                    const ai = c.ai_analysis;
                    const unreadable = ai?.unreadable === true; // parse couldn't read the file (Word / no text)
                    // Name to show: parsed name, else derived from the file name.
                    const displayName = candidateDisplayName(c.name, c.resume_file_name);
                    const isDuplicate = duplicateIds.has(c.id);
                    const selected = selectedIds.has(c.id);
                    const contact = [c.email, c.country || c.nationality].filter(Boolean).join(" · ");

                    return (
                      <div
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open ${displayName || "this CV"}`}
                        className={`cv-row group${selected ? " is-selected" : ""}`}
                        onClick={() => setSelectedCandidate(c)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedCandidate(c); }
                        }}
                      >
                        {/* Avatar and checkbox share one slot, as on the Applicants table. */}
                        <div className="ar-sel" onClick={e => e.stopPropagation()}>
                          <span
                            className={`ar-avatar transition-opacity ${selectedIds.size > 0 || selected ? "opacity-0" : "opacity-100 group-hover:opacity-0"}`}
                            aria-hidden="true"
                          >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : initialsOf(displayName)}
                          </span>
                          <span
                            className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                              selectedIds.size > 0 || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                            }`}
                          >
                            <Checkbox
                              checked={selected}
                              onCheckedChange={() => toggleSelected(c.id)}
                              aria-label={`Select ${displayName || "candidate"}`}
                            />
                          </span>
                        </div>

                        <div className="ar-cell">
                          <span className="cv-name">
                            {displayName || (isProcessing ? "Processing…" : unreadable ? "Unreadable CV" : "Unnamed candidate")}
                          </span>
                          <span className="ar-sub" title={contact || c.resume_file_name}>{contact || c.resume_file_name}</span>
                          {(unreadable || isDuplicate || (c.tags && c.tags.length > 0)) && (
                            <div className="cv-flags" onClick={e => e.stopPropagation()}>
                              {unreadable && <span className="jr-badge jr-badge--warn">Couldn't read · re-upload PDF</span>}
                              {isDuplicate && <span className="jr-badge jr-badge--warn">Possible duplicate</span>}
                              {c.tags && c.tags.length > 0 && (
                                <CandidateTags candidateId={c.id} currentTags={c.tags} onUpdateTags={handleUpdateTags} compact />
                              )}
                            </div>
                          )}
                        </div>

                        <div className="ar-cell">
                          {dept ? (
                            <>
                              <span className="cv-dept">{dept}</span>
                              <span className="ar-sub" title={title || undefined}>{title || "No title suggested"}</span>
                            </>
                          ) : (
                            <span className="ar-sub">Not classified yet</span>
                          )}
                          {c.suggested_department_2 && (
                            <span className="cv-alt" title="Second best fit">
                              Also {c.suggested_department_2}{c.suggested_job_title_2 ? ` · ${c.suggested_job_title_2}` : ""}
                            </span>
                          )}
                        </div>

                        <div className="ar-cell cv-status-cell">
                          <span className="ar-stage">
                            <i style={{ background: CV_STATUS_DOT[c.status] ?? "var(--dx-line-2)" }} aria-hidden="true" />
                            {statusInfo?.label || c.status}
                          </span>
                          {c.classification_confidence && <ConfidenceMeter level={c.classification_confidence} />}
                        </div>

                        <div className="ar-cell ar-fit-cell">
                          {ai && !unreadable ? (
                            <span className={`ar-fit ar-fit--${fitBand(ai.fitScore)}`} title={`AI fit score ${ai.fitScore} of 100`}>
                              {ai.fitScore}
                            </span>
                          ) : (
                            <span className="ar-fit ar-fit--none" title="Not scored yet">—</span>
                          )}
                          {ai?.recommendation && <span className="cv-rec cv-rec--row">{ai.recommendation}</span>}
                        </div>

                        <div className="ar-actions" onClick={e => e.stopPropagation()}>
                          <button type="button" className="ar-icon-btn" title="View CV" aria-label={`View CV of ${displayName || "candidate"}`} onClick={() => handleView(c.id)}>
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button type="button" className="ar-icon-btn" title="Download CV" aria-label={`Download CV of ${displayName || "candidate"}`} onClick={() => handleDownload(c.id)}>
                            <Download className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="ar-icon-btn"
                            title="Run AI analysis"
                            aria-label={`Run AI analysis for ${displayName || "candidate"}`}
                            disabled={isProcessing}
                            onClick={() => processCandidate(c.id)}
                          >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Brain className="h-4 w-4" aria-hidden="true" />}
                          </button>
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
            }
            return saved;
          }}
        />
      )}
    </div>
  );
}

/** Skills read from the CV: calm outline chips, the first ten shown, the rest one click away. */
const SKILLS_SHOWN = 10;
function SkillList({ skills }: { skills: string[] }) {
  const [all, setAll] = useState(false);
  // Same skill twice in a CV (different casing) is one skill.
  const unique = skills.filter((sk, i) => skills.findIndex((o) => o.trim().toLowerCase() === sk.trim().toLowerCase()) === i);
  const shown = all ? unique : unique.slice(0, SKILLS_SHOWN);
  const hidden = unique.length - shown.length;
  return (
    <div className="cv-block">
      <p className="dx-label">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Skills <span className="dx-label__n">{unique.length}</span>
      </p>
      <ul className="sk-list" aria-label="Skills from the CV">
        {shown.map((sk) => <li key={sk} className="sk-chip">{sk}</li>)}
        {(hidden > 0 || all) && unique.length > SKILLS_SHOWN && (
          <li>
            <button type="button" className="sk-more" onClick={() => setAll((v) => !v)} aria-expanded={all}>
              {all ? "Show fewer" : `+${hidden} more`}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

/** One profile fact: icon, small label, value — or an honest "Not found". */
function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div className="cv-fact">
      <dt>
        <span className="cv-fact__ic" aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className={value ? undefined : "is-missing"}>{value || "Not found"}</dd>
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
    "Professional Services",
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
