import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Loader2, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import type { Survey, SurveyResponse, SurveyQuestion } from "@/types/surveys";

const COLORS = ["hsl(217, 91%, 50%)", "hsl(150, 50%, 40%)", "hsl(280, 50%, 50%)", "hsl(30, 80%, 55%)", "hsl(0, 72%, 51%)", "hsl(185, 60%, 40%)"];

interface Props {
  surveys: Survey[];
  sessionToken: string;
}

interface SurveyMetric {
  survey_title: string;
  date: string;
  avg_rating: number | null;
  nps_score: number | null;
  response_count: number;
  completion_rate: number;
}

const CrossSurveyTrends = ({ surveys, sessionToken }: Props) => {
  const [metrics, setMetrics] = useState<SurveyMetric[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      if (surveys.length === 0) return;
      setLoading(true);
      const results: SurveyMetric[] = [];

      for (const survey of surveys.filter(s => s.status !== "draft")) {
        try {
          const [respRes, surveyRes] = await Promise.all([
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=get_responses&id=${survey.id}`, {
              headers: { "x-session-token": sessionToken, "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
            }),
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=get&id=${survey.id}`, {
              headers: { "x-session-token": sessionToken, "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
            }),
          ]);
          const respJson = await respRes.json();
          const surveyJson = await surveyRes.json();
          const responses: SurveyResponse[] = respJson.responses || [];
          const questions: SurveyQuestion[] = surveyJson.survey?.questions || [];

          let avgRating: number | null = null;
          let npsScore: number | null = null;

          // Calculate avg rating
          const ratingQs = questions.filter(q => q.type === "rating");
          if (ratingQs.length > 0 && responses.length > 0) {
            const values: number[] = [];
            responses.forEach(r => {
              (r.answers || []).forEach(a => {
                const q = ratingQs.find(qq => qq.id === a.question_id);
                if (q && a.answer_text) {
                  const v = parseFloat(a.answer_text);
                  if (!isNaN(v)) values.push(v);
                }
              });
            });
            avgRating = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : null;
          }

          // Calculate NPS
          const npsQs = questions.filter(q => q.type === "nps");
          if (npsQs.length > 0 && responses.length > 0) {
            const values: number[] = [];
            responses.forEach(r => {
              (r.answers || []).forEach(a => {
                const q = npsQs.find(qq => qq.id === a.question_id);
                if (q && a.answer_text) {
                  const v = parseFloat(a.answer_text);
                  if (!isNaN(v)) values.push(v);
                }
              });
            });
            if (values.length > 0) {
              const promoters = values.filter(v => v >= 9).length;
              const detractors = values.filter(v => v <= 6).length;
              npsScore = Math.round(((promoters - detractors) / values.length) * 100);
            }
          }

          results.push({
            survey_title: survey.title,
            date: new Date(survey.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
            avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
            nps_score: npsScore,
            response_count: responses.length,
            completion_rate: responses.length > 0 ? 100 : 0,
          });
        } catch {}
      }

      results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setMetrics(results);
      setLoading(false);
    };
    fetchAll();
  }, [surveys, sessionToken]);

  const hasRatings = metrics.some(m => m.avg_rating !== null);
  const hasNps = metrics.some(m => m.nps_score !== null);

  if (loading) {
    return <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>;
  }

  if (metrics.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-12 text-center text-muted-foreground">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No survey data to compare yet. Publish and collect responses to see trends.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Cross-Survey Trends
        </h3>
        <p className="text-sm text-muted-foreground">Compare results across surveys over time</p>
      </div>

      {/* Response Count Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Response Volume Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="survey_title" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Line type="monotone" dataKey="response_count" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 4 }} name="Responses" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Rating Trends */}
      {hasRatings && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Rating Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metrics.filter(m => m.avg_rating !== null)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="survey_title" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="avg_rating" stroke={COLORS[2]} strokeWidth={2} dot={{ r: 4 }} name="Avg Rating" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* NPS Trends */}
      {hasNps && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">eNPS Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metrics.filter(m => m.nps_score !== null)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="survey_title" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis domain={[-100, 100]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="nps_score" stroke={COLORS[1]} strokeWidth={2} dot={{ r: 4 }} name="eNPS" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Summary Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Survey Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">Survey</th>
                  <th className="text-center py-2 text-xs text-muted-foreground font-medium">Responses</th>
                  <th className="text-center py-2 text-xs text-muted-foreground font-medium">Avg Rating</th>
                  <th className="text-center py-2 text-xs text-muted-foreground font-medium">eNPS</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 font-medium truncate max-w-[200px]">{m.survey_title}</td>
                    <td className="py-2 text-center">{m.response_count}</td>
                    <td className="py-2 text-center">{m.avg_rating?.toFixed(1) || "—"}</td>
                    <td className="py-2 text-center">
                      {m.nps_score !== null ? (
                        <Badge variant={m.nps_score >= 0 ? "default" : "destructive"} className="text-xs">{m.nps_score}</Badge>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CrossSurveyTrends;
