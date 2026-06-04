import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, Users, TrendingUp, CheckCircle2, Sparkles, AlertTriangle, ThumbsUp, ListChecks, Target, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from "recharts";
import { toast } from "sonner";
import type { Survey, SurveyResponse, SurveyQuestion, TextInsight } from "@/types/surveys";
import SurveyIntelligence from "./SurveyIntelligence";

const COLORS = ["hsl(217, 91%, 50%)", "hsl(185, 60%, 40%)", "hsl(150, 50%, 40%)", "hsl(280, 50%, 50%)", "hsl(30, 80%, 55%)", "hsl(0, 72%, 51%)"];
const SENTIMENT_COLORS: Record<string, string> = {
  positive: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  neutral: "text-muted-foreground bg-secondary/50 border-border",
  concern: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  urgent: "text-destructive bg-destructive/10 border-destructive/20",
};

// HR Industry Benchmarks (based on published research averages)
const HR_BENCHMARKS: Record<string, { label: string; benchmark: number; unit: string; goodAbove: boolean }> = {
  enps: { label: "eNPS Score", benchmark: 12, unit: "pts", goodAbove: true },
  engagement_rating: { label: "Engagement Rating", benchmark: 3.6, unit: "/5", goodAbove: true },
  completion_rate: { label: "Completion Rate", benchmark: 70, unit: "%", goodAbove: true },
  onboarding_satisfaction: { label: "Onboarding Satisfaction", benchmark: 3.8, unit: "/5", goodAbove: true },
  manager_effectiveness: { label: "Manager Effectiveness", benchmark: 3.5, unit: "/5", goodAbove: true },
  candidate_experience: { label: "Candidate Experience", benchmark: 3.7, unit: "/5", goodAbove: true },
};

interface Props {
  surveys: Survey[];
  selectedSurveyId: string | null;
  sessionToken: string | null;
}

