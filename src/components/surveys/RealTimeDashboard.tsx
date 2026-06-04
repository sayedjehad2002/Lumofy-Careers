import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Activity, Loader2, Users, Clock, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import type { Survey, SurveyResponse } from "@/types/surveys";

interface Props {
  surveys: Survey[];
  sessionToken: string;
}

const RealTimeDashboard = ({ surveys, sessionToken }: Props) => {
  const [surveyId, setSurveyId] = useState("");
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchResponses = async (id?: string) => {
    const sid = id || surveyId;
    if (!sid || !sessionToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=get_responses&id=${sid}`, {
        headers: { "x-session-token": sessionToken, "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      const json = await res.json();
      setResponses(json.responses || []);
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (surveyId) fetchResponses();
  }, [surveyId]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!surveyId) return;
    intervalRef.current = setInterval(() => fetchResponses(), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [surveyId, sessionToken]);

  const selectedSurvey = surveys.find(s => s.id === surveyId);
  const completed = responses.filter(r => r.status === "completed");
  const inProgress = responses.filter(r => r.status === "in_progress");
  const completionRate = responses.length > 0 ? Math.round((completed.length / responses.length) * 100) : 0;

  // Calculate avg completion time
  const completionTimes = completed
    .filter(r => r.started_at && r.completed_at)
    .map(r => (new Date(r.completed_at!).getTime() - new Date(r.started_at).getTime()) / 1000 / 60);
  const avgTime = completionTimes.length > 0 ? Math.round(completionTimes.reduce((s, v) => s + v, 0) / completionTimes.length) : 0;

  // Response timeline (last 7 days)
  const now = new Date();
  const timeline = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now);
    day.setDate(day.getDate() - (6 - i));
    const dayStr = day.toLocaleDateString("en-US", { weekday: "short" });
    const count = responses.filter(r => {
      const d = new Date(r.started_at);
      return d.toDateString() === day.toDateString();
    }).length;
    return { day: dayStr, count };
  });
  const maxTimeline = Math.max(...timeline.map(t => t.count), 1);

  // Drop-off analysis
  const dropOffRate = responses.length > 0 ? Math.round((inProgress.length / responses.length) * 100) : 0;

  // Recent activity
  const recentResponses = [...responses]
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, 10);

  const publishedSurveys = surveys.filter(s => s.status === "published");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Real-Time Dashboard
          </h3>
          <p className="text-sm text-muted-foreground">Live response tracker with completion and drop-off analysis</p>
        </div>
        {surveyId && (
          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className="text-[10px] text-muted-foreground">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => fetchResponses()} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        )}
      </div>

      <Select value={surveyId} onValueChange={setSurveyId}>
        <SelectTrigger className="w-72"><SelectValue placeholder="Select a published survey" /></SelectTrigger>
        <SelectContent>
          {publishedSurveys.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
        </SelectContent>
      </Select>

      {!surveyId ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Select a published survey to see live response data</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Live Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Total Responses", value: responses.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
              { label: "Completed", value: completed.length, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "In Progress", value: inProgress.length, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
              { label: "Completion Rate", value: `${completionRate}%`, icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10" },
              { label: "Avg Time", value: avgTime > 0 ? `${avgTime}m` : "—", icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card>
                  <CardContent className="p-3 flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                      <p className="text-lg font-bold">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Timeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Response Timeline (7 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-32">
                  {timeline.map((t, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full relative" style={{ height: "100px" }}>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${(t.count / maxTimeline) * 100}%` }}
                          className="absolute bottom-0 w-full bg-primary/20 rounded-t"
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{t.day}</span>
                      <span className="text-[10px] font-medium">{t.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Drop-off Analysis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  Drop-off Analysis
                  {dropOffRate > 30 && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Completion Rate</span>
                    <span className="font-medium">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Drop-off Rate</span>
                    <span className="font-medium">{dropOffRate}%</span>
                  </div>
                  <Progress value={dropOffRate} className="h-2" />
                </div>
                {dropOffRate > 30 && (
                  <p className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded">
                    ⚠️ High drop-off rate detected. Consider shortening the survey or making it more engaging.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Feed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentResponses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No responses yet</p>
              ) : (
                <div className="space-y-2">
                  {recentResponses.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${r.status === "completed" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm">
                          {r.is_anonymous ? "Anonymous" : r.respondent_name || r.respondent_email || "Unknown"}
                        </span>
                        {r.respondent_department && (
                          <Badge variant="outline" className="text-[10px] ml-2">{r.respondent_department}</Badge>
                        )}
                      </div>
                      <Badge variant={r.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                        {r.status === "completed" ? "Completed" : "In Progress"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(r.started_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RealTimeDashboard;
