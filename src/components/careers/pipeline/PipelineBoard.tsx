import {
  useCallback, useEffect, useMemo, useRef, useState,
  type Dispatch, type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import {
  DragDropContext, Draggable, type DropResult, type DraggableProvided,
  type DraggableProvidedDragHandleProps, type DraggableRubric, type DraggableStateSnapshot,
} from "@hello-pangea/dnd";
import { KanbanSquare, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Applicant, ApplicantStatus, Job } from "@/types/careers";
import { APPLICANT_STATUSES } from "@/types/careers";
import {
  BOARD_STAGES, TRIAGE_FILTERS, daysInStage, defaultCollapsedStages, groupByStage,
  matchesSearch, slaState, sortColumn, triageFacts,
} from "@/lib/pipelineMetrics";
import type { PipelineViewState } from "./pipelineView";
import PipelineCandidateCard from "../PipelineCandidateCard";
import PipelineColumn from "./PipelineColumn";
import PipelineTriageBar from "./PipelineTriageBar";
import BulkActionBar from "./BulkActionBar";

export interface PipelineBoardProps {
  /**
   * ALL applicants, unfiltered. The board applies the job filter itself, because
   * the multi-apply badge has to count a person's roles across every job even
   * when the board is scoped to one.
   */
  applicants: Applicant[];
  jobs: Job[];
  selectedJobId: string;
  onJobChange: (jobId: string) => void;
  onStatusUpdate: (id: string, status: ApplicantStatus) => Promise<void>;
  onBulkStatusUpdate: (ids: string[], status: ApplicantStatus) => Promise<{ updated: string[] }>;
  onOpenApplicant: (a: Applicant) => void;
  /**
   * The same destination as an href, so candidate names render as real anchors.
   * Right-click "open in new tab" and Cmd-click then work, and a hiring manager can
   * fan several candidates out into tabs instead of walking the board one at a time.
   * Must be referentially stable — the cards are memoized.
   */
  applicantHref: (applicantId: string) => string;
  view: PipelineViewState;
  /**
   * Must accept an updater function, not just a value.
   *
   * Several interactions fire two view updates in one tick — clearing a triage
   * chip and typing in search, or a drop that both expands a rail and moves a
   * card. Spreading a `view` captured at render time loses the first of those
   * silently, which is exactly how a cleared filter came back to life.
   */
  onViewChange: Dispatch<SetStateAction<PipelineViewState>>;
}

const WINDOW_INITIAL = 40;
const WINDOW_STEP = 40;
/**
 * Hard ceiling on mounted cards per column. Growth without a cap just defers the
 * original problem — 321 mounted Draggables, each with a dropdown root. Past the
 * cap the column says so and offers an explicit opt-in.
 */
const WINDOW_CAP = 160;
const SHOW_ALL = Number.MAX_SAFE_INTEGER;

const TERMINAL: ApplicantStatus[] = ["rejected", "hired"];
const isTerminal = (s: ApplicantStatus) => TERMINAL.includes(s);

type ConfirmState = {
  open: boolean;
  ids: string[];
  /** Name for a single move; the count carries a bulk one. */
  name: string;
  target: ApplicantStatus;
};

const CLOSED_CONFIRM: ConfirmState = { open: false, ids: [], name: "", target: "new" };

export default function PipelineBoard({
  applicants, jobs, selectedJobId, onJobChange, onStatusUpdate, onBulkStatusUpdate,
  onOpenApplicant, applicantHref, view, onViewChange,
}: PipelineBoardProps) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [windows, setWindows] = useState<Partial<Record<ApplicantStatus, number>>>({});
  const [confirm, setConfirm] = useState<ConfirmState>(CLOSED_CONFIRM);
  const [bulkRunning, setBulkRunning] = useState(false);

  // Days-in-stage is recomputed off this rather than Date.now() inside the card,
  // so cards stay memoizable. A minute is well below the one-day granularity the
  // number actually has.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  /**
   * Windows must not grow mid-drag. @hello-pangea/dnd measures every Draggable
   * at lift; mounting more of them while a card is in the air (which its own
   * auto-scroller will trigger by scrolling a column) leaves placeholders
   * against stale dimensions.
   */
  const frozenRef = useRef(false);

  const patchView = useCallback(
    (patch: Partial<PipelineViewState>) => onViewChange((prev) => ({ ...prev, ...patch })),
    [onViewChange],
  );

  /** Same, for patches that need to read the previous value (nested maps). */
  const updateView = useCallback(
    (fn: (prev: PipelineViewState) => PipelineViewState) => onViewChange(fn),
    [onViewChange],
  );

  const jobTitleById = useMemo(() => new Map(jobs.map((j) => [j.id, j.title])), [jobs]);
  const titleFor = useCallback(
    (a: Applicant) => a.jobTitle || jobTitleById.get(a.jobId) || "Unknown role",
    [jobTitleById],
  );

  /** How many DISTINCT jobs each person (by email) has applied to — across ALL jobs. */
  const jobsAppliedByEmail = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const a of applicants) {
      const email = a.email?.trim().toLowerCase();
      if (!email) continue;
      if (!map.has(email)) map.set(email, new Set());
      map.get(email)!.add(a.jobId || a.jobTitle || "");
    }
    return map;
  }, [applicants]);

  const scoped = useMemo(
    () => (selectedJobId === "all" ? applicants : applicants.filter((a) => a.jobId === selectedJobId)),
    [applicants, selectedJobId],
  );

  const facts = useMemo(() => triageFacts(scoped, now), [scoped, now]);

  const filtered = useMemo(() => {
    const triage = view.activeTriage ? TRIAGE_FILTERS[view.activeTriage] : null;
    const q = view.search.trim();
    if (!triage && !q) return scoped;
    return scoped.filter((a) => (!triage || triage(a, now)) && matchesSearch(a, titleFor(a), q));
  }, [scoped, view.activeTriage, view.search, now, titleFor]);

  const unfilteredGroups = useMemo(() => groupByStage(scoped), [scoped]);
  const filteredGroups = useMemo(() => groupByStage(filtered), [filtered]);

  /** Sorted full list per stage. Columns render a prefix of these. */
  const sortedGroups = useMemo(() => {
    const out = {} as Record<ApplicantStatus, Applicant[]>;
    for (const s of APPLICANT_STATUSES) {
      out[s.value] = sortColumn(filteredGroups[s.value], view.sortByStage[s.value] ?? "score", now);
    }
    return out;
  }, [filteredGroups, view.sortByStage, now]);

  /** Index by id for renderClone — index lookups break the moment a column is sorted or windowed. */
  const byId = useMemo(() => new Map(applicants.map((a) => [a.id, a])), [applicants]);

  const collapsedDefaults = useMemo(() => {
    const counts = {} as Record<ApplicantStatus, number>;
    for (const s of APPLICANT_STATUSES) counts[s.value] = unfilteredGroups[s.value].length;
    return new Set(defaultCollapsedStages(counts));
  }, [unfilteredGroups]);

  const isCollapsed = useCallback(
    (s: ApplicantStatus) => view.collapsedOverrides[s] ?? collapsedDefaults.has(s),
    [view.collapsedOverrides, collapsedDefaults],
  );

  // Selection must never outlive the rows it points at, or the count lies.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set([...prev].filter((id) => byId.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [byId]);

  // Changing the job filter changes the pool underneath a selection entirely.
  useEffect(() => { setSelectedIds(new Set()); }, [selectedJobId]);

  // ---- selection -----------------------------------------------------------

  /** Latest sorted lists, for resolving a shift-click range without re-creating callbacks. */
  const sortedRef = useRef(sortedGroups);
  sortedRef.current = sortedGroups;
  const anchorRef = useRef<string | null>(null);

  const toggleSelect = useCallback((id: string, mode: "toggle" | "range") => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (mode === "range" && anchorRef.current) {
        // Ranges only make sense inside one column — a span across stages has no
        // meaning, so fall back to a plain toggle if the two are in different ones.
        const anchor = anchorRef.current;
        const column = APPLICANT_STATUSES
          .map((s) => sortedRef.current[s.value])
          .find((list) => list.some((a) => a.id === id) && list.some((a) => a.id === anchor));
        if (column) {
          const from = column.findIndex((a) => a.id === anchor);
          const to = column.findIndex((a) => a.id === id);
          for (let i = Math.min(from, to); i <= Math.max(from, to); i++) next.add(column[i].id);
          return next;
        }
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      anchorRef.current = id;
      return next;
    });
  }, []);

  const selectAllIn = useCallback((ids: string[]) => {
    setSelectedIds((prev) => new Set([...prev, ...ids]));
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ---- moving --------------------------------------------------------------

  const runMove = useCallback(async (ids: string[], target: ApplicantStatus) => {
    const label = APPLICANT_STATUSES.find((s) => s.value === target)?.label ?? target;
    if (ids.length === 1) {
      try {
        await onStatusUpdate(ids[0], target);
      } catch {
        /* onStatusUpdate already surfaced the failure and rolled back */
      }
      return;
    }
    setBulkRunning(true);
    try {
      const { updated } = await onBulkStatusUpdate(ids, target);
      if (updated.length === ids.length) {
        toast.success(`Moved ${updated.length} candidates to ${label}`);
        clearSelection();
      } else {
        // Keep the ones that did not land selected — the selection becomes the
        // retry queue rather than the user having to find them again.
        const missed = ids.filter((id) => !updated.includes(id));
        setSelectedIds(new Set(missed));
        toast.error(`Moved ${updated.length} of ${ids.length}. ${missed.length} did not move — still selected.`);
      }
    } catch {
      toast.error("Bulk move failed. Nothing was changed.");
    } finally {
      setBulkRunning(false);
    }
  }, [onStatusUpdate, onBulkStatusUpdate, clearSelection]);

  /** Terminal stages are confirmed first; everything else moves straight away. */
  const requestMove = useCallback((ids: string[], target: ApplicantStatus, name: string) => {
    if (ids.length === 0) return;
    if (isTerminal(target)) {
      setConfirm({ open: true, ids, name, target });
      return;
    }
    void runMove(ids, target);
  }, [runMove]);

  const confirmMove = useCallback(async () => {
    const { ids, target } = confirm;
    setConfirm(CLOSED_CONFIRM);
    await runMove(ids, target);
  }, [confirm, runMove]);

  const handleDragStart = useCallback(() => { frozenRef.current = true; }, []);

  const handleDragEnd = useCallback((result: DropResult) => {
    frozenRef.current = false;
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const target = destination.droppableId as ApplicantStatus;
    const applicant = byId.get(draggableId);
    if (!applicant) return;

    // Dropping onto a rail expands it. The old code defaulted collapse from the
    // count, so a MANUALLY collapsed column stayed a rail forever even after
    // receiving a candidate — clearing the override is what actually fixes it.
    if (isCollapsed(target)) {
      updateView((prev) => ({ ...prev, collapsedOverrides: { ...prev.collapsedOverrides, [target]: false } }));
    }

    // Dragging a card that happens to be selected moves only that card, and
    // drops the selection. Applying a drag to a whole multi-selection is not
    // something the library models, and silently moving 40 people because one
    // was dragged is not a mistake worth risking.
    if (selectedIds.has(draggableId) && selectedIds.size > 1) clearSelection();

    requestMove([draggableId], target, applicant.fullName);
  }, [byId, isCollapsed, updateView, selectedIds, clearSelection, requestMove]);

  // ---- windowing -----------------------------------------------------------

  const growWindow = useCallback((s: ApplicantStatus) => {
    if (frozenRef.current) return;
    setWindows((w) => ({ ...w, [s]: Math.min((w[s] ?? WINDOW_INITIAL) + WINDOW_STEP, WINDOW_CAP) }));
  }, []);

  /** Stable per-stage handlers so the columns' IntersectionObservers aren't torn down every render. */
  const reachEndHandlers = useMemo(() => {
    const m = {} as Record<ApplicantStatus, () => void>;
    for (const s of APPLICANT_STATUSES) m[s.value] = () => growWindow(s.value);
    return m;
  }, [growWindow]);

  const showAllHandlers = useMemo(() => {
    const m = {} as Record<ApplicantStatus, () => void>;
    for (const s of APPLICANT_STATUSES) m[s.value] = () => setWindows((w) => ({ ...w, [s.value]: SHOW_ALL }));
    return m;
  }, []);

  // ---- card rendering ------------------------------------------------------

  const handleOpen = useCallback((id: string) => {
    const a = byId.get(id);
    if (a) onOpenApplicant(a);
  }, [byId, onOpenApplicant]);

  const handleCardMove = useCallback((id: string, target: ApplicantStatus) => {
    const a = byId.get(id);
    if (!a || a.status === target) return;
    requestMove([id], target, a.fullName);
  }, [byId, requestMove]);

  const selectionActive = selectedIds.size > 0;

  const renderCardBody = useCallback(
    (a: Applicant, dragHandleProps: DraggableProvidedDragHandleProps | null, isDragging: boolean) => {
      const days = daysInStage(a, now);
      return (
        <PipelineCandidateCard
          applicant={a}
          jobTitle={titleFor(a)}
          profileHref={applicantHref(a.id)}
          days={days}
          sla={slaState(a.status, days)}
          appliedJobsCount={a.email ? (jobsAppliedByEmail.get(a.email.trim().toLowerCase())?.size ?? 1) : 1}
          isDragging={isDragging}
          selected={selectedIds.has(a.id)}
          selectionActive={selectionActive}
          dragHandleProps={dragHandleProps}
          onOpen={handleOpen}
          onMoveToStage={isDragging ? undefined : handleCardMove}
          onToggleSelect={isDragging ? undefined : toggleSelect}
        />
      );
    },
    [now, titleFor, applicantHref, jobsAppliedByEmail, selectedIds, selectionActive, handleOpen, handleCardMove, toggleSelect],
  );

  /**
   * The dragged card is portalled to <body>.
   *
   * The tab wrapper animates to `filter: blur(0px)` — a non-none filter, which
   * permanently creates a containing block for `position: fixed`. Without the
   * portal the clone gets re-anchored and clipped the moment it leaves its
   * column.
   *
   * Looked up by draggableId, not `list[rubric.source.index]`: index lookup only
   * held while the rendered array was the whole column, which stopped being true
   * once columns gained sorting and windowing.
   */
  const renderClone = useCallback(
    (prov: DraggableProvided, _snap: DraggableStateSnapshot, rubric: DraggableRubric) => {
      const dragged = byId.get(rubric.draggableId);
      return createPortal(
        <div ref={prov.innerRef} {...prov.draggableProps}>
          {dragged ? renderCardBody(dragged, prov.dragHandleProps, true) : null}
        </div>,
        document.body,
      );
    },
    [byId, renderCardBody],
  );

  const totalShown = filtered.length;
  const hiddenSelected = useMemo(() => {
    if (selectedIds.size === 0) return 0;
    const visible = new Set(filtered.map((a) => a.id));
    return [...selectedIds].filter((id) => !visible.has(id)).length;
  }, [selectedIds, filtered]);

  const filtersOn = view.search.trim().length > 0 || view.activeTriage !== null;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="mb-3 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <KanbanSquare className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
            <p className="text-sm text-muted-foreground tabular-nums">
              {filtersOn
                ? `${totalShown} of ${scoped.length} candidates`
                : `${scoped.length} candidate${scoped.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={view.search}
              onChange={(e) => patchView({ search: e.target.value })}
              placeholder="Search name, email or role"
              aria-label="Search the board"
              className="h-9 w-full rounded-xl pl-8 pr-8 text-sm sm:w-64"
            />
            {view.search && (
              <button
                type="button"
                onClick={() => patchView({ search: "" })}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <Select value={selectedJobId} onValueChange={onJobChange}>
            <SelectTrigger className="h-9 w-full shrink-0 rounded-xl border-border bg-card sm:w-56">
              <SelectValue placeholder="Filter by job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-3 shrink-0">
        <PipelineTriageBar
          facts={facts}
          active={view.activeTriage}
          onToggle={(id) => patchView({ activeTriage: id })}
        />
      </div>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex min-h-0 flex-1 snap-x snap-proximity items-stretch gap-2.5 overflow-x-auto overscroll-x-contain scrollbar-slim pb-1">
          {BOARD_STAGES.map((stage) => {
            const status = stage.value;
            const list = sortedGroups[status];
            const limit = windows[status] ?? WINDOW_INITIAL;
            const visible = list.length > limit ? list.slice(0, limit) : list;
            return (
              <PipelineColumn
                key={status}
                status={status}
                label={stage.label}
                visible={visible}
                total={list.length}
                totalUnfiltered={unfilteredGroups[status].length}
                sort={view.sortByStage[status] ?? "score"}
                onSortChange={(mode) =>
                  updateView((prev) => ({ ...prev, sortByStage: { ...prev.sortByStage, [status]: mode } }))
                }
                collapsed={isCollapsed(status)}
                onToggleCollapse={(collapsed) =>
                  updateView((prev) => ({
                    ...prev,
                    collapsedOverrides: { ...prev.collapsedOverrides, [status]: collapsed },
                  }))
                }
                onReachEnd={reachEndHandlers[status]}
                hasMore={visible.length < list.length}
                atCap={visible.length < list.length && limit >= WINDOW_CAP}
                onShowAll={showAllHandlers[status]}
                selectable
                onSelectAllVisible={() => selectAllIn(visible.map((a) => a.id))}
                renderClone={renderClone}
                renderCard={(a, index) => (
                  <Draggable key={a.id} draggableId={a.id} index={index}>
                    {(prov, snap) => (
                      <div ref={prov.innerRef} {...prov.draggableProps}>
                        {renderCardBody(a, prov.dragHandleProps, snap.isDragging)}
                      </div>
                    )}
                  </Draggable>
                )}
              />
            );
          })}
        </div>
      </DragDropContext>

      <BulkActionBar
        count={selectedIds.size}
        hiddenCount={hiddenSelected}
        running={bulkRunning}
        onMove={(target) => requestMove([...selectedIds], target, "")}
        onClear={clearSelection}
      />

      <AlertDialog open={confirm.open} onOpenChange={(open) => !open && setConfirm(CLOSED_CONFIRM)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move to {APPLICANT_STATUSES.find((s) => s.value === confirm.target)?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.ids.length === 1 ? (
                <>
                  Move <strong>{confirm.name}</strong> to{" "}
                  <strong>{APPLICANT_STATUSES.find((s) => s.value === confirm.target)?.label}</strong>?
                  You can move them back afterwards.
                </>
              ) : (
                <>
                  Move <strong>{confirm.ids.length} candidates</strong> to{" "}
                  <strong>{APPLICANT_STATUSES.find((s) => s.value === confirm.target)?.label}</strong>?
                  They can be moved back afterwards, but not in one step.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMove}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
