import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, AlertCircle, BellRing } from "lucide-react";
import type { Applicant } from "@/types/careers";
import { APPLICANT_STATUSES, STAGE_SLA_DAYS } from "@/types/careers";

interface StaleCandidateAlertsProps {
  applicants: Applicant[];
  getJobTitle: (jobId: string) => string;
}

type EscalationLevel = "warning" | "critical" | "auto-notify";

interface StaleAlert {
  applicant: Applicant;
  daysInStage: number;
  slaLimit: number;
  daysOver: number;
  level: EscalationLevel;
}

function getLevel(daysOver: number): EscalationLevel {
  if (daysOver >= 7) return "auto-notify";
  if (daysOver >= 3) return "critical";
  return "warning";
}

const LEVEL_STYLES: Record<EscalationLevel, { bg: string; text: string; icon: React.ReactNode }> = {
  warning: { bg: "bg-yellow-500/10", text: "text-yellow-400", icon: <Clock className="w-3.5 h-3.5" /> },
  critical: { bg: "bg-destructive/10", text: "text-destructive", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  "auto-notify": { bg: "bg-destructive/15", text: "text-destructive", icon: <BellRing className="w-3.5 h-3.5" /> },
};

const StaleCandidateAlerts = ({ applicants, getJobTitle }: StaleCandidateAlertsProps) => {
  const alerts = useMemo(() => {
    const list: StaleAlert[] = [];
    applicants.forEach(a => {
      const sla = STAGE_SLA_DAYS[a.status];
      if (sla === undefined || !a.stageEnteredAt) return;
      const days = Math.floor((Date.now() - new Date(a.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24));
      if (days > sla) {
        list.push({
          applicant: a,
          daysInStage: days,
          slaLimit: sla,
          daysOver: days - sla,
          level: getLevel(days - sla),
        });
      }
    });
    return list.sort((a, b) => b.daysOver - a.daysOver);
  }, [applicants]);

  const grouped = useMemo(() => ({
    "auto-notify": alerts.filter(a => a.level === "auto-notify"),
    critical: alerts.filter(a => a.level === "critical"),
    warning: alerts.filter(a => a.level === "warning"),
  }), [alerts]);

  if (alerts.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-sm font-medium">No stale candidates</p>
          <p className="text-xs text-muted-foreground mt-1">All candidates are within SLA limits</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          Stale Candidate Alerts
          <Badge variant="secondary" className="text-[9px] py-0 border-0 bg-destructive/10 text-destructive">{alerts.length}</Badge>
        </CardTitle>
        <CardDescription className="text-xs">Candidates past SLA with escalation levels</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(["auto-notify", "critical", "warning"] as EscalationLevel[]).map(level => {
            const items = grouped[level];
            if (items.length === 0) return null;
            const style = LEVEL_STYLES[level];

            return (
              <div key={level}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center ${style.bg} ${style.text}`}>
                    {style.icon}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-semibold ${style.text}`}>
                    {level === "auto-notify" ? "Auto-Notify" : level} ({items.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {items.map((alert, i) => {
                    const initials = alert.applicant.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
                    const statusInfo = APPLICANT_STATUSES.find(s => s.value === alert.applicant.status);
                    return (
                      <motion.div
                        key={alert.applicant.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border ${style.bg} border-opacity-20`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{alert.applicant.fullName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{getJobTitle(alert.applicant.jobId)}</p>
                        </div>
                        <Badge variant="secondary" className={`text-[9px] py-0 border-0 ${statusInfo?.color || ""}`}>
                          {statusInfo?.label}
                        </Badge>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-xs font-bold ${style.text}`}>{alert.daysInStage}d</p>
                          <p className="text-[9px] text-muted-foreground">+{alert.daysOver}d over</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default StaleCandidateAlerts;
