import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Calendar, ArrowLeftRight, Users } from "lucide-react";
import { APPLICANT_STATUSES, type ApplicantStatus } from "@/types/careers";
import type { Applicant } from "@/types/careers";
import { toast } from "sonner";

interface PipelineSnapshotsProps {
  applicants: Applicant[];
}

interface Snapshot {
  id: string;
  name: string;
  date: string;
  distribution: Record<string, number>;
  total: number;
}

const PipelineSnapshots = ({ applicants }: PipelineSnapshotsProps) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [newName, setNewName] = useState("");
  const [compareIdx, setCompareIdx] = useState<[number, number] | null>(null);

  const currentDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    APPLICANT_STATUSES.forEach(s => {
      dist[s.value] = applicants.filter(a => a.status === s.value).length;
    });
    return dist;
  }, [applicants]);

  const handleSave = () => {
    const name = newName.trim() || `Snapshot ${new Date().toLocaleDateString()}`;
    const snapshot: Snapshot = {
      id: crypto.randomUUID(),
      name,
      date: new Date().toISOString(),
      distribution: { ...currentDistribution },
      total: applicants.length,
    };
    setSnapshots(prev => [snapshot, ...prev]);
    setNewName("");
    toast.success(`Pipeline snapshot "${name}" saved`);
  };

  const comparison = useMemo(() => {
    if (!compareIdx || compareIdx[0] >= snapshots.length || compareIdx[1] >= snapshots.length) return null;
    const a = snapshots[compareIdx[0]];
    const b = compareIdx[1] === -1
      ? { name: "Current", date: new Date().toISOString(), distribution: currentDistribution, total: applicants.length }
      : snapshots[compareIdx[1]];

    return { a, b };
  }, [compareIdx, snapshots, currentDistribution, applicants.length]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          Pipeline Snapshots
        </CardTitle>
        <CardDescription className="text-xs">Save and compare pipeline state over time</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Save new snapshot */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Snapshot name (optional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="text-xs h-9 rounded-xl"
          />
          <Button size="sm" onClick={handleSave} className="text-xs h-9 rounded-xl whitespace-nowrap">
            <Camera className="w-3.5 h-3.5 mr-1.5" />
            Save Snapshot
          </Button>
        </div>

        {/* Current state */}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-primary font-medium">Current Pipeline</span>
            <Badge variant="secondary" className="text-[9px] py-0 border-0">{applicants.length} total</Badge>
          </div>
          <div className="flex gap-1.5">
            {APPLICANT_STATUSES.map(s => (
              <div key={s.value} className="flex-1 text-center">
                <div className="h-8 bg-secondary/30 rounded-lg relative overflow-hidden mb-1">
                  <div
                    className={`absolute bottom-0 w-full rounded-lg ${s.color.split(" ")[0]}`}
                    style={{ height: `${applicants.length > 0 ? (currentDistribution[s.value] / applicants.length) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[8px] text-muted-foreground">{s.label}</p>
                <p className="text-[10px] font-bold">{currentDistribution[s.value]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Saved snapshots */}
        {snapshots.length > 0 && (
          <div className="space-y-2 mb-4">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Saved Snapshots</span>
            {snapshots.map((snap, idx) => (
              <motion.div
                key={snap.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-border/30 bg-muted/10"
              >
                <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{snap.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(snap.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {snap.total} candidates
                  </p>
                </div>
                <Button
                  size="sm" variant="ghost" className="text-[10px] h-7 rounded-lg"
                  onClick={() => setCompareIdx([idx, -1])}
                >
                  <ArrowLeftRight className="w-3 h-3 mr-0.5" /> vs Now
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Comparison view */}
        {comparison && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl border border-primary/20 bg-primary/5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-primary font-medium">Comparison</span>
              <Button size="sm" variant="ghost" className="text-[9px] h-6" onClick={() => setCompareIdx(null)}>Close</Button>
            </div>
            <div className="space-y-1.5">
              {APPLICANT_STATUSES.map(s => {
                const aCount = comparison.a.distribution[s.value] || 0;
                const bCount = comparison.b.distribution[s.value] || 0;
                const diff = bCount - aCount;
                return (
                  <div key={s.value} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-muted-foreground">{s.label}</span>
                    <span className="w-8 text-right">{aCount}</span>
                    <span className="text-muted-foreground/40">→</span>
                    <span className="w-8">{bCount}</span>
                    <Badge
                      variant="secondary"
                      className={`text-[9px] py-0 border-0 ${diff > 0 ? "bg-emerald-500/10 text-emerald-400" : diff < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}
                    >
                      {diff > 0 ? "+" : ""}{diff}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {snapshots.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No snapshots saved yet. Save one to start tracking changes.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default PipelineSnapshots;
