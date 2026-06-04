import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Lock, Brain, Star, Clock, CheckCircle2 } from "lucide-react";
import { APPLICANT_STATUSES, type ApplicantStatus } from "@/types/careers";
import type { Applicant } from "@/types/careers";

interface StageGatesProps {
  applicants: Applicant[];
  gates: StageGateConfig[];
  onGatesChange: (gates: StageGateConfig[]) => void;
}

export interface StageGateConfig {
  stage: ApplicantStatus;
  requireAIAnalysis: boolean;
  minAIScore: number;
  minRating: number;
  minDaysInPreviousStage: number;
}

export const DEFAULT_GATES: StageGateConfig[] = [
  { stage: "reviewing", requireAIAnalysis: false, minAIScore: 0, minRating: 0, minDaysInPreviousStage: 0 },
  { stage: "shortlisted", requireAIAnalysis: true, minAIScore: 50, minRating: 0, minDaysInPreviousStage: 0 },
  { stage: "interview", requireAIAnalysis: true, minAIScore: 60, minRating: 3, minDaysInPreviousStage: 0 },
  { stage: "hired", requireAIAnalysis: true, minAIScore: 70, minRating: 3.5, minDaysInPreviousStage: 0 },
];

export function checkGate(applicant: Applicant, targetStage: ApplicantStatus, gates: StageGateConfig[]): { passed: boolean; failures: string[] } {
  const gate = gates.find(g => g.stage === targetStage);
  if (!gate) return { passed: true, failures: [] };

  const failures: string[] = [];
  const score = applicant.aiAnalysis?.fitScore;
  const rating = applicant.rating
    ? (applicant.rating.communication + applicant.rating.roleFit + applicant.rating.technicalSkills + applicant.rating.cultureFit + applicant.rating.overallRecommendation) / 5
    : 0;

  if (gate.requireAIAnalysis && !applicant.aiAnalysis) failures.push("AI analysis required");
  if (gate.minAIScore > 0 && (score == null || score < gate.minAIScore)) failures.push(`AI score ≥ ${gate.minAIScore} required (current: ${score ?? "N/A"})`);
  if (gate.minRating > 0 && rating < gate.minRating) failures.push(`Rating ≥ ${gate.minRating} required (current: ${rating.toFixed(1)})`);

  return { passed: failures.length === 0, failures };
}

const StageGates = ({ applicants, gates, onGatesChange }: StageGatesProps) => {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState<StageGateConfig[]>(gates);

  const handleSave = () => {
    onGatesChange(local);
    setEditing(false);
  };

  const updateGate = (stage: ApplicantStatus, field: keyof StageGateConfig, value: any) => {
    setLocal(prev => prev.map(g => g.stage === stage ? { ...g, [field]: value } : g));
  };

  // Count blocked candidates per stage
  const blockedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    gates.forEach(gate => {
      const stageOrder: ApplicantStatus[] = ["new", "reviewing", "shortlisted", "interview", "hired"];
      const prevIdx = stageOrder.indexOf(gate.stage) - 1;
      if (prevIdx < 0) return;
      const prevStage = stageOrder[prevIdx];
      const candidates = applicants.filter(a => a.status === prevStage);
      const blocked = candidates.filter(a => !checkGate(a, gate.stage, gates).passed).length;
      counts[gate.stage] = blocked;
    });
    return counts;
  }, [applicants, gates]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Stage Gates
            </CardTitle>
            <CardDescription className="text-xs">Define requirements before candidates can advance</CardDescription>
          </div>
          <Button size="sm" variant={editing ? "default" : "outline"} className="text-xs h-8 rounded-xl"
            onClick={() => editing ? handleSave() : setEditing(true)}>
            {editing ? "Save Gates" : "Configure"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {(editing ? local : gates).map((gate, i) => {
            const stageInfo = APPLICANT_STATUSES.find(s => s.value === gate.stage);
            const blocked = blockedCounts[gate.stage] || 0;

            return (
              <motion.div
                key={gate.stage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-xl border border-border/30 bg-muted/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold">Gate: Enter {stageInfo?.label}</span>
                  {blocked > 0 && (
                    <Badge variant="secondary" className="text-[9px] py-0 border-0 bg-yellow-500/10 text-yellow-400 ml-auto">
                      {blocked} blocked
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Require AI */}
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`ai-${gate.stage}`}
                      checked={gate.requireAIAnalysis}
                      disabled={!editing}
                      onCheckedChange={(v) => updateGate(gate.stage, "requireAIAnalysis", v)}
                    />
                    <Label htmlFor={`ai-${gate.stage}`} className="text-[10px]">
                      <Brain className="w-3 h-3 inline mr-0.5" />AI Required
                    </Label>
                  </div>

                  {/* Min AI Score */}
                  <div>
                    <label className="text-[9px] text-muted-foreground block mb-0.5">Min AI Score</label>
                    {editing ? (
                      <Input
                        type="number" min={0} max={100}
                        value={gate.minAIScore}
                        onChange={(e) => updateGate(gate.stage, "minAIScore", parseInt(e.target.value) || 0)}
                        className="h-7 text-xs rounded-lg"
                      />
                    ) : (
                      <span className="text-xs font-medium">{gate.minAIScore || "—"}</span>
                    )}
                  </div>

                  {/* Min Rating */}
                  <div>
                    <label className="text-[9px] text-muted-foreground block mb-0.5">Min Rating</label>
                    {editing ? (
                      <Input
                        type="number" min={0} max={5} step={0.5}
                        value={gate.minRating}
                        onChange={(e) => updateGate(gate.stage, "minRating", parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs rounded-lg"
                      />
                    ) : (
                      <span className="text-xs font-medium">{gate.minRating || "—"}</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center">
                    {gate.requireAIAnalysis || gate.minAIScore > 0 || gate.minRating > 0 ? (
                      <Badge variant="secondary" className="text-[9px] py-0 border-0 bg-primary/10 text-primary">
                        <ShieldCheck className="w-3 h-3 mr-0.5" />Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[9px] py-0 border-0 bg-muted text-muted-foreground">
                        Open
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default StageGates;
