import { APPLICANT_STATUSES, type Applicant, type ApplicantStatus } from "@/types/careers";
import type { ApplicantEvent } from "@/hooks/use-applicant-events";

/**
 * The candidate's real chronology.
 *
 * Pure, and takes `now` rather than reading the clock, matching
 * dashboardMetrics / pipelineMetrics / teamMetrics — the honesty rules below are
 * the whole point of this module, so they need to be testable.
 *
 * The governing rule: ONLY entries with a real recorded timestamp appear.
 * Notes and ratings carry no timestamp in the schema, and stamping them with the
 * applied date invented a history that looked authoritative and was wrong.
 */

export type TimelineKind = "applied" | "stage" | "note" | "ai";

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  /** Headline for the row. */
  label: string;
  /** Secondary line — CV filename, note body. */
  detail?: string;
  /** HR user who did it. Undefined = never recorded, which is NOT "nobody". */
  actor?: string;
  /** Stage moved out of, when known. */
  from?: ApplicantStatus;
  /** Stage moved into. Drives the node colour for stage rows. */
  to?: ApplicantStatus;
  /** Derived from current state rather than a recorded event — flagged, never silently shown as fact. */
  inferred?: boolean;
  at: Date;
}

const statusLabel = (s: string) =>
  APPLICANT_STATUSES.find((x) => x.value === s)?.label ?? s;

export function buildTimeline(applicant: Applicant, events: ApplicantEvent[]): TimelineEntry[] {
  const list: TimelineEntry[] = [];

  list.push({
    id: "applied",
    kind: "applied",
    label: "Application submitted",
    detail: applicant.cvFileName,
    at: new Date(applicant.appliedDate),
  });

  for (const e of events) {
    if (e.kind === "stage_change") {
      list.push({
        id: e.id,
        kind: "stage",
        label: e.from_status
          ? `${statusLabel(e.from_status)} → ${statusLabel(e.to_status ?? "")}`
          : `Moved to ${statusLabel(e.to_status ?? "")}`,
        actor: e.actor_email ?? undefined,
        from: (e.from_status as ApplicantStatus) ?? undefined,
        to: (e.to_status as ApplicantStatus) ?? undefined,
        at: new Date(e.created_at),
      });
    } else {
      list.push({
        id: e.id,
        kind: "note",
        label: "Note added",
        detail: e.note ?? undefined,
        actor: e.actor_email ?? undefined,
        at: new Date(e.created_at),
      });
    }
  }

  // Candidates moved before any of this was recorded still need to explain how
  // they reached their current stage. Shown as inferred — there is no event
  // behind it and no person to credit — and suppressed the moment a real move
  // exists, so the two can never contradict each other.
  const hasRecordedMove = events.some((e) => e.kind === "stage_change");
  if (!hasRecordedMove && applicant.status !== "new" && applicant.stageEnteredAt) {
    list.push({
      id: "inferred-stage",
      kind: "stage",
      label: `Moved to ${statusLabel(applicant.status)}`,
      to: applicant.status,
      inferred: true,
      at: new Date(applicant.stageEnteredAt),
    });
  }

  if (applicant.aiAnalysis?.analyzedAt) {
    list.push({
      id: "ai",
      kind: "ai",
      label: "AI analysis completed",
      at: new Date(applicant.aiAnalysis.analyzedAt),
    });
  }

  return list
    .filter((e) => !Number.isNaN(e.at.getTime()))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * Days between the application and the latest recorded activity.
 *
 * Deliberately spans the ENTRIES, not "now": a candidate rejected three months
 * ago has not been "in the pipeline" ever since, and counting to today would say
 * so. Returns 0 when there is nothing to span, so the caller can hide the chip
 * rather than print "0 days".
 */
export function daysSpanned(entries: TimelineEntry[]): number {
  if (entries.length < 2) return 0;
  const first = entries[0].at.getTime();
  const last = entries[entries.length - 1].at.getTime();
  return Math.max(0, Math.floor((last - first) / 86_400_000));
}

/** "today" / "3 days ago" / "4 Aug 2026" once the relative form stops helping. */
export function relativeDay(at: Date, now: number): string {
  const days = Math.floor((now - at.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
