import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Search, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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
import { TONE_TEXT } from "../statusColors";
import ApplicantRow from "./ApplicantRow";
import RosterBulkBar from "./RosterBulkBar";
import RosterFilters from "./RosterFilters";
import CompareDrawer from "./CompareDrawer";
import { useBulkAnalysis } from "./useBulkAnalysis";
import JobFilter from "./JobFilter";
import { LxApplicants } from "@/components/icons/lumofy";

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
  applicantHref: (applicantId: string) => string;
  onBulkStatusUpdate: (ids: string[], status: ApplicantStatus) => Promise<{ updated: string[] }>;
  onDeleteApplicant: (id: string) => Promise<void>;
  onAnalysisComplete: (applicantId: string, analysis: AIAnalysis) => void;
  getJobTitle: (jobId: string) => string;
  sessionToken: string | null;
}

export default function ApplicantsRoster({
  applicants, jobs, selectedJobIds, onJobIdsChange, applicantHref,
  onBulkStatusUpdate, onDeleteApplicant, onAnalysisComplete, getJobTitle, sessionToken,
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

  // ── derivation chain ──────────────────────────────────────────────────────
  const facets = useMemo(() => rosterFacets(applicants, now), [applicants, now]);
  const summary = useMemo(() => rosterSummary(applicants), [applicants]);

  // Typing stays responsive while the list re-renders at low priority.
  const deferredSearch = useDeferredValue(search);

  const faceted = useMemo(
    () => (facet === "all" ? applicants : applicants.filter((a) => ROSTER_FACETS[facet](a, now))),
    [applicants, facet, now],
  );
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
  const handleDelete = useCallback((id: string) => {
    onDeleteApplicant(id).catch(() => toast.error("Could not delete that candidate."));
  }, [onDeleteApplicant]);

  // ── bulk ──────────────────────────────────────────────────────────────────
  const runMove = useCallback(async (ids: string[], target: ApplicantStatus) => {
    const label = APPLICANT_STATUSES.find((s) => s.value === target)?.label ?? target;
    setMoving(true);
    try {
      const { updated } = await onBulkStatusUpdate(ids, target);
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
  }, [onBulkStatusUpdate, clearSelection]);

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

  const filtersOn = facet !== "all" || deferredSearch.trim().length > 0 || activeFilterCount(filters) > 0;

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <LxApplicants className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Applicants</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
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
                    <span className={TONE_TEXT.warning}>
                      {summary.unopened} ha{summary.unopened === 1 ? "s" : "ve"} never been opened.
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Facet chips ── */}
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filter candidates">
        {facets.map((f) => {
          const active = facet === f.id;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFacet(active && f.id !== "all" ? "all" : f.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-card))] text-muted-foreground hover:border-primary/40"
              }`}
            >
              {f.label}
              <span className="ml-1.5 tabular-nums text-muted-foreground">{f.count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ── */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or role"
            aria-label="Search candidates"
            className="h-9 rounded-xl pl-8 pr-8 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <JobFilter jobs={jobs} selected={selectedJobIds} onChange={onJobIdsChange} className="w-full sm:w-52" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 shrink-0 rounded-xl text-xs">
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

      {/* ── Result count + select-all ── */}
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground tabular-nums">
          {filtersOn ? `${sorted.length} of ${applicants.length}` : `${sorted.length}`} candidate{sorted.length === 1 ? "" : "s"}
        </p>
        {visible.length > 0 && (
          <button
            type="button"
            onClick={selectionActive ? clearSelection : selectAllVisible}
            className="text-xs text-primary transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {selectionActive ? "Clear selection" : `Select these ${visible.length}`}
          </button>
        )}
      </div>

      {/* ── The list ── */}
      {sorted.length > 0 ? (
        <div className="divide-y divide-[hsl(var(--intel-border))] overflow-hidden rounded-xl border border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-card))]">
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
                onToggleSelect={toggleSelect}
                onDelete={handleDelete}
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
        <div className="rounded-xl border border-dashed border-[hsl(var(--intel-border))] py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
            <LxApplicants className="h-6 w-6 text-muted-foreground/40" />
          </div>
          {applicants.length === 0 ? (
            <p className="font-medium">No applications yet</p>
          ) : (
            <>
              <p className="font-medium">Nothing matches these filters</p>
              <button
                type="button"
                onClick={() => { setFacet("all"); setSearch(""); setFilters(NO_FILTERS); }}
                className="mt-1 text-xs text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Clear filters and show all {applicants.length}
              </button>
            </>
          )}
        </div>
      )}

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
