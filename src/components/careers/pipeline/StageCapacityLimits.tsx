import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings2, AlertTriangle, Users } from "lucide-react";
import { APPLICANT_STATUSES, type ApplicantStatus } from "@/types/careers";
import type { Applicant } from "@/types/careers";

interface StageCapacityLimitsProps {
  applicants: Applicant[];
  capacities: Record<string, number>;
  onCapacitiesChange: (caps: Record<string, number>) => void;
}

const DEFAULT_CAPACITIES: Record<string, number> = {
  new: 0, reviewing: 0, shortlisted: 0, interview: 5, rejected: 0, hired: 0,
};

const StageCapacityLimits = ({ applicants, capacities, onCapacitiesChange }: StageCapacityLimitsProps) => {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(capacities);

  const stageCounts = useMemo(() => {
    const map: Record<string, number> = {};
    APPLICANT_STATUSES.forEach(s => {
      map[s.value] = applicants.filter(a => a.status === s.value).length;
    });
    return map;
  }, [applicants]);

  const overflows = useMemo(() => {
    const list: { stage: string; label: string; count: number; max: number }[] = [];
    APPLICANT_STATUSES.forEach(s => {
      const max = capacities[s.value] || 0;
      if (max > 0 && stageCounts[s.value] > max) {
        list.push({ stage: s.value, label: s.label, count: stageCounts[s.value], max });
      }
    });
    return list;
  }, [capacities, stageCounts]);

  const handleSave = () => {
    onCapacitiesChange(local);
    setEditing(false);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              Stage Capacity Limits
            </CardTitle>
            <CardDescription className="text-xs">Set maximum candidates per stage</CardDescription>
          </div>
          <Button size="sm" variant={editing ? "default" : "outline"} className="text-xs h-8 rounded-xl"
            onClick={() => editing ? handleSave() : setEditing(true)}>
            {editing ? "Save" : "Configure"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overflow warnings */}
        {overflows.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {overflows.map(o => (
              <motion.div
                key={o.stage}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                <span className="text-xs text-destructive font-medium">
                  {o.label}: {o.count}/{o.max} — over capacity by {o.count - o.max}
                </span>
              </motion.div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {APPLICANT_STATUSES.map(s => {
            const count = stageCounts[s.value] || 0;
            const max = (editing ? local : capacities)[s.value] || 0;
            const isOver = max > 0 && count > max;

            return (
              <div key={s.value} className={`p-2.5 rounded-xl border ${isOver ? "border-destructive/30 bg-destructive/5" : "border-border/30 bg-muted/10"}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-2 h-2 rounded-full ${s.color.split(" ")[0]}`} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{s.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className={`text-sm font-bold ${isOver ? "text-destructive" : ""}`}>{count}</span>
                  </div>
                  {editing ? (
                    <Input
                      type="number"
                      min={0}
                      value={local[s.value] || 0}
                      onChange={(e) => setLocal(prev => ({ ...prev, [s.value]: parseInt(e.target.value) || 0 }))}
                      className="h-7 w-16 text-xs rounded-lg"
                      placeholder="Max"
                    />
                  ) : (
                    max > 0 && (
                      <Badge variant="outline" className="text-[9px] py-0">
                        max: {max}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export { DEFAULT_CAPACITIES };
export default StageCapacityLimits;
