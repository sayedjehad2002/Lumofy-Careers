import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Check, ArrowDown, KanbanSquare, FileSearch, Loader2, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { APPLICANT_STATUSES, type AIAnalysis, type Applicant, type ApplicantStatus, type Job } from "@/types/careers";
import {
  daysInStage, matchesSearch, slaState, sortColumn, SORT_LABELS, type SortMode,
} from "@/lib/pipelineMetrics";
import {
  ROSTER_FACETS, rosterFacets, rosterSummary, applyRosterFilters, activeFilterCount,
  NO_FILTERS, type FacetId, type RosterFilterState,
} from "@/lib/applicantMetrics";
import ApplicantRow from "./ApplicantRow";
import RosterBulkBar from "./RosterBulkBar";
import RosterFilters from "./RosterFilters";
import CompareDrawer from "./CompareDrawer";
import CandidatePeek, { PEEK_DECISIONS } from "./CandidatePeek";
import RejectionNotice, { type RejectionAudience } from "./RejectionNotice";
import { useBulkAnalysis } from "./useBulkAnalysis";
import { useContactSweep, type ContactSweepResult } from "./useContactSweep";
import { useCareers } from "@/contexts/CareersContext";
import JobFilter from "./JobFilter";
import { LxApplicants } from "@/components/icons/lumofy";
import { PageHeader, Chip, SearchField, EmptyState } from "../dashboard/primitives";
import { statusBreakdown } from "@/lib/dashboardMetrics";
import { STATUS_COLORS } from "../statusColors";

/**
 * Stage order for the navigator: the path a candidate walks, then the exit.
 * Rejected is a real outcome, so it is listed (and counted) rather than hidden.
 */
const STAGE_ORDER: ApplicantStatus[] = ["new", "reviewing", "shortlisted", "interview", "hired", "rejected"];

const WINDOW_INITIAL = 60;
const WINDOW_STEP = 60;
/** Hard ceiling on mounted rows. Growth without a cap just defers the original problem. */
const WINDOW_CAP = 200;
const SHOW_ALL = Number.MAX_SAFE_INTEGER;

const TERMINAL: ApplicantStatus[] = ["rejected", "hired"];

export interface ApplicantsRosterProps {
  /** Already scoped to selectedJobIds by Dashboard. */
  applicants: Applicant[];
  jobs: Job[];
  /** Empty = every job. */
  selectedJobIds: readonly string[];
  onJobIdsChange: Dispatch<SetStateAction<string[]>>;
  /** Applications per job over every applicant, for the job filter. */
  jobCounts?: ReadonlyMap<string, number>;
  applicantHref: (applicantId: string) => string;
  onBulkStatusUpdate: (ids: string[], status: ApplicantStatus) => Promise<{ updated: string[] }>;
  onDeleteApplicant: (id: string) => Promise<void>;
  onAnalysisComplete: (applicantId: string, analysis: AIAnalysis) => void;
  onAddNote: (applicantId: string, note: string) => Promise<void>;
  getJobTitle: (jobId: string) => string;
  sessionToken: string | null;
}

