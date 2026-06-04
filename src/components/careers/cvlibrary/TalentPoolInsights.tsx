import { useMemo } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Brain, Users, Globe, Briefcase, TrendingUp, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CVCandidate {
  id: string;
  name: string | null;
  skills: string[];
  industries: string[];
  nationality: string | null;
  years_experience: string | null;
  status: string;
  suggested_department: string | null;
  manual_department: string | null;
  ai_analysis?: { fitScore: number; fitLevel: string } | null;
}

interface Props {
  candidates: CVCandidate[];
}

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(142 76% 36%)",
  "hsl(280 65% 60%)", "hsl(25 95% 53%)",
];

export default function TalentPoolInsights({ candidates }: Props) {
  const insights = useMemo(() => {
    const skillCount: Record<string, number> = {};
    const industryCount: Record<string, number> = {};
    const nationalityCount: Record<string, number> = {};
    const deptCount: Record<string, number> = {};
    const expBuckets = { "0-2": 0, "3-5": 0, "6-10": 0, "10+": 0, Unknown: 0 };

    candidates.forEach(c => {
      c.skills?.forEach(s => { skillCount[s] = (skillCount[s] || 0) + 1; });
      c.industries?.forEach(ind => { industryCount[ind] = (industryCount[ind] || 0) + 1; });
      if (c.nationality) nationalityCount[c.nationality] = (nationalityCount[c.nationality] || 0) + 1;

      const dept = c.manual_department || c.suggested_department;
      if (dept) deptCount[dept] = (deptCount[dept] || 0) + 1;

      const yrs = parseFloat(c.years_experience || "");
      if (isNaN(yrs)) expBuckets.Unknown++;
      else if (yrs <= 2) expBuckets["0-2"]++;
      else if (yrs <= 5) expBuckets["3-5"]++;
      else if (yrs <= 10) expBuckets["6-10"]++;
      else expBuckets["10+"]++;
    });

    const topSkills = Object.entries(skillCount).sort((a, b) => b[1] - a[1]).slice(0, 12);
    const topIndustries = Object.entries(industryCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topNationalities = Object.entries(nationalityCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const depts = Object.entries(deptCount).sort((a, b) => b[1] - a[1]);

    // Talent gaps: departments with few candidates
    const avgPerDept = candidates.length / Math.max(depts.length, 1);
    const gapDepts = depts.filter(([, count]) => count < avgPerDept * 0.5);

    return { topSkills, topIndustries, topNationalities, depts, expBuckets, gapDepts, avgPerDept };
  }, [candidates]);

  const expData = Object.entries(insights.expBuckets).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  const deptData = insights.depts.map(([name, value]) => ({ name, value }));
  const natData = insights.topNationalities.map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Talent Pool Insights</h3>
        <Badge variant="secondary" className="text-[10px]">{candidates.length} candidates</Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users className="w-4 h-4" />} label="Total CVs" value={candidates.length} />
        <StatCard icon={<Layers className="w-4 h-4" />} label="Unique Skills" value={Object.keys(insights.topSkills).length > 12 ? "12+" : insights.topSkills.length} />
        <StatCard icon={<Globe className="w-4 h-4" />} label="Nationalities" value={insights.topNationalities.length} />
        <StatCard icon={<Briefcase className="w-4 h-4" />} label="Departments" value={insights.depts.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Skills */}
        <div className="rounded-xl bg-card border border-border p-4">
          <h4 className="font-semibold text-sm mb-3">Top Skills</h4>
          <div className="space-y-2">
            {insights.topSkills.map(([skill, count], i) => (
              <div key={skill} className="flex items-center gap-2">
                <span className="text-xs w-28 truncate text-muted-foreground">{skill}</span>
                <div className="flex-1 h-4 bg-secondary/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{ width: `${(count / (insights.topSkills[0]?.[1] || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Experience Distribution */}
        <div className="rounded-xl bg-card border border-border p-4">
          <h4 className="font-semibold text-sm mb-3">Experience Levels</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={expData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {expData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department Distribution */}
        <div className="rounded-xl bg-card border border-border p-4">
          <h4 className="font-semibold text-sm mb-3">By Department</h4>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No department data yet</p>
          )}
        </div>

        {/* Nationality Distribution */}
        <div className="rounded-xl bg-card border border-border p-4">
          <h4 className="font-semibold text-sm mb-3">Top Nationalities</h4>
          {natData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={natData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No nationality data yet</p>
          )}
        </div>
      </div>

      {/* Talent Gaps */}
      {insights.gapDepts.length > 0 && (
        <div className="rounded-xl bg-card border border-yellow-500/20 p-4">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-yellow-400" /> Talent Gaps Identified
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            These departments have fewer candidates than average ({Math.round(insights.avgPerDept)} per department)
          </p>
          <div className="flex flex-wrap gap-2">
            {insights.gapDepts.map(([dept, count]) => (
              <Badge key={dept} variant="outline" className="text-yellow-400 border-yellow-500/30">
                {dept}: {count} CVs
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 text-center">
      <div className="flex items-center justify-center text-primary mb-1">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
