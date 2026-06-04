import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from "recharts";
import { Beaker, ArrowRight, Plus, Trash2, RotateCcw, TrendingUp, TrendingDown } from "lucide-react";

interface EmployeeRecord {
  employeeName: string;
  department: string;
  lineManager: string;
  selfRating: number | null;
  managerRating: number | null;
  [key: string]: any;
}

interface BandDef {
  id: string;
  label: string;
  shortLabel: string;
  min: number;
  max: number;
}

interface WhatIfSimulatorProps {
  employees: any[];
  bands: BandDef[];
  bandColors: string[];
  getRating: (emp: any) => number | null;
}

interface Scenario {
  id: string;
  employeeName: string;
  fromBand: string;
  toBand: string;
}

const WhatIfSimulator = ({ employees, bands, bandColors, getRating }: WhatIfSimulatorProps) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [selectedTarget, setSelectedTarget] = useState("");

  const rated = useMemo(() => employees.filter(e => getRating(e) !== null), [employees, getRating]);

  const getEmpBand = (emp: EmployeeRecord) => {
    const r = getRating(emp)!;
    return bands.find(b => r >= b.min && r <= b.max)?.id || "";
  };

  // Original distribution
  const originalDist = useMemo(() => {
    return bands.map(band => ({
      id: band.id,
      label: band.shortLabel,
      count: rated.filter(e => { const r = getRating(e)!; return r >= band.min && r <= band.max; }).length,
    }));
  }, [rated, bands, getRating]);

  // Simulated distribution
  const simulatedDist = useMemo(() => {
    const assignments: Record<string, string> = {};
    rated.forEach(e => { assignments[e.employeeName] = getEmpBand(e); });
    scenarios.forEach(s => { assignments[s.employeeName] = s.toBand; });

    return bands.map(band => ({
      id: band.id,
      label: band.shortLabel,
      count: Object.values(assignments).filter(b => b === band.id).length,
    }));
  }, [rated, bands, scenarios, getRating]);

  const chartData = useMemo(() => {
    return bands.map((band, i) => ({
      label: band.shortLabel,
      original: originalDist[i]?.count || 0,
      simulated: simulatedDist[i]?.count || 0,
      diff: (simulatedDist[i]?.count || 0) - (originalDist[i]?.count || 0),
    }));
  }, [bands, originalDist, simulatedDist]);

  const addScenario = () => {
    if (!selectedEmp || !selectedTarget) return;
    const emp = rated.find(e => e.employeeName === selectedEmp);
    if (!emp) return;
    const fromBand = getEmpBand(emp);
    if (fromBand === selectedTarget) return;

    setScenarios(prev => [
      ...prev.filter(s => s.employeeName !== selectedEmp),
      { id: `${Date.now()}`, employeeName: selectedEmp, fromBand, toBand: selectedTarget },
    ]);
    setSelectedEmp("");
    setSelectedTarget("");
  };

  const removeScenario = (id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
  };

  const totalChanged = scenarios.length;
  const originalMean = rated.length > 0 ? rated.reduce((s, e) => s + getRating(e)!, 0) / rated.length : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Controls */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Beaker className="w-4 h-4 text-amber-400" />
            </div>
            What-If Simulator
          </CardTitle>
          <CardDescription className="ml-[42px]">
            Move employees between bands and see real-time distribution impact · {totalChanged} changes queued
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1 block">Employee</label>
              <Select value={selectedEmp} onValueChange={setSelectedEmp}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="max-h-[200px]">
                    {rated.map(e => (
                      <SelectItem key={e.employeeName} value={e.employeeName}>
                        {e.employeeName} ({getRating(e)?.toFixed(1)})
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[150px]">
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1 block">Move to Band</label>
              <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Target band..." />
                </SelectTrigger>
                <SelectContent>
                  {bands.map((b, i) => (
                    <SelectItem key={b.id} value={b.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bandColors[i] }} />
                        {b.shortLabel} ({b.min}–{b.max})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={addScenario} disabled={!selectedEmp || !selectedTarget} className="h-9 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => setScenarios([])} disabled={scenarios.length === 0} className="h-9 text-xs">
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison chart */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
                    borderRadius: "12px", fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="original" name="Current" fill="hsl(var(--muted-foreground))" fillOpacity={0.3} radius={[6, 6, 0, 0]} maxBarSize={35} />
                <Bar dataKey="simulated" name="Simulated" radius={[6, 6, 0, 0]} maxBarSize={35}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={bandColors[i]} fillOpacity={0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Diff strip */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/30">
            {chartData.map((d, i) => (
              <div key={d.label} className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bandColors[i] }} />
                <span className="text-muted-foreground">{d.label}:</span>
                <span className={`font-semibold ${d.diff > 0 ? "text-emerald-400" : d.diff < 0 ? "text-destructive" : ""}`}>
                  {d.diff > 0 ? "+" : ""}{d.diff}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Queued changes */}
      {scenarios.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Queued Changes ({scenarios.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {scenarios.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 text-xs"
                >
                  <span className="font-medium truncate min-w-[120px]">{s.employeeName}</span>
                  <Badge variant="outline" className="text-[9px] py-0" style={{ borderColor: bandColors[bands.findIndex(b => b.id === s.fromBand)] }}>
                    {bands.find(b => b.id === s.fromBand)?.shortLabel}
                  </Badge>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <Badge variant="outline" className="text-[9px] py-0" style={{ borderColor: bandColors[bands.findIndex(b => b.id === s.toBand)] }}>
                    {bands.find(b => b.id === s.toBand)?.shortLabel}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-auto" onClick={() => removeScenario(s.id)}>
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default WhatIfSimulator;
