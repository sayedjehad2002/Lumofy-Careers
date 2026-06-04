import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { Users, Crown, Target, GitCompareArrows } from "lucide-react";

interface ManagerAnalysis {
  name: string;
  directReports: number;
  avgRating: number;
  spread: number;
  distribution: Record<string, number>;
  flag: string;
  flagColor: string;
  flagBg: string;
}

interface PeerBenchmarkingProps {
  managerAnalysis: ManagerAnalysis[];
  bandIds: { id: string; shortLabel: string }[];
  orgDistribution: Record<string, number>;
  total: number;
}

const PeerBenchmarking = ({ managerAnalysis, bandIds, orgDistribution, total }: PeerBenchmarkingProps) => {
  const [selectedManager, setSelectedManager] = useState<string>(managerAnalysis[0]?.name || "");
  const [compareManager, setCompareManager] = useState<string>("");

  const manager = managerAnalysis.find(m => m.name === selectedManager);
  const compareTo = managerAnalysis.find(m => m.name === compareManager);

  const radarData = useMemo(() => {
    return bandIds.map(band => {
      const orgPct = total > 0 ? Math.round(((orgDistribution[band.id] || 0) / total) * 100) : 0;
      const mgrPct = manager && manager.directReports > 0
        ? Math.round(((manager.distribution[band.id] || 0) / manager.directReports) * 100) : 0;
      const cmpPct = compareTo && compareTo.directReports > 0
        ? Math.round(((compareTo.distribution[band.id] || 0) / compareTo.directReports) * 100) : 0;
      return { band: band.shortLabel, org: orgPct, manager: mgrPct, ...(compareTo ? { compare: cmpPct } : {}) };
    });
  }, [manager, compareTo, bandIds, orgDistribution, total]);

  // Ranking
  const ranked = useMemo(() => {
    return [...managerAnalysis]
      .filter(m => m.directReports >= 3)
      .sort((a, b) => {
        // Score based on how close to balanced
        const scoreA = Math.abs(a.avgRating - 3.25) + (a.spread < 0.3 ? 1 : 0);
        const scoreB = Math.abs(b.avgRating - 3.25) + (b.spread < 0.3 ? 1 : 0);
        return scoreA - scoreB;
      });
  }, [managerAnalysis]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Radar Chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <GitCompareArrows className="w-4 h-4 text-primary" />
            </div>
            Manager vs Org Distribution Radar
          </CardTitle>
          <CardDescription className="ml-[42px]">
            Compare a manager's rating distribution against organizational average
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Select value={selectedManager} onValueChange={setSelectedManager}>
              <SelectTrigger className="w-[200px] h-9 text-xs">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                {managerAnalysis.map(m => (
                  <SelectItem key={m.name} value={m.name}>{m.name} ({m.directReports})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={compareManager} onValueChange={setCompareManager}>
              <SelectTrigger className="w-[200px] h-9 text-xs">
                <SelectValue placeholder="Compare with..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No comparison</SelectItem>
                {managerAnalysis.filter(m => m.name !== selectedManager).map(m => (
                  <SelectItem key={m.name} value={m.name}>{m.name} ({m.directReports})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="hsl(var(--border))" opacity={0.3} />
                <PolarAngleAxis dataKey="band" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <Radar name="Org Average" dataKey="org" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 3" />
                <Radar name={selectedManager || "Manager"} dataKey="manager" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                {compareTo && (
                  <Radar name={compareManager} dataKey="compare" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5))" fillOpacity={0.15} strokeWidth={2} />
                )}
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Manager details */}
          {manager && (
            <div className="grid grid-cols-4 gap-3 mt-4 p-4 rounded-xl bg-muted/20 border border-border/30">
              <div className="text-center">
                <p className="text-lg font-bold">{manager.avgRating.toFixed(2)}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Avg Rating</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{manager.spread.toFixed(2)}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Spread</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{manager.directReports}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Reports</p>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className={`${manager.flagBg} ${manager.flagColor} border-0 text-[10px]`}>
                  {manager.flag}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manager Ranking */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2.5">
            <Crown className="w-4 h-4 text-amber-400" />
            Calibration Quality Ranking
          </CardTitle>
          <CardDescription>Managers ranked by calibration quality (balanced distribution, healthy spread)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {ranked.map((mgr, i) => (
              <motion.div key={mgr.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/20 transition-colors"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-muted text-muted-foreground" : i === 2 ? "bg-orange-500/15 text-orange-400" : "bg-muted/50 text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{mgr.name}</p>
                  <p className="text-[10px] text-muted-foreground">{mgr.directReports} reports · Avg: {mgr.avgRating.toFixed(2)} · Spread: {mgr.spread.toFixed(2)}</p>
                </div>
                <Badge variant="secondary" className={`${mgr.flagBg} ${mgr.flagColor} border-0 text-[10px]`}>
                  {mgr.flag}
                </Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PeerBenchmarking;