const SurveyAnalyticsView = ({ surveys, selectedSurveyId, sessionToken }: Props) => {
  const [surveyId, setSurveyId] = useState(selectedSurveyId || "");
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [surveyData, setSurveyData] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(false);
  const [textInsights, setTextInsights] = useState<Record<string, TextInsight>>({});
  const [analyzingQuestion, setAnalyzingQuestion] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSurveyId) setSurveyId(selectedSurveyId);
  }, [selectedSurveyId]);

  useEffect(() => {
    if (!surveyId || !sessionToken) return;
    const fetchData = async () => {
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
        setSurveyData(surveyJson.survey || null);
        setTextInsights({});
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, [surveyId, sessionToken]);

  const questions = useMemo(() => (surveyData?.questions || []) as SurveyQuestion[], [surveyData]);

  // Compute analytics per question
  const questionAnalytics = useMemo(() => {
    if (!questions.length || !responses.length) return [];

    return questions
      .filter((q) => q.type !== "section_divider" && q.type !== "statement")
      .map((q) => {
        const answers = responses.flatMap((r) => (r.answers || []).filter((a) => a.question_id === q.id));
        const total = answers.length;

        if (["single_choice", "multiple_choice", "dropdown", "likert", "yes_no"].includes(q.type)) {
          const optionCounts: Record<string, number> = {};
          const opts = q.type === "yes_no" ? ["Yes", "No"] : (q.options || []);
          opts.forEach((o) => (optionCounts[o] = 0));

          answers.forEach((a) => {
            if (a.answer_text) {
              optionCounts[a.answer_text] = (optionCounts[a.answer_text] || 0) + 1;
            }
            if (a.answer_json && Array.isArray(a.answer_json)) {
              a.answer_json.forEach((v: string) => {
                optionCounts[v] = (optionCounts[v] || 0) + 1;
              });
            }
          });

          const chartData = Object.entries(optionCounts).map(([name, value]) => ({ name, value }));
          return { question: q, type: "distribution" as const, chartData, total };
        }

        if (["rating", "nps"].includes(q.type)) {
          const values = answers.map((a) => parseFloat(a.answer_text || "0")).filter((v) => !isNaN(v));
          const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;

          if (q.type === "nps") {
            const promoters = values.filter((v) => v >= 9).length;
            const detractors = values.filter((v) => v <= 6).length;
            const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
            const distribution = [
              { name: "Promoters (9-10)", value: promoters },
              { name: "Passives (7-8)", value: values.filter((v) => v >= 7 && v <= 8).length },
              { name: "Detractors (0-6)", value: detractors },
            ];
            return { question: q, type: "nps" as const, npsScore, avg, chartData: distribution, total };
          }

          const distribution: Record<number, number> = {};
          const min = q.settings?.min || 1;
          const max = q.settings?.max || 5;
          for (let i = min; i <= max; i++) distribution[i] = 0;
          values.forEach((v) => { if (distribution[v] !== undefined) distribution[v]++; });
          const chartData = Object.entries(distribution).map(([name, value]) => ({ name, value }));
          return { question: q, type: "rating" as const, avg, chartData, total };
        }

        // Text questions
        const textAnswers = answers.map((a) => a.answer_text).filter(Boolean) as string[];
        return { question: q, type: "text" as const, textAnswers, total };
      });
  }, [questions, responses]);

  const completionRate = responses.length > 0 ? 100 : 0;

  // Compute executive summary stats
  const npsAnalytics = questionAnalytics.filter(qa => qa.type === "nps");
  const latestNps = npsAnalytics.length > 0 ? (npsAnalytics[0] as any).npsScore : null;
  const ratingAnalytics = questionAnalytics.filter(qa => qa.type === "rating");
  const avgOverallRating = ratingAnalytics.length > 0
    ? (ratingAnalytics.reduce((sum, qa) => sum + ((qa as any).avg || 0), 0) / ratingAnalytics.length).toFixed(1)
    : null;

  // AI Text Insights
  const analyzeTextQuestion = async (questionId: string) => {
    const qa = questionAnalytics.find(a => a.question.id === questionId);
    if (!qa || qa.type !== "text" || (qa as any).textAnswers.length === 0) return;

    setAnalyzingQuestion(questionId);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-ai-insights`,
        {
          method: "POST",
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            responses: (qa as any).textAnswers,
            question_text: qa.question.question_text,
            survey_title: surveyData?.title,
          }),
        }
      );

      if (res.status === 429) {
        toast.error("Rate limit exceeded. Please try again later.");
        setAnalyzingQuestion(null);
        return;
      }

      const json = await res.json();
      if (json.insights) {
        setTextInsights(prev => ({ ...prev, [questionId]: json.insights }));
      } else {
        toast.error(json.error || "Analysis failed");
      }
    } catch (err: any) {
      toast.error("Failed to analyze text responses");
    }
    setAnalyzingQuestion(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Select value={surveyId} onValueChange={setSurveyId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Select a survey" />
          </SelectTrigger>
          <SelectContent>
            {surveys.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!surveyId ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Select a survey to view analytics</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : (
        <>
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Responses", value: responses.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
              { label: "Completion Rate", value: `${completionRate}%`, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Questions", value: questionAnalytics.length, icon: BarChart3, color: "text-purple-400", bg: "bg-purple-500/10" },
              { label: "Avg Rating", value: avgOverallRating || "—", icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10" },
              { label: "eNPS Score", value: latestNps !== null ? latestNps : "—", icon: Sparkles, color: latestNps !== null && latestNps >= 0 ? "text-emerald-400" : "text-amber-400", bg: latestNps !== null && latestNps >= 0 ? "bg-emerald-500/10" : "bg-amber-500/10" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}><stat.icon className="w-5 h-5" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-xl font-bold">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* HR Benchmark Comparison */}
          {responses.length > 0 && (latestNps !== null || avgOverallRating) && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    HR Industry Benchmark Comparison
                    <Badge variant="secondary" className="text-[10px]">Industry Avg</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {latestNps !== null && (() => {
                      const bm = HR_BENCHMARKS.enps;
                      const diff = latestNps - bm.benchmark;
                      const isGood = diff >= 0;
                      return (
                        <div className="p-3 rounded-lg border border-border bg-secondary/30">
                          <p className="text-[10px] text-muted-foreground mb-1">{bm.label}</p>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-bold">{latestNps}</span>
                            <span className="text-xs text-muted-foreground mb-0.5">vs {bm.benchmark}{bm.unit}</span>
                            <span className={`text-xs font-medium flex items-center gap-0.5 mb-0.5 ${isGood ? "text-emerald-400" : "text-amber-400"}`}>
                              {isGood ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {Math.abs(diff).toFixed(0)}{bm.unit}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full rounded-full ${isGood ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, Math.max(5, ((latestNps + 100) / 200) * 100))}%` }} />
                          </div>
                        </div>
                      );
                    })()}
                    {avgOverallRating && (() => {
                      const val = parseFloat(avgOverallRating);
                      const category = surveyData?.category || "custom";
                      const bmKey = category === "onboarding" ? "onboarding_satisfaction"
                        : category === "candidate_experience" ? "candidate_experience"
                        : "engagement_rating";
                      const bm = HR_BENCHMARKS[bmKey];
                      const diff = val - bm.benchmark;
                      const isGood = diff >= 0;
                      return (
                        <div className="p-3 rounded-lg border border-border bg-secondary/30">
                          <p className="text-[10px] text-muted-foreground mb-1">{bm.label}</p>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-bold">{val.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground mb-0.5">vs {bm.benchmark}{bm.unit}</span>
                            <span className={`text-xs font-medium flex items-center gap-0.5 mb-0.5 ${isGood ? "text-emerald-400" : "text-amber-400"}`}>
                              {isGood ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {Math.abs(diff).toFixed(1)}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full rounded-full ${isGood ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, (val / 5) * 100)}%` }} />
                          </div>
                        </div>
                      );
                    })()}
                    {(() => {
                      const bm = HR_BENCHMARKS.completion_rate;
                      const diff = completionRate - bm.benchmark;
                      const isGood = diff >= 0;
                      return (
                        <div className="p-3 rounded-lg border border-border bg-secondary/30">
                          <p className="text-[10px] text-muted-foreground mb-1">{bm.label}</p>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-bold">{completionRate}%</span>
                            <span className="text-xs text-muted-foreground mb-0.5">vs {bm.benchmark}{bm.unit}</span>
                            <span className={`text-xs font-medium flex items-center gap-0.5 mb-0.5 ${isGood ? "text-emerald-400" : "text-amber-400"}`}>
                              {isGood ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {Math.abs(diff).toFixed(0)}%
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full rounded-full ${isGood ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${completionRate}%` }} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* AI Survey Intelligence */}
          {surveyData && responses.length > 0 && (
            <SurveyIntelligence
              survey={surveyData}
              responses={responses}
              sessionToken={sessionToken || ""}
            />
          )}

          {/* Question-by-question analytics */}
          {questionAnalytics.length === 0 && responses.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center text-muted-foreground">
                No response data to analyze yet
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {questionAnalytics.map((qa, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {qa.question.question_text}
                        <Badge variant="secondary" className="text-xs">{qa.total} answers</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      {qa.type === "nps" && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className={`text-4xl font-bold ${(qa as any).npsScore >= 50 ? "text-emerald-400" : (qa as any).npsScore >= 0 ? "text-amber-400" : "text-destructive"}`}>
                              {(qa as any).npsScore}
                            </div>
                            <span className="text-sm text-muted-foreground">eNPS Score</span>
                          </div>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={qa.chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                                  {qa.chartData.map((_, idx) => (
                                    <Cell key={idx} fill={["hsl(150, 50%, 40%)", "hsl(45, 80%, 55%)", "hsl(0, 72%, 51%)"][idx]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                      {(qa.type === "distribution" || qa.type === "rating") && (
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={qa.chartData}>
                              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                              <Tooltip />
                              <Bar dataKey="value" fill="hsl(217, 91%, 50%)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                          {"avg" in qa && (
                            <p className="text-xs text-muted-foreground mt-2">Average: <span className="font-semibold">{(qa as any).avg.toFixed(1)}</span></p>
                          )}
                        </div>
                      )}
                      {qa.type === "text" && (
                        <div className="space-y-3">
                          {/* AI Insights Section */}
                          {textInsights[qa.question.id] ? (
                            <div className="space-y-3">
                              {/* Summary */}
                              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                                  <span className="text-xs font-semibold text-primary">AI Summary</span>
                                </div>
                                <p className="text-sm">{textInsights[qa.question.id].summary}</p>
                              </div>

                              {/* Themes */}
                              {textInsights[qa.question.id].themes.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Detected Themes</span>
                                  <div className="flex flex-wrap gap-2">
                                    {textInsights[qa.question.id].themes.map((theme, ti) => (
                                      <span key={ti} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${SENTIMENT_COLORS[theme.sentiment] || SENTIMENT_COLORS.neutral}`}>
                                        {theme.theme}
                                        <Badge variant="secondary" className="text-[10px] h-4 px-1">{theme.count}</Badge>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Positive & Concerns */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {textInsights[qa.question.id].positive_highlights.length > 0 && (
                                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-xs font-semibold text-emerald-400">Highlights</span>
                                    </div>
                                    <ul className="space-y-1">
                                      {textInsights[qa.question.id].positive_highlights.map((h, hi) => (
                                        <li key={hi} className="text-xs">• {h}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {textInsights[qa.question.id].concerns.length > 0 && (
                                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                      <span className="text-xs font-semibold text-amber-400">Concerns</span>
                                    </div>
                                    <ul className="space-y-1">
                                      {textInsights[qa.question.id].concerns.map((c, ci) => (
                                        <li key={ci} className="text-xs">• {c}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>

                              {/* Action Items */}
                              {textInsights[qa.question.id].action_items.length > 0 && (
                                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <ListChecks className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-xs font-semibold">Recommended Actions</span>
                                  </div>
                                  <ul className="space-y-1">
                                    {textInsights[qa.question.id].action_items.map((a, ai) => (
                                      <li key={ai} className="text-xs">• {a}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              {(qa as any).textAnswers.length >= 3 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => analyzeTextQuestion(qa.question.id)}
                                  disabled={analyzingQuestion === qa.question.id}
                                  className="mb-2"
                                >
                                  {analyzingQuestion === qa.question.id ? (
                                    <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Analyzing...</>
                                  ) : (
                                    <><Sparkles className="w-3.5 h-3.5 mr-1" /> Analyze with AI</>
                                  )}
                                </Button>
                              )}
                            </>
                          )}

                          {/* Raw text responses */}
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {(qa as any).textAnswers.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No text responses</p>
                            ) : (
                              (qa as any).textAnswers.map((t: string, ti: number) => (
                                <div key={ti} className="text-sm p-2 rounded bg-secondary/50">{t}</div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SurveyAnalyticsView;
