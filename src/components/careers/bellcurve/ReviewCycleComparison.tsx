import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { GitCompareArrows, TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReviewCycleComparisonProps {
  currentBands: { id: string; shortLabel: string; count: number; pct: number }[];
  currentMean: number;
  currentStdDev: number;
  currentTotal: number;
  currentHealthScore: number;
  bandColors: string[];
}

interface SnapshotSummary {
  id: string;
  snapshot_name: string;
  snapshot_date: string;
  total_employees: number;
  avg_manager_rating: number | null;
}

const ReviewCycleComparison = ({ currentBands, currentMean, currentStdDev, currentTotal, currentHealthScore, bandColors }: ReviewCycleComparisonProps) => {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>("");
  const [snapshotData, setSnapshotData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSnapshots = async () => {
      const { data } = await supabase
        .from("performance_snapshots")
        .select("id, snapshot_name, snapshot_date, total_employees, avg_manager_rating")
        .order("snapshot_date", { ascending: false })
        .limit(20);
      if (data) setSnapshots(data);
    };
    fetchSnapshots();
  }, []);

  useEffect(() => {
    if (!selectedSnapshotId) { setSnapshotData(null); return; }
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("performance_snapshots")
        .select("*")
        .eq("id", selectedSnapshotId)
        .single();
      if (data) {
        // Reconstruct distribution from employee_data
        const employees = (data.employee_data as any[]) || [];
        const rated = employees.filter((e: any) => e.managerRating !== null);
        const bands = [
          { id: "critical", shortLabel: "Critical", min: 1.0, max: 1.99 },
          { id: "below", shortLabel: "Below", min: 2.0, max: 2.99 },
          { id: "core", shortLabel: "Meets", min: 3.0, max: 3.49 },
          { id: "above", shortLabel: "Exceeds", min: 3.5, max: 3.99 },
          { id: "top", shortLabel: "Top", min: 4.0, max: 5.0 },
        ].map(band => {
          const count = rated.filter((e: any) => {
            const r = e.managerRating ?? e.selfRating;
            return r >= band.min && r <= band.max;
          }).length;
          return { ...band, count, pct: rated.length > 0 ? Math.round((count / rated.length) * 100) : 0 };
        });
        const ratings = rated.map((e: any) => e.managerRating ?? e.selfRating).filter(Boolean);
        const mean = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;
        const variance = ratings.reduce((sum: number, r: number) => sum + Math.pow(r - mean, 2), 0) / (ratings.length || 1);
        setSnapshotData({
          name: data.snapshot_name,
          date: data.snapshot_date,
          bands,
          mean,
          stdDev: Math.sqrt(variance),
          total: rated.length,
          avgRating: data.avg_manager_rating,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [selectedSnapshotId]);

  const comparisonData = useMemo(() => {
    if (!snapshotData) return [];
    return currentBands.map((band, i) => {
      const prev = snapshotData.bands.find((b: any) => b.id === band.id);
      return {
        band: band.shortLabel,
        current: band.pct,
        previous: prev?.pct || 0,
        diff: band.pct - (prev?.pct || 0),
      };
    });
  }, [currentBands, snapshotData]);

  const meanDrift = snapshotData ? currentMean - snapshotData.mean : 0;
  const stdDevDrift = snapshotData ? currentStdDev - snapshotData.stdDev : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Selector */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            Review Cycle Comparison
          </CardTitle>
          <CardDescription className="ml-[42px]">
            Compare current distribution against a previous performance snapshot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedSnapshotId} onValueChange={setSelectedSnapshotId}>
            <SelectTrigger className="w-full max-w-md h-9 text-xs">
              <SelectValue placeholder="Select a previous snapshot to compare..." />
            </SelectTrigger>
            <SelectContent>
              {snapshots.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.snapshot_name} — {new Date(s.snapshot_date).toLocaleDateString()} ({s.total_employees} employees)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {snapshots.length === 0 && (
            <p className="text-xs text-muted-foreground mt-3">No saved performance snapshots found. Save a snapshot from the Performance Management tab to enable comparison.</p>
          )}
        </CardContent>
      </Card>

      {/* Comparison Chart */}
      {snapshotData && (
        <>
          {/* KPI Drift */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Mean Drift", value: `${meanDrift > 0 ? "+" : ""}${meanDrift.toFixed(2)}`, icon: meanDrift > 0.1 ? TrendingUp : meanDrift < -0.1 ? TrendingDown : Minus,
                color: Math.abs(meanDrift) > 0.2 ? "text-destructive" : "text-emerald-400" },
              { label: "σ Change", value: `${stdDevDrift > 0 ? "+" : ""}${stdDevDrift.toFixed(2)}`, icon: Minus,
                color: Math.abs(stdDevDrift) > 0.1 ? "text-amber-400" : "text-emerald-400" },
              { label: "Population Change", value: `${currentTotal - snapshotData.total > 0 ? "+" : ""}${currentTotal - snapshotData.total}`, icon: Minus, color: "" },
              { label: "Previous Mean", value: snapshotData.mean.toFixed(2), icon: Minus, color: "text-muted-foreground" },
            ].map(kpi => (
              <Card key={kpi.label} className="border-border/40">
                <CardContent className="p-4">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{kpi.label}</span>
                  <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Side-by-side bar chart */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2.5">
                <GitCompareArrows className="w-4 h-4 text-primary" />
                Distribution Comparison
              </CardTitle>
              <CardDescription>
                Current vs {snapshotData.name} ({new Date(snapshotData.date).toLocaleDateString()})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                    <XAxis dataKey="band" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                      formatter={(value: any, name: string) => [`${value}%`, name === "current" ? "Current" : "Previous"]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="current" name="Current" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="previous" name="Previous" fill="hsl(var(--muted-foreground))" opacity={0.5} radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Band-by-band drift */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Band-by-Band Drift Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {comparisonData.map((band, i) => (
                  <div key={band.band} className="flex items-center gap-4">
                    <div className="w-20 flex items-center gap-2 flex-shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bandColors[i] }} />
                      <span className="text-xs font-medium">{band.band}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-10 text-right">{band.previous}%</span>
                      <div className="flex-1 h-2 rounded-full bg-muted/30 relative overflow-hidden">
                        <motion.div
                          className="absolute h-full rounded-full bg-muted-foreground/30"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(band.previous, 100)}%` }}
                          transition={{ duration: 0.5 }}
                        />
                        <motion.div
                          className="absolute h-full rounded-full"
                          style={{ backgroundColor: bandColors[i] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(band.current, 100)}%` }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        />
                      </div>
                      <span className="text-xs font-semibold w-10">{band.current}%</span>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] border-0 w-16 justify-center ${
                      Math.abs(band.diff) <= 3 ? "bg-emerald-500/15 text-emerald-400" :
                      band.diff > 0 ? "bg-destructive/15 text-destructive" :
                      "bg-amber-500/15 text-amber-400"
                    }`}>
                      {band.diff > 0 ? "+" : ""}{band.diff}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
};

export default ReviewCycleComparison;
