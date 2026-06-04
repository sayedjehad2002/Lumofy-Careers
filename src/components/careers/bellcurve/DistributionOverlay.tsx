import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Layers } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

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
  shortLabel: string;
  min: number;
  max: number;
}

interface DistributionOverlayProps {
  employees: EmployeeRecord[];
  bands: BandDef[];
  bandColors: string[];
}

const SOURCES = [
  { key: "final", label: "Final Rating", color: "#8b5cf6", get: (e: EmployeeRecord) => e.managerRating ?? e.selfRating },
  { key: "manager", label: "Manager Rating", color: "#3b82f6", get: (e: EmployeeRecord) => e.managerRating },
  { key: "self", label: "Self Rating", color: "#10b981", get: (e: EmployeeRecord) => e.selfRating },
] as const;

const DistributionOverlay = ({ employees, bands, bandColors }: DistributionOverlayProps) => {
  const [visible, setVisible] = useState<Record<string, boolean>>({
    final: true,
    manager: true,
    self: true,
  });

  const chartData = useMemo(() => {
    return bands.map(band => {
      const point: Record<string, any> = { label: band.shortLabel };
      SOURCES.forEach(src => {
        const count = employees.filter(e => {
          const r = src.get(e);
          return r !== null && r !== undefined && r >= band.min && r <= band.max;
        }).length;
        point[src.key] = count;
      });
      return point;
    });
  }, [employees, bands]);

  const stats = useMemo(() => {
    return SOURCES.map(src => {
      const vals = employees.map(e => src.get(e)).filter((v): v is number => v !== null && v !== undefined);
      const mean = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      const variance = vals.length > 0 ? vals.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / vals.length : 0;
      return { ...src, mean, stdDev: Math.sqrt(variance), count: vals.length };
    });
  }, [employees]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-violet-400" />
                </div>
                Distribution Overlay
              </CardTitle>
              <CardDescription className="ml-[42px]">
                Compare Final, Manager &amp; Self rating distributions on a single chart
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {SOURCES.map(src => (
                <label key={src.key} className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={visible[src.key]}
                    onCheckedChange={(v) => setVisible(prev => ({ ...prev, [src.key]: v }))}
                  />
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: src.color }} />
                    <span className="text-xs font-medium">{src.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <defs>
                  {SOURCES.map(src => (
                    <linearGradient key={src.key} id={`overlay-${src.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={src.color} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={src.color} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
                    borderRadius: "12px", fontSize: "12px", padding: "10px 14px",
                    boxShadow: "0 20px 60px -15px rgba(0,0,0,0.3)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                {SOURCES.map(src => visible[src.key] && (
                  <Area
                    key={src.key}
                    type="monotone"
                    dataKey={src.key}
                    name={src.label}
                    stroke={src.color}
                    strokeWidth={2.5}
                    fill={`url(#overlay-${src.key})`}
                    dot={{ r: 4, fill: "hsl(var(--card))", stroke: src.color, strokeWidth: 2 }}
                    animationDuration={800}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Stats comparison */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(src => (
          <Card key={src.key} className="border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: src.color }} />
                <span className="text-xs font-semibold">{src.label}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold">{src.count}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Rated</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{src.mean.toFixed(2)}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Mean (μ)</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{src.stdDev.toFixed(2)}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Std Dev (σ)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
};

export default DistributionOverlay;
