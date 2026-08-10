import type { ApplicantStatus } from "@/types/careers";
import type { SortMode, TriageFactId } from "@/lib/pipelineMetrics";

/**
 * The board's view preferences, owned by Dashboard.
 *
 * These live one level above PipelineBoard because the tab content unmounts on
 * every tab switch, and losing a search halfway through triage because you
 * looked something up on Applicants is maddening.
 *
 * Kept in their own module rather than exported from PipelineBoard.tsx: Dashboard
 * needs the initial value synchronously, and importing it from the board would
 * pull the board (and @hello-pangea/dnd behind it) straight back into the main
 * chunk, defeating the lazy import.
 */
export interface PipelineViewState {
  search: string;
  activeTriage: TriageFactId | null;
  sortByStage: Partial<Record<ApplicantStatus, SortMode>>;
  /** Only EXPLICIT user toggles. Absent means "derive it" — see defaultCollapsedStages. */
  collapsedOverrides: Partial<Record<ApplicantStatus, boolean>>;
}

export const INITIAL_PIPELINE_VIEW: PipelineViewState = {
  search: "",
  activeTriage: null,
  sortByStage: {},
  collapsedOverrides: {},
};
