import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, Target, Users } from "lucide-react";
import { APPLICANT_STATUSES, type ApplicantStatus } from "@/types/careers";
import type { Applicant } from "@/types/careers";

interface PredictiveForecastProps {
  applicants: Applicant[];
}

const PredictiveForecast = ({ applicants }: PredictiveForecastProps) => {
  const forecast = useMemo(() => {
    const stages: ApplicantStatus[] = ["new", "reviewing", "shortlisted", "interview", "hired"];
    const counts: Record<string, number> = {};
    stages.forEach(s => { counts[s] = applicants.filter(a => a.status === s).length; });
    const rejected = applicants.filter(a => a.status === "rejected").length;
    const total = applicants.length;

    // Historical conversion rates (approximate from current data)
    const convRates = {
      reviewToShortlist: counts.reviewing + counts.shortlisted + counts.interview + counts.hired > 0
        ? (counts.shortlisted + counts.interview + counts.hired) / (counts.reviewing + counts.shortlisted + counts.interview + counts.hired)
        : 0.6,
      shortlistToInterview: counts.shortlisted + counts.interview + counts.hired > 0
        ? (counts.interview + counts.hired) / (counts.shortlisted + counts.interview + counts.hired)
        : 0.5,
      interviewToHire: counts.interview + counts.hired > 0
        ? counts.hired / (counts.interview + counts.hired)
        : 0.3,
    };

    // Predict hires from current pipeline
    const fromNew = counts.new * 0.7 * convRates.reviewToShortlist * convRates.shortlistToInterview * convRates.interviewToHire;
    const fromReviewing = counts.reviewing * convRates.reviewToShortlist * convRates.shortlistToInterview * convRates.interviewToHire;
    const fromShortlisted = counts.shortlisted * convRates.shortlistToInterview * convRates.interviewToHire;
    const fromInterview = counts.interview * convRates.interviewToHire;

    const predictedHires = Math.round(fromNew + fromReviewing + fromShortlisted + fromInterview);
    const currentHires = counts.hired;

    // Average days to hire (rough estimate)
    const avgDaysToHire = 21; // approximate

    // Pipeline velocity
    const activeInPipeline = counts.new + counts.reviewing + counts.shortlisted + counts.interview;
    const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

    return {
      predictedHires,
      currentHires,
      totalInPipeline: activeInPipeline,
      rejectionRate,
      convRates,
      avgDaysToHire,
      stageBreakdown: [
        { label: "From New", value: Math.round(fromNew * 10) / 10 },
        { label: "From Reviewing", value: Math.round(fromReviewing * 10) / 10 },
        { label: "From Shortlisted", value: Math.round(fromShortlisted * 10) / 10 },
        { label: "From Interview", value: Math.round(fromInterview * 10) / 10 },
      ],
    };
  }, [applicants]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Predictive Pipeline Forecast
        </CardTitle>
        <CardDescription className="text-xs">AI-estimated hires based on current funnel shape</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Main prediction */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Predicted Hires", value: forecast.predictedHires, icon: Target, color: "text-primary" },
            { label: "Current Hires", value: forecast.currentHires, icon: Users, color: "text-emerald-400" },
            { label: "In Pipeline", value: forecast.totalInPipeline, icon: TrendingUp, color: "text-violet-400" },
            { label: "Rejection Rate", value: `${forecast.rejectionRate}%`, icon: Calendar, color: "text-muted-foreground" },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-3 rounded-xl bg-muted/15 border border-border/20"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <kpi.icon className={`w-3 h-3 ${kpi.color}`} />
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">{kpi.label}</span>
              </div>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Stage contribution breakdown */}
        <div className="p-3 rounded-xl bg-muted/10 border border-border/20">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Predicted Hire Sources</span>
          <div className="mt-2 space-y-1.5">
            {forecast.stageBreakdown.map((s, i) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground w-28">{s.label}</span>
                <div className="flex-1 h-4 bg-secondary/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${forecast.predictedHires > 0 ? (s.value / forecast.predictedHires) * 100 : 0}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                    className="h-full rounded-full bg-primary/30"
                  />
                </div>
                <span className="text-[11px] font-medium min-w-[30px] text-right">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion rates */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="secondary" className="text-[9px] py-0 border-0">
            Review→Shortlist: {Math.round(forecast.convRates.reviewToShortlist * 100)}%
          </Badge>
          <Badge variant="secondary" className="text-[9px] py-0 border-0">
            Shortlist→Interview: {Math.round(forecast.convRates.shortlistToInterview * 100)}%
          </Badge>
          <Badge variant="secondary" className="text-[9px] py-0 border-0">
            Interview→Hire: {Math.round(forecast.convRates.interviewToHire * 100)}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default PredictiveForecast;
