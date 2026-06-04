import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Building2, Loader2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import type { Survey, SurveyResponse, SurveyQuestion } from "@/types/surveys";

const HEAT_COLORS = ["#ef4444", "#f59e0b", "#eab308", "#84cc16", "#22c55e"];

function getHeatColor(value: number, max: number): string {
  const idx = Math.min(Math.floor((value / max) * HEAT_COLORS.length), HEAT_COLORS.length - 1);
  return HEAT_COLORS[idx];
}

interface Props {
  surveys: Survey[];
  sessionToken: string;
}

const DepartmentDrillDown = ({ surveys, sessionToken }: Props) => {
  const [surveyId, setSurveyId] = useState("");
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!surveyId || !sessionToken) return;
    const fetch_ = async () => {
      setLoading(true);
      try {
        const [respRes, surveyRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=get_responses&id=${surveyId}`, {
            headers: { "x-session-token": sessionToken, "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          }),
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=get&id=${surveyId}`, {
            headers: { "x-session-token": sessionToken, "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          }),
        ]);
        const respJson = await respRes.json();
        const surveyJson = await surveyRes.json();
        setResponses(respJson.responses || []);
        setQuestions(surveyJson.survey?.questions || []);
      } catch {}
      setLoading(false);
    };
    fetch_();
  }, [surveyId, sessionToken]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    responses.forEach(r => {
      if (r.respondent_department) depts.add(r.respondent_department);
    });
    return Array.from(depts);
  }, [responses]);

  const ratingQuestions = useMemo(() => questions.filter(q => ["rating", "nps", "likert"].includes(q.type)), [questions]);

  const heatmapData = useMemo(() => {
    if (!departments.length || !ratingQuestions.length) return [];

    return departments.map(dept => {
      const deptResponses = responses.filter(r => r.respondent_department === dept);
      const questionScores: Record<string, number> = {};

      ratingQuestions.forEach(q => {
        const values: number[] = [];
        deptResponses.forEach(r => {
          (r.answers || []).forEach(a => {
            if (a.question_id === q.id && a.answer_text) {
              const v = parseFloat(a.answer_text);
              if (!isNaN(v)) values.push(v);
            }
          });
        });
        questionScores[q.id] = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
      });

      const avgScore = Object.values(questionScores).length > 0
        ? Object.values(questionScores).reduce((s, v) => s + v, 0) / Object.values(questionScores).length
        : 0;

      return { department: dept, responses: deptResponses.length, avgScore: Math.round(avgScore * 10) / 10, questionScores };
    });
  }, [departments, ratingQuestions, responses]);

  const chartData = heatmapData.map(d => ({
    name: d.department,
    score: d.avgScore,
    responses: d.responses,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" /> Department Drill-Down
        </h3>
        <p className="text-sm text-muted-foreground">Break down responses by department with satisfaction heatmaps</p>
      </div>

      <Select value={surveyId} onValueChange={setSurveyId}>
        <SelectTrigger className="w-72"><SelectValue placeholder="Select a survey" /></SelectTrigger>
        <SelectContent>
          {surveys.filter(s => s.status !== "draft").map(s => (
            <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!surveyId ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Select a survey to see department breakdowns</p>
            <p className="text-xs mt-1">Note: Respondents must provide their department for this to work</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : departments.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No department data available. Make sure respondents provide their department when submitting.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Bar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Average Score by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={getHeatColor(entry.score, 5)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Heatmap Table */}
          {ratingQuestions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Question × Department Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium min-w-[120px]">Department</th>
                        {ratingQuestions.map(q => (
                          <th key={q.id} className="text-center py-2 px-2 text-muted-foreground font-medium min-w-[80px]" title={q.question_text}>
                            {q.question_text.slice(0, 20)}...
                          </th>
                        ))}
                        <th className="text-center py-2 px-2 text-muted-foreground font-medium">Avg</th>
                        <th className="text-center py-2 px-2 text-muted-foreground font-medium">N</th>
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData.map((d, i) => (
                        <tr key={d.department} className="border-b border-border/50">
                          <td className="py-2 px-2 font-medium">{d.department}</td>
                          {ratingQuestions.map(q => {
                            const score = d.questionScores[q.id] || 0;
                            const max = q.type === "nps" ? 10 : 5;
                            return (
                              <td key={q.id} className="py-2 px-2 text-center">
                                <span
                                  className="inline-block px-2 py-0.5 rounded text-[10px] font-bold"
                                  style={{
                                    backgroundColor: score > 0 ? getHeatColor(score, max) + "30" : "transparent",
                                    color: score > 0 ? getHeatColor(score, max) : "inherit"
                                  }}
                                >
                                  {score > 0 ? score.toFixed(1) : "—"}
                                </span>
                              </td>
                            );
                          })}
                          <td className="py-2 px-2 text-center font-bold">{d.avgScore.toFixed(1)}</td>
                          <td className="py-2 px-2 text-center text-muted-foreground">{d.responses}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-2 mt-4 justify-center">
                  <span className="text-[10px] text-muted-foreground">Low</span>
                  {HEAT_COLORS.map((c, i) => (
                    <div key={i} className="w-6 h-3 rounded" style={{ backgroundColor: c }} />
                  ))}
                  <span className="text-[10px] text-muted-foreground">High</span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default DepartmentDrillDown;
