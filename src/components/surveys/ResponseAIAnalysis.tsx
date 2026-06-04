import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, AlertTriangle, Target, ThumbsUp, ThumbsDown, Minus, Loader2, Brain, Shield, Zap, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface AIAnalysis {
  sentiment: string;
  sentiment_score: number;
  engagement_level: string;
  key_themes: string[];
  strengths: string[];
  concerns: string[];
  summary: string;
  risk_flag: boolean;
  risk_reason: string | null;
  recommended_actions: string[];
  engagement_indicators?: {
    enthusiasm: string;
    detail_level: string;
    constructiveness: string;
  };
}

interface Props {
  answers: any[];
  questions: any[];
  surveyTitle: string;
  respondentName: string;
  respondentDepartment?: string;
  sessionToken: string;
  autoRun?: boolean;
}

const sentimentConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  positive: { icon: ThumbsUp, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Positive" },
  negative: { icon: ThumbsDown, color: "text-red-500", bg: "bg-red-500/10", label: "Negative" },
  neutral: { icon: Minus, color: "text-muted-foreground", bg: "bg-secondary", label: "Neutral" },
  mixed: { icon: Brain, color: "text-amber-500", bg: "bg-amber-500/10", label: "Mixed" },
};

const engagementColors: Record<string, string> = {
  high: "text-emerald-500",
  medium: "text-amber-500",
  low: "text-red-400",
};

const ResponseAIAnalysis = ({ answers, questions, surveyTitle, respondentName, respondentDepartment, sessionToken, autoRun }: Props) => {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (autoRun && !analysis && !loading) runAnalysis(); }, [autoRun]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-response-analyze`, {
        method: "POST",
        headers: {
          "x-session-token": sessionToken,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers,
          questions,
          survey_title: surveyTitle,
          respondent_name: respondentName,
          respondent_department: respondentDepartment,
        }),
      });

      if (res.status === 429) { toast.error("Rate limit exceeded, try again later."); setLoading(false); return; }
      if (res.status === 402) { toast.error("AI credits exhausted."); setLoading(false); return; }

      const json = await res.json();
      if (json.analysis) {
        setAnalysis(json.analysis);
        toast.success("Analysis complete!");
      } else {
        toast.error(json.error || "Analysis failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
    }
    setLoading(false);
  };

  if (!analysis) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4"
      >
        <Button
          onClick={runAnalysis}
          disabled={loading}
          className="w-full gap-2 h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing responses...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              AI Analysis
            </>
          )}
        </Button>
      </motion.div>
    );
  }

  const sent = sentimentConfig[analysis.sentiment] || sentimentConfig.neutral;
  const SentimentIcon = sent.icon;
  const scorePercent = ((analysis.sentiment_score || 5) / 10) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-4"
    >
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/[0.03] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">AI Analysis</span>
            <Badge className={`${sent.bg} ${sent.color} border-0 text-[10px] gap-1`}>
              <SentimentIcon className="w-3 h-3" />
              {sent.label}
            </Badge>
            {analysis.risk_flag && (
              <Badge variant="destructive" className="text-[10px] gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3" /> Risk
              </Badge>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4">
                <Separator className="opacity-50" />

                {/* Sentiment Score Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Sentiment Score</span>
                    <span className="font-bold">{analysis.sentiment_score}/10</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${scorePercent}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                      className={`h-full rounded-full ${
                        scorePercent >= 70 ? "bg-emerald-500" : scorePercent >= 40 ? "bg-amber-500" : "bg-red-400"
                      }`}
                    />
                  </div>
                </div>

                {/* Summary */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-foreground/85 leading-relaxed bg-background/60 rounded-lg p-3 border border-border/50"
                >
                  {analysis.summary}
                </motion.p>

                {/* Engagement Indicators */}
                {analysis.engagement_indicators && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Enthusiasm", value: analysis.engagement_indicators.enthusiasm, icon: Zap },
                      { label: "Detail", value: analysis.engagement_indicators.detail_level, icon: MessageSquare },
                      { label: "Constructive", value: analysis.engagement_indicators.constructiveness, icon: Shield },
                    ].map((ind, i) => (
                      <motion.div
                        key={ind.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className="text-center p-2.5 rounded-lg bg-secondary/50 border border-border/30"
                      >
                        <ind.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${engagementColors[ind.value] || "text-muted-foreground"}`} />
                        <p className="text-[10px] text-muted-foreground">{ind.label}</p>
                        <p className={`text-xs font-semibold capitalize ${engagementColors[ind.value] || "text-muted-foreground"}`}>{ind.value}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Themes */}
                {analysis.key_themes?.length > 0 && (
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Key Themes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.key_themes.map((theme, i) => (
                        <motion.div key={theme} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.06 }}>
                          <Badge variant="secondary" className="text-[10px] font-normal">{theme}</Badge>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths & Concerns side by side */}
                <div className="grid grid-cols-2 gap-3">
                  {analysis.strengths?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> Strengths
                      </p>
                      {analysis.strengths.map((s, i) => (
                        <motion.p key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.08 }}
                          className="text-xs text-foreground/80 pl-2 border-l-2 border-emerald-500/30">{s}</motion.p>
                      ))}
                    </div>
                  )}
                  {analysis.concerns?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-amber-500 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Concerns
                      </p>
                      {analysis.concerns.map((c, i) => (
                        <motion.p key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.08 }}
                          className="text-xs text-foreground/80 pl-2 border-l-2 border-amber-500/30">{c}</motion.p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Risk Flag */}
                {analysis.risk_flag && analysis.risk_reason && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                  >
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-destructive">Risk Flagged</p>
                      <p className="text-xs text-foreground/70 mt-0.5">{analysis.risk_reason}</p>
                    </div>
                  </motion.div>
                )}

                {/* Recommended Actions */}
                {analysis.recommended_actions?.length > 0 && (
                  <div>
                    <p className="text-[11px] text-primary uppercase tracking-wider flex items-center gap-1 mb-1.5">
                      <Target className="w-3 h-3" /> Recommended Actions
                    </p>
                    <div className="space-y-1">
                      {analysis.recommended_actions.map((action, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.08 }}
                          className="flex items-start gap-2 text-xs text-foreground/80">
                          <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold text-primary">{i + 1}</span>
                          {action}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Re-analyze button */}
                <Button variant="ghost" size="sm" onClick={runAnalysis} disabled={loading} className="w-full text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Re-analyze
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ResponseAIAnalysis;
