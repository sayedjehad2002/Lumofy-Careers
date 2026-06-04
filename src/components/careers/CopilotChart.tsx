import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export interface ChartBlock {
  type: "bar" | "line" | "pie" | "area" | "funnel";
  title: string;
  data: Record<string, any>[];
  xKey?: string;
  yKeys?: string[];
  colors?: string[];
}

const DEFAULT_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

export function parseChartBlocks(content: string): { cleanContent: string; charts: ChartBlock[] } {
  const charts: ChartBlock[] = [];
  let cleanContent = content;

  const regex = /```?\s*\n?CHART_DATA:\s*(\{[\s\S]*?\})\s*\n?```?/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const chart = JSON.parse(match[1]) as ChartBlock;
      if (chart.type && chart.data && Array.isArray(chart.data)) {
        charts.push(chart);
      }
    } catch { /* skip invalid */ }
    cleanContent = cleanContent.replace(match[0], "");
  }

  // Also try without backticks
  const regex2 = /CHART_DATA:\s*(\{[^\n]+\})/g;
  while ((match = regex2.exec(content)) !== null) {
    if (charts.some(c => JSON.stringify(c.data) === match![1])) continue;
    try {
      const chart = JSON.parse(match[1]) as ChartBlock;
      if (chart.type && chart.data && Array.isArray(chart.data)) {
        charts.push(chart);
      }
    } catch { /* skip */ }
    cleanContent = cleanContent.replace(match[0], "");
  }

  return { cleanContent: cleanContent.trim(), charts };
}

export function InlineChart({ chart }: { chart: ChartBlock }) {
  const colors = chart.colors || DEFAULT_COLORS;
  const xKey = chart.xKey || "name";
  const yKeys = chart.yKeys || ["value"];

  const chartContent = useMemo(() => {
    switch (chart.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chart.data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              {yKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
              ))}
              {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chart.data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              {yKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
              {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chart.data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              {yKeys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} fill={colors[i % colors.length]} fillOpacity={0.2} stroke={colors[i % colors.length]} strokeWidth={2} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chart.data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chart.data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case "funnel":
        // Render funnel as horizontal bar chart sorted by value descending
        const sortedData = [...chart.data].sort((a, b) => b.value - a.value);
        return (
          <ResponsiveContainer width="100%" height={Math.max(150, sortedData.length * 36)}>
            <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={55} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {sortedData.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  }, [chart, colors, xKey, yKeys]);

  return (
    <div className="my-3 rounded-lg border border-border bg-card/80 p-3 overflow-hidden">
      {chart.title && (
        <h4 className="text-xs font-semibold mb-2 text-foreground">{chart.title}</h4>
      )}
      {chartContent}
    </div>
  );
}
