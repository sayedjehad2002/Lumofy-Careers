import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Applicant, ApplicantStatus } from "@/types/careers";
import { APPLICANT_STATUSES } from "@/types/careers";
import type { ApplicantEvent } from "@/hooks/use-applicant-events";
import { STATUS_COLORS, STATUS_SOFT } from "@/components/careers/statusColors";
import {
  buildTimeline, daysSpanned, relativeDay,
  type TimelineEntry,
} from "@/lib/candidateTimeline";
import { prefersReducedMotion } from "@/lib/motion";
import {
  LxDocument, LxCandidate, LxReviewing, LxShortlist, LxAnalysis,
  LxHourglass, LxNote, LxInterview, LxHired, LxRejected,
  type LxIconProps,
} from "@/components/icons/lumofy";

interface CandidateTimelineProps {
  applicant: Applicant;
  /** Recorded history: who moved this candidate, and who wrote each note. */
  events: ApplicantEvent[];
}

type LxIcon = (p: LxIconProps) => JSX.Element;

/**
 * A stage gets the icon for what that stage MEANS, not a generic arrow.
 *
 * This is the difference between "something changed" and "they reached
 * interview" — the whole point of the card is that a hiring manager reads the
 * candidate's position in one pass, and shape carries that faster than text.
 */
const STAGE_ICON: Record<ApplicantStatus, LxIcon> = {
  new: LxCandidate,
  reviewing: LxReviewing,
  shortlisted: LxShortlist,
  interview: LxInterview,
  hired: LxHired,
  rejected: LxRejected,
};

function iconFor(e: TimelineEntry): LxIcon {
  if (e.kind === "applied") return LxDocument;
  if (e.kind === "ai") return LxAnalysis;
  if (e.kind === "note") return LxNote;
  return e.to ? STAGE_ICON[e.to] : LxCandidate;
}

/** Node tint. Stage rows follow their own stage colour; the rest sit on brand. */
function toneFor(e: TimelineEntry): string {
  if (e.kind === "stage" && e.to) return STATUS_SOFT[e.to];
  if (e.kind === "ai") return "bg-[hsl(var(--chart-3)/0.14)] text-[hsl(var(--chart-3))]";
  if (e.kind === "note") return "bg-secondary text-muted-foreground";
  return "bg-primary/12 text-primary";
}

const initials = (email: string) => {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase() || "?";
};

function Attribution({ e }: { e: TimelineEntry }) {
  if (e.kind === "applied") return <span className="text-muted-foreground/60">by the candidate</span>;
  if (e.kind === "ai") return <span className="text-muted-foreground/60">by Lumofy AI</span>;
  if (e.actor) {
    return (
      <span className="flex min-w-0 items-center gap-1.5" title={e.actor}>
        <span
          className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-primary/15 text-[8px] font-bold leading-none text-primary"
          aria-hidden="true"
        >
          {initials(e.actor)}
        </span>
        <span className="truncate text-muted-foreground">{e.actor}</span>
      </span>
    );
  }
  if (e.inferred) {
    return <span className="italic text-muted-foreground/50">stage inferred — not recorded at the time</span>;
  }
  return <span className="italic text-muted-foreground/50">author not recorded</span>;
}

const CandidateTimeline = ({ applicant, events }: CandidateTimelineProps) => {
  const entries = useMemo(() => buildTimeline(applicant, events), [applicant, events]);
  const now = useMemo(() => Date.now(), [entries]);
  const span = daysSpanned(entries);
  const reduced = prefersReducedMotion();

  const stage = APPLICANT_STATUSES.find((s) => s.value === applicant.status);
  const StageIcon = STAGE_ICON[applicant.status];

  return (
    <section className="overflow-hidden rounded-2xl border border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-card))]">
      {/* Where they stand, before any history. A hiring manager opening this card
          wants the answer first and the evidence second — the old header led with
          the word "Timeline", which nobody needed to be told. */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[hsl(var(--intel-border))] px-5 py-3.5">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${STATUS_SOFT[applicant.status]}`}
        >
          <StageIcon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-1.5 text-sm font-semibold tracking-tight text-foreground">
            {stage?.label ?? applicant.status}
            <span className="text-[11px] font-normal text-muted-foreground">· current stage</span>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
            <LxHourglass className="h-3 w-3 shrink-0" />
            {span > 0 ? <>{span} {span === 1 ? "day" : "days"} of activity</> : <>first day</>}
            <span aria-hidden="true">·</span>
            {entries.length} {entries.length === 1 ? "event" : "events"}
          </p>
        </div>
      </header>

      {entries.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nothing recorded yet.</p>
      ) : (
        <ol className="max-h-[420px] overflow-y-auto overscroll-contain scrollbar-slim px-5 py-4">
          {entries.map((e, i) => {
            const Icon = iconFor(e);
            const isLast = i === entries.length - 1;
            const railColor =
              e.kind === "stage" && e.to ? STATUS_COLORS[e.to] : "hsl(var(--border))";

            return (
              <motion.li
                key={e.id}
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : Math.min(i * 0.06, 0.3), duration: 0.28 }}
                className="relative flex gap-3.5 pb-4 last:pb-0"
              >
                {/* The connector is a segment BELOW each node rather than one long
                    line behind everything. It can then take the colour of the
                    stage it leads into, so the rail itself shows the journey
                    warming from New through to the current stage — and it stops
                    cleanly at the last node instead of trailing into space. */}
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[17px] top-9 bottom-0 w-[2px] rounded-full opacity-30"
                    style={{ background: `linear-gradient(to bottom, ${railColor}, transparent)` }}
                  />
                )}

                <span
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneFor(e)}`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>

                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-baseline gap-2">
                    <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                      {e.label}
                    </p>
                    <time
                      dateTime={e.at.toISOString()}
                      title={e.at.toLocaleString("en-GB")}
                      className="shrink-0 text-[10px] tabular-nums text-muted-foreground"
                    >
                      {relativeDay(e.at, now)}
                    </time>
                  </div>

                  {e.detail && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={e.detail}>
                      {e.detail}
                    </p>
                  )}

                  <div className="mt-1 flex min-w-0 items-center text-[10px]">
                    <Attribution e={e} />
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

export default CandidateTimeline;
