import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity, Brain, MessageSquare, ArrowRight, UserPlus, Clock, Trash2
} from "lucide-react";
import type { Applicant } from "@/types/careers";
import { APPLICANT_STATUSES } from "@/types/careers";

interface ActivityFeedProps {
  applicants: Applicant[];
  getJobTitle: (jobId: string) => string;
}

interface FeedItem {
  type: "applied" | "status" | "ai" | "note";
  name: string;
  detail: string;
  timestamp: Date;
  icon: any;
  color: string;
}

const ActivityFeed = ({ applicants, getJobTitle }: ActivityFeedProps) => {
  const feed = useMemo(() => {
    const items: FeedItem[] = [];

    applicants.forEach(a => {
      // Application submitted
      items.push({
        type: "applied",
        name: a.fullName,
        detail: `Applied for ${getJobTitle(a.jobId)}`,
        timestamp: new Date(a.appliedDate),
        icon: UserPlus,
        color: "text-primary",
      });

      // AI analysis
      if (a.aiAnalysis?.analyzedAt) {
        items.push({
          type: "ai",
          name: a.fullName,
          detail: `AI scored ${a.aiAnalysis.fitScore}/100 — ${a.aiAnalysis.fitLevel}`,
          timestamp: new Date(a.aiAnalysis.analyzedAt),
          icon: Brain,
          color: "text-violet-400",
        });
      }

      // Stage change (approximated from stageEnteredAt)
      if (a.status !== "new" && a.stageEnteredAt) {
        const statusInfo = APPLICANT_STATUSES.find(s => s.value === a.status);
        items.push({
          type: "status",
          name: a.fullName,
          detail: `Moved to ${statusInfo?.label || a.status}`,
          timestamp: new Date(a.stageEnteredAt),
          icon: ArrowRight,
          color: a.status === "rejected" ? "text-destructive" : a.status === "hired" ? "text-emerald-400" : "text-amber-400",
        });
      }

      // Notes
      a.notes.forEach((note, i) => {
        items.push({
          type: "note",
          name: a.fullName,
          detail: note.length > 80 ? note.slice(0, 80) + "…" : note,
          timestamp: new Date(new Date(a.appliedDate).getTime() + (i + 1) * 86400000), // approximate
          icon: MessageSquare,
          color: "text-muted-foreground",
        });
      });
    });

    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 50);
  }, [applicants, getJobTitle]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          Activity Feed
          <Badge variant="secondary" className="text-[9px] py-0 border-0 bg-muted/50">{feed.length} events</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-1">
            {feed.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={`${item.name}-${item.type}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/15 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">
                      <span className="font-semibold">{item.name}</span>
                      <span className="text-muted-foreground"> {item.detail}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {item.timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" "}
                      {item.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            {feed.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">No activity yet</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;
