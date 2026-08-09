import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Brain, ArrowRight, Calendar, Clock
} from "lucide-react";
import { APPLICANT_STATUSES, type Applicant } from "@/types/careers";
import { TONE_SOFT } from "@/components/careers/statusColors";

interface CandidateTimelineProps {
  applicant: Applicant;
}

interface TimelineEvent {
  id: string;
  type: "applied" | "status_change" | "ai_analyzed";
  label: string;
  detail?: string;
  date: Date;
  icon: React.ReactNode;
  color: string;
}

const CandidateTimeline = ({ applicant }: CandidateTimelineProps) => {
  const events = useMemo(() => {
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
    if (applicant.status !== "new" && applicant.stageEnteredAt) {
      const statusInfo = APPLICANT_STATUSES.find(s => s.value === applicant.status);
      list.push({
        id: "status",
        type: "status_change",
        label: `Moved to ${statusInfo?.label || applicant.status}`,
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
  }, [applicant]);

  const totalDays = events.length >= 2
    ? Math.max(1, Math.floor((events[events.length - 1].date.getTime() - events[0].date.getTime()) / (1000 * 60 * 60 * 24)))
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
              {events.map((event, i) => (
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
