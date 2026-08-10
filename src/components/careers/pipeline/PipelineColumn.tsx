import { useEffect, useRef, type ReactNode } from "react";
import { Droppable, type DroppableProps } from "@hello-pangea/dnd";
import { ChevronsLeftRight, ChevronsRightLeft, MoreVertical, Check } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Applicant, ApplicantStatus } from "@/types/careers";
import { STATUS_COLORS } from "../statusColors";
import { SORT_LABELS, type SortMode } from "@/lib/pipelineMetrics";

export interface PipelineColumnProps {
  status: ApplicantStatus;
  label: string;
  /** The prefix of this column's sorted list that is actually mounted. */
  visible: Applicant[];
  /** How many match the current filters — what the badge shows. */
  total: number;
  /** Unfiltered stage size, so a filtered column can say "12 of 321". */
  totalUnfiltered: number;
  sort: SortMode;
  onSortChange: (s: SortMode) => void;
  collapsed: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
  /** Sentinel scrolled into view — grow the window. Ignored while a drag is in flight. */
  onReachEnd: () => void;
  hasMore: boolean;
  atCap: boolean;
  onShowAll: () => void;
  selectable: boolean;
  onSelectAllVisible: () => void;
  renderCard: (a: Applicant, index: number) => ReactNode;
  /** Portals the dragged card to <body> — see the note on the board's renderClone. */
  renderClone: DroppableProps["renderClone"];
}

export default function PipelineColumn({
  status, label, visible, total, totalUnfiltered, sort, onSortChange, collapsed,
  onToggleCollapse, onReachEnd, hasMore, atCap, onShowAll, selectable,
  onSelectAllVisible, renderCard, renderClone,
}: PipelineColumnProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const accent = STATUS_COLORS[status];

  // Grow the window when the sentinel comes into view. The board decides whether
  // to honour it — during a drag it does not, because mounting new Draggables
  // mid-lift makes @hello-pangea/dnd place its placeholder against stale
  // dimensions.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) onReachEnd(); },
      { rootMargin: "240px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, onReachEnd]);

  if (collapsed) {
    return (
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex h-full min-h-0 w-11 shrink-0 snap-start flex-col items-center overflow-hidden rounded-xl border py-2.5 transition-colors duration-200 ${
              snapshot.isDraggingOver
                ? "border-primary/50 bg-primary/10"
                : "border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-surface))]"
            }`}
          >
            <button
              type="button"
              onClick={() => onToggleCollapse(false)}
              aria-label={`Expand ${label} column`}
              title={`Expand ${label}`}
              className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-[hsl(var(--intel-card-hover))] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronsLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <div className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />
            <span className="mt-2 [writing-mode:vertical-rl] rotate-180 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
              {label}
            </span>
            <span className="mt-2 rounded-full bg-[hsl(var(--intel-card-hover))] px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-foreground/70">
              {total}
            </span>
            <div className="flex-1" />
            {/* rbd requires the placeholder in the tree; a rail has no room for it. */}
            <div className="hidden">{provided.placeholder}</div>
          </div>
        )}
      </Droppable>
    );
  }

  return (
    // Width ladder. The floor is set by the narrowest laptop we care about:
    // at 1366 with the 256px sidebar there is ~1046px of board, and four columns
    // plus two 44px rails plus gaps have to fit inside it — hence 224px, not the
    // 248 that pushed the last rail off-screen. Larger breakpoints let the
    // columns breathe; 4xl caps them so an ultrawide doesn't stretch a card to
    // half a metre.
    <div className="flex h-full min-h-0 flex-[1_1_224px] snap-start flex-col overflow-hidden rounded-xl border border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-surface))] min-w-[224px] 2xl:min-w-[264px] 3xl:min-w-[300px] 4xl:max-w-[440px]">
      {/* 2px stage accent. A top rule, not a side stripe — it reads as a tab on
          the column rather than decoration bolted to its edge. */}
      <div className="h-0.5 w-full shrink-0" style={{ backgroundColor: accent }} aria-hidden="true" />

      <div className="flex shrink-0 items-center justify-between gap-1.5 border-b border-[hsl(var(--intel-border))] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground truncate">
            {label}
          </span>
          <span className="shrink-0 rounded-full bg-[hsl(var(--intel-card-hover))] px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-foreground/70">
            {total}
          </span>
          {total !== totalUnfiltered && (
            <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums" title={`${total} of ${totalUnfiltered} match the current filters`}>
              of {totalUnfiltered}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`${label} column options`}
                title="Sort and select"
                className="rounded-md p-1 text-muted-foreground/50 transition-colors hover:bg-[hsl(var(--intel-card-hover))] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MoreVertical className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sort by
              </DropdownMenuLabel>
              {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                <DropdownMenuItem key={mode} className="gap-2 text-xs cursor-pointer" onClick={() => onSortChange(mode)}>
                  <Check className={`w-3 h-3 ${sort === mode ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
                  {SORT_LABELS[mode]}
                </DropdownMenuItem>
              ))}
              {selectable && visible.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs cursor-pointer" onClick={onSelectAllVisible}>
                    Select these {visible.length}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => onToggleCollapse(true)}
            aria-label={`Collapse ${label} column`}
            title="Collapse column"
            className="rounded-md p-1 text-muted-foreground/40 transition-colors hover:bg-[hsl(var(--intel-card-hover))] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronsRightLeft className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Droppable droppableId={status} renderClone={renderClone}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-0 flex-1 space-y-2 overflow-y-auto scrollbar-slim p-2 transition-colors duration-200 ${
              snapshot.isDraggingOver ? "bg-primary/5 ring-2 ring-inset ring-primary/25" : ""
            }`}
          >
            {visible.map((a, i) => renderCard(a, i))}
            {provided.placeholder}

            {total === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-[hsl(var(--intel-border))] py-8 text-center">
                <p className="text-[11px] text-muted-foreground/60">
                  {totalUnfiltered === 0 ? "Drop candidates here" : "None match the filters"}
                </p>
              </div>
            )}

            {hasMore && !atCap && <div ref={sentinelRef} className="h-4" aria-hidden="true" />}

            {atCap && (
              // Honest about the cap rather than silently truncating: an
              // unbounded window would eventually mount all 321 cards again.
              <div className="rounded-lg border border-dashed border-[hsl(var(--intel-border))] p-2.5 text-center">
                <p className="text-[11px] text-muted-foreground">
                  Showing {visible.length} of {total}
                </p>
                <button
                  type="button"
                  onClick={onShowAll}
                  className="mt-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Show all {total}
                </button>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
