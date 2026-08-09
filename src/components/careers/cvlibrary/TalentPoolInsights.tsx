import { useMemo } from "react";
import { Brain, Users, Globe, Briefcase, TrendingUp, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TONE_TEXT, TONE_BORDER, CHART_SERIES } from "@/components/careers/statusColors";

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

// Theme-aware, de-duplicated categorical palette (was repeating chart-3 / chart-5).
const COLORS = CHART_SERIES;

export default function TalentPoolInsights({ candidates }: Props) {
  const insights = useMemo(() => {
    const skillCount: Record<string, number> = {};
    const industryCount: Record<string, number> = {};
    const nationalityCount: Record<string, number> = {};
    const deptCount: Record<string, number> = {};
    const expBuckets = { "0-2": 0, "3-5": 0, "6-10": 0, "10+": 0, Unknown: 0 };

    // Coverage: how many CVs actually carry each field. Every chart below is
    // drawn from a subset, and saying so is the difference between a statistic
    // and a guess — only 24 of 433 CVs have a nationality, for instance.
    let withSkills = 0, withExperience = 0, withNationality = 0;

    /** "Saudi" and "Saudi Arabia" are one nationality stored two ways; without
     *  folding, the count over-reports and the chart splits one bar into two. */
    const normNationality = (raw: string) => {
      const s = raw.trim().replace(/\s+/g, " ");
      const key = s.toLowerCase().replace(/[^a-z ]/g, "");
      const ALIASES: Record<string, string> = {
        "saudi arabia": "Saudi", "saudi arabian": "Saudi", "ksa": "Saudi",
        "egypt": "Egyptian", "bahrain": "Bahraini", "pakistan": "Pakistani",
        "india": "Indian", "jordan": "Jordanian", "syria": "Syrian",
        "uae": "Emirati", "united arab emirates": "Emirati",
      };
      return ALIASES[key] || s.replace(/\b\w/g, ch => ch.toUpperCase());
    };

    candidates.forEach(c => {
      const skills = (c.skills || []).map(s => String(s).trim()).filter(Boolean);
      if (skills.length) withSkills++;
      // Case-fold so "React" and "react" are one skill, not two.
      const seen = new Set<string>();
      skills.forEach(s => {
        const key = s.toLowerCase();
        if (seen.has(key)) return;      // don't let one CV count a skill twice
        seen.add(key);
        skillCount[s] = (skillCount[s] || 0) + 1;
      });

      c.industries?.forEach(ind => { industryCount[ind] = (industryCount[ind] || 0) + 1; });

      if (c.nationality?.trim()) {
        withNationality++;
        const n = normNationality(c.nationality);
        nationalityCount[n] = (nationalityCount[n] || 0) + 1;
      }

      const dept = c.manual_department || c.suggested_department;
      if (dept) deptCount[dept] = (deptCount[dept] || 0) + 1;

      const yrs = parseFloat(c.years_experience || "");
      if (isNaN(yrs)) expBuckets.Unknown++;
      else {
        withExperience++;
        if (yrs <= 2) expBuckets["0-2"]++;
        else if (yrs <= 5) expBuckets["3-5"]++;
        else if (yrs <= 10) expBuckets["6-10"]++;
        else expBuckets["10+"]++;
      }
    });

    const allSkills = Object.entries(skillCount).sort((a, b) => b[1] - a[1]);
    const topSkills = allSkills.slice(0, 12);
    const topIndustries = Object.entries(industryCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const allNationalities = Object.entries(nationalityCount).sort((a, b) => b[1] - a[1]);
    const topNationalities = allNationalities.slice(0, 8);
    const depts = Object.entries(deptCount).sort((a, b) => b[1] - a[1]);

    // Talent gaps: departments with few candidates
    const avgPerDept = candidates.length / Math.max(depts.length, 1);
    const gapDepts = depts.filter(([, count]) => count < avgPerDept * 0.5);

    return {
      topSkills, topIndustries, topNationalities, depts, expBuckets, gapDepts, avgPerDept,
      uniqueSkills: allSkills.length,
      uniqueNationalities: allNationalities.length,
      withSkills, withExperience, withNationality,
    };
  }, [candidates]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Talent Pool Insights</h3>
        <Badge variant="secondary" className="text-[10px]">{candidates.length} candidates</Badge>
      </div>

      {/* Summary stats. Each carries the population it was measured over, because
          most of these fields are only present on part of the library and a bare
          number reads as if it described all of it. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users className="w-4 h-4" />} label="Total CVs" value={candidates.length} />
        <StatCard
          icon={<Layers className="w-4 h-4" />}
          label="Unique skills"
          // Was `topSkills.length` — an array already capped at 12, so the tile
          // could only ever print "12" no matter how many skills existed (2,241).
          value={insights.uniqueSkills.toLocaleString()}
          sub={`across ${insights.withSkills} of ${candidates.length} CVs`}
        />
        <StatCard
          icon={<Globe className="w-4 h-4" />}
          label="Nationalities"
          value={insights.uniqueNationalities}
          sub={`known for ${insights.withNationality} of ${candidates.length}`}
        />
        <StatCard icon={<Briefcase className="w-4 h-4" />} label="Departments" value={insights.depts.length} />
      </div>

      {insights.withSkills < candidates.length * 0.9 && (
        <p className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-[11px] text-muted-foreground">
          Charts below describe only the CVs that carry each field:{" "}
          <strong className="text-foreground">{insights.withSkills}</strong> have skills,{" "}
          <strong className="text-foreground">{insights.withExperience}</strong> have years of
          experience, <strong className="text-foreground">{insights.withNationality}</strong> have a
          nationality — out of {candidates.length}. Re-parse under the Quality tab to fill the gaps.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          title="Most common skills"
          note={insights.withSkills ? `share of the ${insights.withSkills} CVs that list skills` : undefined}
        >
          <BarList rows={insights.topSkills} total={insights.withSkills} />
        </Panel>

        {/* A donut here was 47% "Unknown", so the shape of the ring described
            missing data rather than the talent pool. The known levels now get a
            proportional bar of their own and the gap is stated underneath. */}
        <Panel
          title="Experience levels"
          note={insights.withExperience ? `of the ${insights.withExperience} CVs with a stated figure` : undefined}
        >
          {insights.withExperience === 0 ? (
            <Empty>No CV has a years-of-experience figure yet.</Empty>
          ) : (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary/40" role="img"
                aria-label="Experience distribution">
                {EXP_ORDER.map((k, i) => {
                  const v = insights.expBuckets[k];
                  if (!v) return null;
                  return (
                    <div
                      key={k}
                      title={`${k} years — ${v}`}
                      style={{ width: `${(v / insights.withExperience) * 100}%`, background: COLORS[i % COLORS.length] }}
                    />
                  );
                })}
              </div>
              <ul className="mt-3 space-y-1.5">
                {EXP_ORDER.map((k, i) => {
                  const v = insights.expBuckets[k];
                  if (!v) return null;
                  const pct = Math.round((v / insights.withExperience) * 100);
                  return (
                    <li key={k} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{k} years</span>
                      <span className="ml-auto tabular-nums font-medium">{v}</span>
                      <span className="w-9 text-right tabular-nums text-muted-foreground">{pct}%</span>
                    </li>
                  );
                })}
              </ul>
              {insights.expBuckets.Unknown > 0 && (
                <p className="mt-3 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  {insights.expBuckets.Unknown} more CVs have no experience figure, so they are left out
                  of the split above rather than shown as a slice of it.
                </p>
              )}
            </>
          )}
        </Panel>

        {/* Was a recharts vertical bar chart with a 100px axis: "Professional
            Services" and "Project Management" wrapped and collided. Plain rows
            give the label the full width it needs. */}
        <Panel title="By department" note={`${candidates.length} CVs`}>
          {insights.depts.length === 0
            ? <Empty>No department has been assigned yet.</Empty>
            : <BarList rows={insights.depts} total={candidates.length} />}
        </Panel>

        <Panel
          title="Nationalities"
          // Complements the tile above (which carries the coverage) rather than
          // repeating the same sentence twice on one screen.
          note={insights.withNationality ? `share of the ${insights.withNationality} CVs that record one` : undefined}
        >
          {insights.withNationality === 0 ? (
            <Empty>No CV records a nationality yet.</Empty>
          ) : (
            <>
              <BarList rows={insights.topNationalities} total={insights.withNationality} tone="chart-2" />
              {insights.withNationality < candidates.length * 0.5 && (
                <p className="mt-3 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  Based on {Math.round((insights.withNationality / candidates.length) * 100)}% of the
                  library — too thin to treat as representative.
                </p>
              )}
            </>
          )}
        </Panel>
      </div>

      {/* Renamed from "Talent Gaps": this component only sees the CV library, not
          your open roles, so it can say which pools are thin but not which ones
          you actually need. Overstating that would be the wrong kind of insight. */}
      {insights.gapDepts.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4">
          <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className={`h-4 w-4 ${TONE_TEXT.warning}`} aria-hidden="true" />
            Thinnest pools
          </h4>
          <p className="mb-3 text-xs text-muted-foreground">
            Fewer than half the {Math.round(insights.avgPerDept)}-CV average per department. Worth a
            sourcing push if you are hiring into any of them.
          </p>
          <div className="flex flex-wrap gap-2">
            {insights.gapDepts.map(([dept, count]) => (
              <Badge key={dept} variant="outline" className={`${TONE_TEXT.warning} ${TONE_BORDER.warning}`}>
                {dept}: {count}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const EXP_ORDER = ["0-2", "3-5", "6-10", "10+"] as const;

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="h-full rounded-xl border border-border bg-card p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold">{title}</h4>
        {note && <p className="mt-0.5 text-[11px] text-muted-foreground">{note}</p>}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Label / proportional bar / count / share. Labels wrap instead of truncating,
 *  because the longest entries here are real department names. */
function BarList({ rows, total, tone = "primary" }: {
  rows: [string, number][]; total: number; tone?: "primary" | "chart-2";
}) {
  const max = rows[0]?.[1] || 1;
  return (
    <ul className="space-y-2">
      {rows.map(([label, count]) => (
        <li key={label} className="flex items-center gap-2.5">
          <span className="w-[38%] text-xs leading-snug text-muted-foreground" title={label}>{label}</span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary/40">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.max((count / max) * 100, 2)}%`, background: `hsl(var(--${tone}))` }}
            />
          </span>
          <span className="w-7 text-right text-xs font-medium tabular-nums">{count}</span>
          <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
            {total ? `${Math.round((count / total) * 100)}%` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string;
}) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 text-center">
      <div className="flex items-center justify-center text-primary mb-1">{icon}</div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {/* The denominator, so a number is never mistaken for full coverage. */}
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}
