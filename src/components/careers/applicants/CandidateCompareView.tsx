import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Star, X, Users, ArrowUpDown } from "lucide-react";
import type { Applicant } from "@/types/careers";
import { tierSoft, TONE_SOFT, TONE_TEXT } from "@/components/careers/statusColors";

interface CandidateCompareViewProps {
  applicants: Applicant[];
  pinnedIds: Set<string>;
  onUnpin: (id: string) => void;
  onClearAll: () => void;
}

const CandidateCompareView = ({ applicants, pinnedIds, onUnpin, onClearAll }: CandidateCompareViewProps) => {
  const pinned = useMemo(
    () => applicants.filter(a => pinnedIds.has(a.id)),
    [applicants, pinnedIds]
  );

  if (pinned.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
          <Users className="w-7 h-7 opacity-30" />
        </div>
        <p className="font-medium text-sm">No candidates pinned for comparison</p>
        <p className="text-xs mt-1">Pin 2-3 candidates from the candidate list to compare them side-by-side</p>
      </div>
    );
  }

  const rows: { label: string; getValue: (a: Applicant) => React.ReactNode }[] = [
    {
      label: "AI Score",
      getValue: (a) => a.aiAnalysis?.fitScore != null ? (
        <span className="text-lg font-bold text-primary">{a.aiAnalysis.fitScore}</span>
      ) : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      label: "Fit Level",
      getValue: (a) => a.aiAnalysis?.fitLevel ? (
        <Badge variant="secondary" className="text-[10px] py-0 border-0">{a.aiAnalysis.fitLevel}</Badge>
      ) : "—",
    },
    {
      label: "Ranking Tier",
      getValue: (a) => {
        const tier = a.aiAnalysis?.rankingTier;
        return tier ? (
          <Badge variant="secondary" className={`text-[10px] py-0 border-0 ${tier ? tierSoft(tier) : ""}`}>{tier}</Badge>
        ) : "—";
      },
    },
    {
      label: "Status",
      getValue: (a) => <Badge variant="outline" className="text-[10px] py-0">{a.status}</Badge>,
    },
    {
      label: "Location",
      getValue: (a) => <span className="text-xs">{a.location}</span>,
    },
    {
      label: "Nationality",
      getValue: (a) => <span className="text-xs">{a.nationality || "—"}</span>,
    },
    {
      label: "Strengths",
      getValue: (a) => (
        <div className="flex flex-wrap gap-1">
          {(a.aiAnalysis?.strengths || []).slice(0, 3).map((s, i) => (
            <Badge key={i} variant="secondary" className={`text-[9px] py-0 border-0 ${TONE_SOFT.success}`}>{s}</Badge>
          ))}
          {!a.aiAnalysis?.strengths?.length && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      label: "Gaps",
      getValue: (a) => (
        <div className="flex flex-wrap gap-1">
          {(a.aiAnalysis?.gaps || []).slice(0, 3).map((g, i) => (
            <Badge key={i} variant="secondary" className="text-[9px] py-0 border-0 bg-destructive/10 text-destructive">{g}</Badge>
          ))}
          {!a.aiAnalysis?.gaps?.length && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      label: "Recommendation",
      getValue: (a) => a.aiAnalysis?.recommendation ? (
        <Badge variant="outline" className="text-[9px] py-0">{a.aiAnalysis.recommendation}</Badge>
      ) : "—",
    },
    {
      // Replaced the former "Interview Success %" row — an unvalidated AI-guessed
      // probability — with the evidence-backed skills-coverage figure.
      label: "Skills Coverage",
      getValue: (a) => a.aiAnalysis?.skillsCoveragePercent != null ? (
        <span className="text-sm font-semibold">{a.aiAnalysis.skillsCoveragePercent}%</span>
      ) : "—",
    },
    {
      label: "Overall Rating",
      getValue: (a) => a.rating ? (
        <span className="flex items-center gap-1 text-sm">
          <Star className={`w-3.5 h-3.5 fill-current ${TONE_TEXT.warning}`} aria-hidden="true" />
          {(Object.values(a.rating).reduce((s, v) => s + v, 0) / 5).toFixed(1)}
        </span>
      ) : "—",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">{pinned.length} candidates pinned</span>
        </div>
        <Button size="sm" variant="ghost" className="text-xs h-8" onClick={onClearAll}>
          Clear all
        </Button>
      </div>

      <ScrollArea className="w-full">
        <div className="min-w-[600px]">
          {/* Header row */}
          <div className="grid gap-3" style={{ gridTemplateColumns: `140px repeat(${pinned.length}, 1fr)` }}>
            <div /> {/* label column */}
            {pinned.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-3 text-center">
                    <div className="flex items-center justify-between mb-1">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                        {a.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onUnpin(a.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-xs font-semibold truncate">{a.fullName}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Data rows */}
          <div className="mt-3 space-y-1">
            {rows.map((row, ri) => (
              <div
                key={row.label}
                className={`grid gap-3 py-2.5 px-2 rounded-lg ${ri % 2 === 0 ? "bg-muted/15" : ""}`}
                style={{ gridTemplateColumns: `140px repeat(${pinned.length}, 1fr)` }}
              >
                <span className="text-[11px] font-medium text-muted-foreground self-center">{row.label}</span>
                {pinned.map(a => (
                  <div key={a.id} className="self-center">
                    {row.getValue(a)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default CandidateCompareView;
