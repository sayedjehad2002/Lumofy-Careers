import { useMemo } from "react";
import { CheckCircle2, AlertCircle, XCircle, BarChart3, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface CVCandidate {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  country: string | null;
  location: string | null;
  years_experience: string | null;
  skills: string[];
  industries: string[];
  suggested_department: string | null;
  manual_department: string | null;
  ai_analysis?: any;
}

interface Props {
  candidates: CVCandidate[];
  onViewCandidate: (id: string) => void;
  onBulkReparse: () => void;
}

const FIELDS = [
  { key: "name", label: "Name", weight: 15 },
  { key: "email", label: "Email", weight: 15 },
  { key: "phone", label: "Phone", weight: 10 },
  { key: "nationality", label: "Nationality", weight: 5 },
  { key: "location", label: "Location", weight: 10 },
  { key: "years_experience", label: "Experience", weight: 10 },
  { key: "skills", label: "Skills", weight: 15 },
  { key: "department", label: "Department", weight: 10 },
  { key: "ai_analysis", label: "AI Analysis", weight: 10 },
];

function getCompleteness(c: CVCandidate): { score: number; missing: string[] } {
  let score = 0;
  const missing: string[] = [];

  FIELDS.forEach(f => {
    let filled = false;
    switch (f.key) {
      case "name": filled = !!c.name; break;
      case "email": filled = !!c.email; break;
      case "phone": filled = !!c.phone; break;
      case "nationality": filled = !!c.nationality; break;
      case "location": filled = !!c.location; break;
      case "years_experience": filled = !!c.years_experience; break;
      case "skills": filled = (c.skills || []).length > 0; break;
      case "department": filled = !!(c.manual_department || c.suggested_department); break;
      case "ai_analysis": filled = !!c.ai_analysis; break;
    }
    if (filled) score += f.weight;
    else missing.push(f.label);
  });

  return { score, missing };
}

export default function DataCompleteness({ candidates, onViewCandidate, onBulkReparse }: Props) {
  const analysis = useMemo(() => {
    const items = candidates.map(c => ({
      candidate: c,
      ...getCompleteness(c),
    }));

    const avgScore = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.score, 0) / items.length) : 0;
    const complete = items.filter(i => i.score === 100).length;
    const incomplete = items.filter(i => i.score < 50);
    const fieldGaps: Record<string, number> = {};

    items.forEach(i => {
      i.missing.forEach(m => {
        fieldGaps[m] = (fieldGaps[m] || 0) + 1;
      });
    });

    const topGaps = Object.entries(fieldGaps).sort((a, b) => b[1] - a[1]);

    return { items, avgScore, complete, incomplete, topGaps };
  }, [candidates]);

  const scoreColor = (s: number) =>
    s >= 80 ? "text-emerald-400" : s >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Data Completeness</h3>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-3xl font-bold">{analysis.avgScore}%</p>
          <p className="text-[10px] text-muted-foreground">Avg Completeness</p>
          <Progress value={analysis.avgScore} className="h-1.5 mt-2" />
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400">{analysis.complete}</p>
          <p className="text-[10px] text-muted-foreground">Fully Complete</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{analysis.incomplete.length}</p>
          <p className="text-[10px] text-muted-foreground">Below 50%</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-3xl font-bold">{candidates.length}</p>
          <p className="text-[10px] text-muted-foreground">Total CVs</p>
        </div>
      </div>

      {/* Field Gaps */}
      {analysis.topGaps.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4">
          <h4 className="font-semibold text-sm mb-3">Most Common Missing Fields</h4>
          <div className="space-y-2">
            {analysis.topGaps.map(([field, count]) => (
              <div key={field} className="flex items-center gap-3">
                <span className="text-xs w-24 text-muted-foreground">{field}</span>
                <div className="flex-1 h-3 bg-secondary/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-500/40"
                    style={{ width: `${(count / candidates.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-16 text-right">{count} missing</span>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={onBulkReparse}>
            <Zap className="w-3.5 h-3.5" /> Bulk Re-Parse to Fill Gaps
          </Button>
        </div>
      )}

      {/* Worst candidates */}
      {analysis.incomplete.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4">
          <h4 className="font-semibold text-sm mb-3">Candidates Needing Attention</h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {analysis.incomplete.slice(0, 15).map(({ candidate: c, score, missing }) => (
              <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20 cursor-pointer hover:bg-secondary/40" onClick={() => onViewCandidate(c.id)}>
                <div className={`text-sm font-bold w-10 text-center ${scoreColor(score)}`}>{score}%</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name || "Unknown"}</p>
                  <p className="text-[10px] text-muted-foreground">Missing: {missing.join(", ")}</p>
                </div>
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
