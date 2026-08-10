import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Brain, ArrowRight, Calendar, Clock, MessageSquare
} from "lucide-react";
import { APPLICANT_STATUSES, type Applicant } from "@/types/careers";
import type { ApplicantEvent } from "@/hooks/use-applicant-events";
import { TONE_SOFT } from "@/components/careers/statusColors";

interface CandidateTimelineProps {
  applicant: Applicant;
  /** Recorded history: who moved this candidate, and who wrote each note. */
  events: ApplicantEvent[];
}

interface TimelineEvent {
  id: string;
  type: "applied" | "status_change" | "ai_analyzed" | "note";
  label: string;
  detail?: string;
  /** Email of the HR user who did it. Undefined = never recorded, not "nobody". */
  actor?: string;
  /** True when derived from the candidate's current state rather than a recorded event. */
  inferred?: boolean;
  date: Date;
  icon: React.ReactNode;
  color: string;
}

const CandidateTimeline = ({ applicant, events }: CandidateTimelineProps) => {
  const timeline = useMemo(() => {
    const list: TimelineEvent[] = [];

    // Applied
    list.push({
      id: "applied",
      type: "applied",
      label: "Application Submitted",
      detail: `Applied with CV: ${applicant.cvFileName}`,
      date: new Date(applicant.appliedDate),
      icon: <FileText className="w-3.5 h-3.5" />,
      color: "bg-primary/15 text-primary",
    });

    // ONLY events with a REAL recorded timestamp appear here. Notes and ratings
    // are not timestamped in the schema, and status changes only are once
    // stageEnteredAt exists — stamping them with the applied date invented a
    // history that looked authoritative and was wrong. Notes live in the Internal
    // Notes card; the rating lives in the Rating card; the score lives in the
    // analysis. This card's one job is real chronology.
    // Recorded moves and notes — the only entries that can name a person.
    for (const e of events) {
      const to = APPLICANT_STATUSES.find((s) => s.value === e.to_status);
      const from = APPLICANT_STATUSES.find((s) => s.value === e.from_status);
      list.push(
        e.kind === "stage_change"
          ? {
              id: e.id,
              type: "status_change",
              label: from
                ? `${from.label} → ${to?.label ?? e.to_status}`
                : `Moved to ${to?.label ?? e.to_status}`,
              actor: e.actor_email ?? undefined,
              date: new Date(e.created_at),
              icon: <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />,
              color: to?.color || "bg-muted text-muted-foreground",
            }
          : {
              id: e.id,
              type: "note",
              label: "Note added",
              detail: e.note ?? undefined,
              actor: e.actor_email ?? undefined,
              date: new Date(e.created_at),
              icon: <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />,
              color: TONE_SOFT.muted,
            },
      );
    }

    // Fallback for candidates moved before any of this was recorded. Shown so the
    // timeline is not silent about how they got where they are, but flagged as
    // inferred from their current status — there is no event behind it and no
    // person to credit. Suppressed once a real move exists, so the two cannot
    // contradict each other.
    const hasRecordedMove = events.some((e) => e.kind === "stage_change");
    if (!hasRecordedMove && applicant.status !== "new" && applicant.stageEnteredAt) {
      const statusInfo = APPLICANT_STATUSES.find(s => s.value === applicant.status);
      list.push({
        id: "status",
        type: "status_change",
        label: `Moved to ${statusInfo?.label || applicant.status}`,
        inferred: true,
        date: new Date(applicant.stageEnteredAt),
        icon: <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />,
        color: statusInfo?.color || "bg-muted text-muted-foreground",
      });
    }

    if (applicant.aiAnalysis?.analyzedAt) {
      list.push({
        id: "ai",
        type: "ai_analyzed",
        label: "AI analysis completed",
        date: new Date(applicant.aiAnalysis.analyzedAt),
        icon: <Brain className="w-3.5 h-3.5" aria-hidden="true" />,
        color: TONE_SOFT.ai,
      });
    }

    return list
      .filter((e) => !Number.isNaN(e.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [applicant, events]);

  const totalDays = timeline.length >= 2
    ? Math.max(1, Math.floor((timeline[timeline.length - 1].date.getTime() - timeline[0].date.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              Candidate Timeline
            </CardTitle>
          </div>
          {totalDays > 0 && (
            <Badge variant="secondary" className="text-[10px] py-0 border-0">
              <Calendar className="w-3 h-3 mr-1" />
              {totalDays} days in pipeline
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto overscroll-contain scrollbar-slim">
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-4">
              {timeline.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="relative"
                >
                  {/* Dot */}
                  <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ${event.color}`}>
                    {event.icon}
                  </div>

                  <div className="p-3 rounded-xl bg-muted/20 border border-border/20">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold">{event.label}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {event.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    {event.detail && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{event.detail}</p>
                    )}
                    {/* Who did it. An entry with no recorded actor says so rather
                        than being credited to anyone — the applied and AI entries
                        have no human behind them at all, and anything from before
                        this was tracked genuinely cannot be attributed. */}
                    {event.type !== "applied" && event.type !== "ai_analyzed" && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                        {event.actor ? (
                          <>
                            by{" "}
                            <span className="font-medium text-muted-foreground" title={event.actor}>
                              {event.actor}
                            </span>
                          </>
                        ) : event.inferred ? (
                          <span className="italic">from current status — not recorded at the time</span>
                        ) : (
                          <span className="italic">author not recorded</span>
                        )}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CandidateTimeline;