export default function ApplicantsRoster({
  applicants, jobs, selectedJobIds, onJobIdsChange, jobCounts, applicantHref,
  onBulkStatusUpdate, onDeleteApplicant, onAnalysisComplete, onAddNote, getJobTitle, sessionToken,
}: ApplicantsRosterProps) {
  const [facet, setFacet] = useState<FacetId>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("score");
  const [filters, setFilters] = useState<RosterFilterState>(NO_FILTERS);
  const [comparing, setComparing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [limit, setLimit] = useState(WINDOW_INITIAL);
  const [moving, setMoving] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; ids: string[]; target: ApplicantStatus }>({
    open: false, ids: [], target: "new",
  });

  // Recomputed when the data changes rather than pinned at mount, so "Nd waiting"
  // and the SLA tint do not freeze on a long-lived tab.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => Date.now(), [applicants]);

  const jobById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const jobFor = useCallback((jobId: string) => jobById.get(jobId), [jobById]);
  const titleFor = useCallback(
    (a: Applicant) => a.jobTitle || getJobTitle(a.jobId),
    [getJobTitle],
  );

  const { progress: analysisProgress, run: runAnalysis, cancel: cancelAnalysis } =
    useBulkAnalysis(sessionToken, jobFor, onAnalysisComplete);

  // "No email" repair: read the CVs themselves (no AI) and fill empty contact fields.
  const { hrRole, updateApplicantFields, updateApplicantStatus } = useCareers();
  const canWrite = hrRole === "owner" || hrRole === "admin";
  const { progress: sweepProgress, run: runSweep, cancel: cancelSweep } =
    useContactSweep(sessionToken, updateApplicantFields);
  const [sweepResult, setSweepResult] = useState<ContactSweepResult | null>(null);
  // CVs already read this session: their email is either filled now or not on the
  // CV, so offering to read them again would only repeat the same answer.
  const [sweptIds, setSweptIds] = useState<ReadonlySet<string>>(() => new Set());

  // ── derivation chain ──────────────────────────────────────────────────────
  const facets = useMemo(() => rosterFacets(applicants, now), [applicants, now]);
  const summary = useMemo(() => rosterSummary(applicants), [applicants]);

  // Typing stays responsive while the list re-renders at low priority.
  const deferredSearch = useDeferredValue(search);

  const faceted = useMemo(
    () => (facet === "all" ? applicants : applicants.filter((a) => ROSTER_FACETS[facet](a, now))),
    [applicants, facet, now],
  );
  const stageCounts = useMemo(() => statusBreakdown(faceted), [faceted]);
  const refined = useMemo(() => applyRosterFilters(faceted, filters), [faceted, filters]);
  const searched = useMemo(
    () => (deferredSearch.trim()
      ? refined.filter((a) => matchesSearch(a, titleFor(a), deferredSearch))
      : refined),
    [refined, deferredSearch, titleFor],
  );
  const sorted = useMemo(() => sortColumn(searched, sort, now), [searched, sort, now]);
  const visible = useMemo(() => (sorted.length > limit ? sorted.slice(0, limit) : sorted), [sorted, limit]);

  // Reset the window whenever the result set changes, or a narrow search would
  // inherit a huge limit from a previous browse.
  useEffect(() => { setLimit(WINDOW_INITIAL); }, [facet, deferredSearch, sort, selectedJobIds, filters]);

  // Selection must never outlive the rows it points at, or the count lies.
  useEffect(() => {
    const live = new Set(applicants.map((a) => a.id));
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [applicants]);

  // ── windowing ─────────────────────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = visible.length < sorted.length;
  const atCap = hasMore && limit >= WINDOW_CAP;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || atCap) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLimit((n) => Math.min(n + WINDOW_STEP, WINDOW_CAP));
        }
      },
      { rootMargin: "240px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, atCap]);

  // ── selection ─────────────────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const selectAllVisible = useCallback(
    () => setSelectedIds((prev) => new Set([...prev, ...visible.map((a) => a.id)])),
    [visible],
  );

  const selectionActive = selectedIds.size > 0;
  const hiddenSelected = useMemo(() => {
    if (selectedIds.size === 0) return 0;
    const shown = new Set(sorted.map((a) => a.id));
    return [...selectedIds].filter((id) => !shown.has(id)).length;
  }, [selectedIds, sorted]);

  // ── row callbacks (hoisted, so memo on the row actually holds) ────────────
  // Deleting is permanent, so the row menu asks first.
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const handleDelete = useCallback((id: string) => setDeleteId(id), []);
  const deleteTarget = useMemo(
    () => (deleteId ? applicants.find((a) => a.id === deleteId) ?? null : null),
    [applicants, deleteId],
  );

  // ── quick preview + keyboard triage ───────────────────────────────────────
  // The preview walks `sorted` (the whole filtered list), not just mounted rows.
  const [peekId, setPeekId] = useState<string | null>(null);
  const [cursorId, setCursorId] = useState<string | null>(null);
  const openPeek = useCallback((id: string) => { setPeekId(id); setCursorId(id); }, []);
  const peeked = useMemo(
    () => (peekId ? applicants.find((a) => a.id === peekId) ?? null : null),
    [applicants, peekId],
  );
  const peekIndex = useMemo(() => (peekId ? sorted.findIndex((a) => a.id === peekId) : -1), [sorted, peekId]);

  const stepPeek = useCallback((delta: 1 | -1) => {
    const next = sorted[peekIndex === -1 ? 0 : peekIndex + delta];
    if (next) { setPeekId(next.id); setCursorId(next.id); }
  }, [sorted, peekIndex]);

  /** One decision, then straight on to the next person. Undo is on the toast. */
  const decide = useCallback((a: Applicant, status: ApplicantStatus) => {
    if (a.status === status) return;
    const previous = a.status;
    const label = APPLICANT_STATUSES.find((x) => x.value === status)?.label ?? status;
    const who = a.fullName?.trim() || "Candidate";
    const at = sorted.findIndex((x) => x.id === a.id);
    const following = at === -1 ? null : sorted[at + 1]?.id ?? null;
    if (peekId === a.id) {
      setPeekId(following);
      if (following) setCursorId(following);
      else toast.info("That was the last candidate in this list");
    }
    updateApplicantStatus(a.id, status)
      .then(() => toast.success(`${who} moved to ${label}`, {
        action: {
          label: "Undo",
          onClick: () => { updateApplicantStatus(a.id, previous).catch(() => toast.error("Could not undo that move.")); },
        },
      }))
      .catch(() => toast.error(`Could not move ${who}. Please retry.`));
  }, [sorted, peekId, updateApplicantStatus]);

  // "Review N new": the applications nobody has moved yet, one after another.
  const [reviewPending, setReviewPending] = useState(false);
  const startReview = useCallback(() => {
    setSearch("");
    setFilters(NO_FILTERS);
    setFacet("unopened");
    setReviewPending(true);
  }, []);
  useEffect(() => {
    if (!reviewPending || facet !== "unopened" || deferredSearch.trim()) return;
    setReviewPending(false);
    if (sorted[0]) openPeek(sorted[0].id);
  }, [reviewPending, facet, deferredSearch, sorted, openPeek]);

  // Keys: J / K move, Enter previews, X selects; in the preview S / E / R decide.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const key = e.key.toLowerCase();

      if (peeked) {
        if (key === "j" || key === "arrowdown") { e.preventDefault(); stepPeek(1); }
        else if (key === "k" || key === "arrowup") { e.preventDefault(); stepPeek(-1); }
        else if (key === "x") toggleSelect(peeked.id);
        else if (canWrite) {
          const d = PEEK_DECISIONS.find((x) => x.key === key);
          if (d) { e.preventDefault(); decide(peeked, d.status); }
        }
        return;
      }

      // Any other open menu or dialog owns the keyboard.
      if (document.querySelector('[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"]')) return;
      if (visible.length === 0) return;
      const at = cursorId ? visible.findIndex((a) => a.id === cursorId) : -1;
      const move = (to: number) => {
        const row = visible[Math.max(0, Math.min(visible.length - 1, to))];
        if (!row) return;
        setCursorId(row.id);
        document.getElementById(`ar-row-${row.id}`)?.scrollIntoView({ block: "nearest" });
      };
      if (key === "j") { e.preventDefault(); move(at + 1); }
      else if (key === "k") { e.preventDefault(); move(at === -1 ? 0 : at - 1); }
      else if (at !== -1 && key === "enter" && (!t || t === document.body)) { e.preventDefault(); openPeek(visible[at].id); }
      else if (at !== -1 && key === "x") toggleSelect(visible[at].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [peeked, visible, cursorId, canWrite, stepPeek, decide, toggleSelect, openPeek]);

  // After a bulk rejection: offer the message to send to the people just rejected.
  const [rejectionAudience, setRejectionAudience] = useState<RejectionAudience | null>(null);

  // ── bulk ──────────────────────────────────────────────────────────────────
  const runMove = useCallback(async (ids: string[], target: ApplicantStatus) => {
    const label = APPLICANT_STATUSES.find((s) => s.value === target)?.label ?? target;
    setMoving(true);
    try {
      const { updated } = await onBulkStatusUpdate(ids, target);
      if (target === "rejected" && updated.length > 0) {
        const moved = applicants.filter((a) => updated.includes(a.id));
        setRejectionAudience({
          emails: moved.map((a) => a.email?.trim()).filter((e): e is string => !!e),
          withoutEmail: moved.filter((a) => !a.email?.trim()).length,
          jobTitles: moved.map((a) => titleFor(a)),
        });
      }
      if (updated.length === ids.length) {
        toast.success(`Moved ${updated.length} candidate${updated.length === 1 ? "" : "s"} to ${label}`);
        clearSelection();
      } else {
        // The ones that did not land stay selected — the selection becomes the
        // retry queue instead of making you find them again.
        const missed = ids.filter((id) => !updated.includes(id));
        setSelectedIds(new Set(missed));
        toast.error(`Moved ${updated.length} of ${ids.length}. ${missed.length} did not move — still selected.`);
      }
    } catch {
      toast.error("Bulk move failed. Nothing was changed.");
    } finally {
      setMoving(false);
    }
  }, [onBulkStatusUpdate, clearSelection, applicants, titleFor]);

  const requestMove = useCallback((target: ApplicantStatus) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (TERMINAL.includes(target)) {
      setConfirm({ open: true, ids, target });
      return;
    }
    void runMove(ids, target);
  }, [selectedIds, runMove]);

  const handleAnalyze = useCallback(async () => {
    const chosen = applicants.filter((a) => selectedIds.has(a.id));
    if (chosen.length === 0) return;
    const result = await runAnalysis(chosen);

    const parts: string[] = [`${result.scored} scored`];
    if (result.skipped.length) parts.push(`${result.skipped.length} skipped`);
    if (result.failed.length) parts.push(`${result.failed.length} failed`);
    const detail = parts.join(" · ");

    if (result.cancelled) {
      toast.info(`Stopped. ${detail}. Everything scored so far is saved.`);
    } else if (result.failed.length === 0 && result.skipped.length === 0) {
      toast.success(`Scored ${result.scored} candidate${result.scored === 1 ? "" : "s"}`);
      clearSelection();
    } else {
      // Keep the ones that did not get a score selected, so a retry is one click.
      const unresolved = [...result.skipped, ...result.failed].map((f) => f.id);
      setSelectedIds(new Set(unresolved));
      toast.warning(`${detail}. ${unresolved.length} still selected — ${result.skipped[0]?.reason ?? result.failed[0]?.reason ?? ""}`);
    }
  }, [applicants, selectedIds, runAnalysis, clearSelection]);

  // Who the sweep would read: the "No email" list as currently filtered, minus
  // anyone with no CV file at all.
  const sweepTargets = useMemo(
    () => (facet === "noEmail"
      ? sorted.filter((a) => !a.email?.trim() && a.cvStoragePath && !sweptIds.has(a.id))
      : []),
    [facet, sorted, sweptIds],
  );
  const handleSweep = useCallback(async () => {
    setSweepResult(null);
    const result = await runSweep(sweepTargets);
    setSweepResult(result);
    setSweptIds((prev) => new Set([...prev, ...result.checkedIds]));
    if (result.emails > 0) toast.success(`Found ${result.emails} email${result.emails === 1 ? "" : "s"} in the CVs`);
  }, [runSweep, sweepTargets]);

  const filtersOn = facet !== "all" || deferredSearch.trim().length > 0 || activeFilterCount(filters) > 0;

  return (
    <div>
      {/* ── Header ── */}
      <PageHeader
        eyebrow="Hiring"
        title="Applicants"
        summary={
          <>
            {summary.applications === 0 ? (
                "No applications yet."
              ) : (
                <>
                  {summary.applications} application{summary.applications === 1 ? "" : "s"}
                  {summary.people > 0 && (
                    <>
                      {" from "}
                      {/* "about", not a precise headcount: candidates with no email
                          cannot be deduplicated, so this counts only the ones that can. */}
                      <span
                        title={
                          summary.unknownIdentity > 0
                            ? `${summary.unknownIdentity} application${summary.unknownIdentity === 1 ? " has" : "s have"} no email address, so they cannot be matched to a person. ${summary.people} distinct people among the rest.`
                            : `${summary.people} distinct people by email`
                        }
                        className={summary.unknownIdentity > 0 ? "underline decoration-dotted underline-offset-2" : undefined}
                      >
                        {summary.unknownIdentity > 0 ? `about ${summary.people}` : `${summary.people}`} people
                      </span>
                    </>
                  )}
                  {". "}
                  {summary.unopened > 0 && (
                    <span className="is-warn">
                      {summary.unopened} ha{summary.unopened === 1 ? "s" : "ve"} never been opened.
                    </span>
                  )}
                </>
              )}
          </>
        }
        actions={
          <>
            {summary.unopened > 0 && (
              <button type="button" className="dx-btn dx-btn--primary" onClick={startReview}>
                <ListChecks aria-hidden="true" />
                Review {summary.unopened} new
              </button>
            )}
            <Link to="/dashboard/pipeline" className="dx-btn dx-btn--secondary">
              <KanbanSquare aria-hidden="true" />
              Pipeline board
            </Link>
          </>
        }
      />

      {/* ── Stage navigator ──
          The primary way around the roster: where people are in the process.
          It drives the same stage filter as the Filters popover, so the two can
          never disagree. Counts follow the Focus chip but not search, so a
          number never jumps while you type. */}
      <nav className="ar-stages" aria-label="Filter by stage">
        <button
          type="button"
          aria-pressed={filters.stage === "all"}
          onClick={() => setFilters((f) => ({ ...f, stage: "all" }))}
          className={`ar-stage-tab${filters.stage === "all" ? " is-on" : ""}`}
        >
          <span className="ar-stage-tab__label">All stages</span>
          <span className="ar-stage-tab__n">{faceted.length}</span>
        </button>
        {STAGE_ORDER.map((status) => {
          const row = stageCounts.find((r) => r.status === status);
          const on = filters.stage === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={on}
              onClick={() => setFilters((f) => ({ ...f, stage: on ? "all" : status }))}
              className={`ar-stage-tab${on ? " is-on" : ""}${status === "rejected" ? " is-exit" : ""}`}
            >
              <span className="ar-stage-tab__label">
                <i style={{ background: STATUS_COLORS[status] }} aria-hidden="true" />
                {row?.label ?? status}
              </span>
              <span className="ar-stage-tab__n">{row?.count ?? 0}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Toolbar ── */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search name, email or role"
          label="Search candidates"
          className="flex-1"
        />

        <JobFilter jobs={jobs} selected={selectedJobIds} onChange={onJobIdsChange} counts={jobCounts} className="w-full sm:w-52" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="dx-tool shrink-0">
              Sort: {SORT_LABELS[sort]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Order by
            </DropdownMenuLabel>
            {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
              <DropdownMenuItem key={mode} className="gap-2 text-xs" onClick={() => setSort(mode)}>
                <Check className={`h-3 w-3 ${sort === mode ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
                {SORT_LABELS[mode]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <RosterFilters value={filters} onChange={setFilters} />
      </div>

      {/* ── Focus chips + result count ── */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="dx-chips" role="group" aria-label="Focus on">
          <span className="ar-focus-label">Focus</span>
          {facets.filter((f) => f.id !== "all").map((f) => {
            const active = facet === f.id;
            return (
              <Chip
                key={f.id}
                active={active}
                count={f.count}
                tone={f.id === "noEmail" ? "warning" : undefined}
                onClick={() => setFacet(active ? "all" : f.id)}
              >
                {f.label}
              </Chip>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <p className="dx-count">
            {filtersOn ? `${sorted.length} of ${applicants.length}` : `${sorted.length}`} candidate{sorted.length === 1 ? "" : "s"}
          </p>
          {visible.length > 0 && (
            <button
              type="button"
              onClick={selectionActive ? clearSelection : selectAllVisible}
              className="dx-link focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {selectionActive ? "Clear selection" : `Select these ${visible.length}`}
            </button>
          )}
        </div>
      </div>

      {/* ── "No email" repair strip ── shown where the gap is being looked at. */}
      {facet === "noEmail" && canWrite && (sweepTargets.length > 0 || sweepProgress || sweepResult) && (
        <ContactSweepStrip
          count={sweepTargets.length}
          progress={sweepProgress}
          result={sweepResult}
          onRun={handleSweep}
          onStop={cancelSweep}
          onDismiss={() => setSweepResult(null)}
        />
      )}

      {/* ── The list ── */}
      {sorted.length > 0 ? (
        <div className="dx-list ar-table" role="table" aria-label="Candidates">
          {/* Column headings. The three that can order the list are buttons, and
              say which way the list is sorted. */}
          <div className="ar-head" role="row">
            <span aria-hidden="true" />
            <span role="columnheader">Candidate</span>
            <SortHead mode="newest" sort={sort} onSort={setSort}>Role · applied</SortHead>
            <span role="columnheader">Stage</span>
            <SortHead mode="waiting" sort={sort} onSort={setSort}>In stage</SortHead>
            <SortHead mode="score" sort={sort} onSort={setSort} align="end">AI fit</SortHead>
            <span aria-hidden="true" />
          </div>
          {visible.map((a) => {
            const days = daysInStage(a, now);
            return (
              <ApplicantRow
                key={a.id}
                applicant={a}
                jobTitle={titleFor(a)}
                profileHref={applicantHref(a.id)}
                days={days}
                sla={slaState(a.status, days)}
                selected={selectedIds.has(a.id)}
                selectionActive={selectionActive}
                cursor={cursorId === a.id}
                onToggleSelect={toggleSelect}
                onDelete={handleDelete}
                onPeek={openPeek}
              />
            );
          })}

          {hasMore && !atCap && <div ref={sentinelRef} className="h-4" aria-hidden="true" />}

          {atCap && (
            // Honest about the cap rather than truncating silently.
            <div className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Showing {visible.length} of {sorted.length}</p>
              <button
                type="button"
                onClick={() => setLimit(SHOW_ALL)}
                className="mt-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Show all {sorted.length}
              </button>
            </div>
          )}
        </div>
      ) : (
        applicants.length === 0 ? (
          <EmptyState icon={LxApplicants} title="No applications yet" />
        ) : (
          <EmptyState icon={LxApplicants} title="Nothing matches these filters">
            <button type="button" onClick={() => { setFacet("all"); setSearch(""); setFilters(NO_FILTERS); }}>
              Clear filters and show all {applicants.length}
            </button>
          </EmptyState>
        )
      )}

      {sorted.length > 0 && (
        <p className="ar-keys" aria-hidden="true">
          <kbd>J</kbd><kbd>K</kbd> move <span>·</span> <kbd>Enter</kbd> preview <span>·</span> <kbd>X</kbd> select
          {canWrite && <> <span>·</span> in the preview <kbd>S</kbd> shortlist <kbd>E</kbd> reviewing <kbd>R</kbd> reject</>}
        </p>
      )}

      <CandidatePeek
        applicant={peeked}
        jobTitle={peeked ? titleFor(peeked) : ""}
        profileHref={peeked ? applicantHref(peeked.id) : ""}
        position={peekIndex + 1}
        total={sorted.length}
        days={peeked ? daysInStage(peeked, now) : 0}
        sla={peeked ? slaState(peeked.status, daysInStage(peeked, now)) : "ok"}
        canDecide={canWrite}
        sessionToken={sessionToken}
        onClose={() => setPeekId(null)}
        onPrev={() => stepPeek(-1)}
        onNext={() => stepPeek(1)}
        onDecide={(status) => { if (peeked) decide(peeked, status); }}
        onAddNote={onAddNote}
      />

      <RejectionNotice audience={rejectionAudience} onClose={() => setRejectionAudience(null)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.fullName?.trim() || "This candidate"}</strong> and their application,
              notes and analysis will be removed for good. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const id = deleteId;
                setDeleteId(null);
                if (id) onDeleteApplicant(id).catch(() => toast.error("Could not delete that candidate."));
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RosterBulkBar
        count={selectedIds.size}
        hiddenCount={hiddenSelected}
        moving={moving}
        analysis={analysisProgress}
        onMove={requestMove}
        onAnalyze={handleAnalyze}
        onCompare={() => setComparing(true)}
        onCancelAnalysis={cancelAnalysis}
        onClear={clearSelection}
      />

      <CompareDrawer
        open={comparing}
        onOpenChange={setComparing}
        applicants={applicants}
        selectedIds={selectedIds}
        onRemove={toggleSelect}
        onClear={clearSelection}
      />

      <AlertDialog open={confirm.open} onOpenChange={(open) => !open && setConfirm({ open: false, ids: [], target: "new" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move to {APPLICANT_STATUSES.find((s) => s.value === confirm.target)?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Move <strong>{confirm.ids.length} candidate{confirm.ids.length === 1 ? "" : "s"}</strong> to{" "}
              <strong>{APPLICANT_STATUSES.find((s) => s.value === confirm.target)?.label}</strong>?
              They can be moved back afterwards, but not in one step.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const { ids, target } = confirm;
                setConfirm({ open: false, ids: [], target: "new" });
                void runMove(ids, target);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** A sortable column heading: a button that orders the list, with aria-sort on the header. */
function SortHead({
  mode, sort, onSort, align, children,
}: {
  mode: SortMode;
  sort: SortMode;
  onSort: (mode: SortMode) => void;
  align?: "end";
  children: ReactNode;
}) {
  const on = sort === mode;
  return (
    <span role="columnheader" aria-sort={on ? "descending" : "none"} className={align === "end" ? "text-right" : undefined}>
      <button type="button" onClick={() => onSort(mode)} className={`ar-sort${on ? " is-on" : ""}`} title={`Order by ${SORT_LABELS[mode].toLowerCase()}`}>
        {children}
        <ArrowDown className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}

/**
 * Offer to read the "No email" candidates' CVs for their contact details.
 * Plain pattern matching on the CV's own text and links — no AI, so it cannot
 * invent an address — and it only fills fields that are empty.
 */
function ContactSweepStrip({
  count, progress, result, onRun, onStop, onDismiss,
}: {
  count: number;
  progress: { total: number; done: number; current: string | null } | null;
  result: ContactSweepResult | null;
  onRun: () => void;
  onStop: () => void;
  onDismiss: () => void;
}) {
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const minutes = Math.max(1, Math.round((count * 2.4) / 60));

  if (progress) {
    const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <div className="ar-sweep dx-card" role="status" aria-live="polite">
        <Loader2 className="ar-sweep__icon animate-spin" aria-hidden="true" />
        <div className="ar-sweep__body">
          <p className="ar-sweep__title">
            Reading CV {progress.done + 1} of {progress.total}
            {progress.current ? <span className="ar-sweep__muted"> · {progress.current}</span> : null}
          </p>
          <div className="ar-sweep__bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        </div>
        <button type="button" className="dx-btn dx-btn--secondary" onClick={onStop}>Stop</button>
      </div>
    );
  }

  if (result) {
    const found = [
      result.emails && plural(result.emails, "email"),
      result.phones && plural(result.phones, "phone number"),
      result.linkedins && plural(result.linkedins, "LinkedIn profile"),
      result.names && `fixed ${plural(result.names, "name")}`,
    ].filter(Boolean) as string[];
    return (
      <div className="ar-sweep dx-card" role="status">
        <FileSearch className="ar-sweep__icon" aria-hidden="true" />
        <div className="ar-sweep__body">
          <p className="ar-sweep__title">
            {result.cancelled ? "Stopped. " : ""}
            {found.length ? `Found ${found.join(", ").replace(/, ([^,]*)$/, " and $1")}.` : "No new contact details found."}
          </p>
          <p className="ar-sweep__muted">
            {result.noEmailOnCv > 0 && `${plural(result.noEmailOnCv, "CV")} print no email. Most are LinkedIn PDF exports, which leave it out, so ask the candidate or check their LinkedIn. `}
            {result.unreadable > 0 && `${plural(result.unreadable, "CV")} couldn't be read (a scan, a Word file or a missing file). `}
            {result.duplicates > 0 && `${plural(result.duplicates, "CV")} print${result.duplicates === 1 ? "s" : ""} an email that another application for the same role already uses, so ${result.duplicates === 1 ? "it looks like a duplicate" : "they look like duplicates"}. `}
            {result.failed > 0 && `${plural(result.failed, "CV")} failed to load; you can run those again.`}
          </p>
        </div>
        <button type="button" className="dx-btn dx-btn--secondary" onClick={onDismiss}>Done</button>
      </div>
    );
  }

  return (
    <div className="ar-sweep dx-card">
      <FileSearch className="ar-sweep__icon" aria-hidden="true" />
      <div className="ar-sweep__body">
        <p className="ar-sweep__title">Find their emails in their CVs</p>
        <p className="ar-sweep__muted">
          Reads each CV's text and links for an email, phone number and LinkedIn profile. No AI, and it only
          fills fields that are empty. About {plural(minutes, "minute")} for {plural(count, "CV")}.
        </p>
      </div>
      <button type="button" className="dx-btn dx-btn--primary" onClick={onRun}>
        <FileSearch aria-hidden="true" />
        Read {plural(count, "CV")}
      </button>
    </div>
  );
}
