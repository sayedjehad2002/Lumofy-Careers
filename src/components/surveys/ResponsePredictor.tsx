import { useMemo } from "react";
import { Brain, Clock, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Props {
  questionCount: number;
  questionTypes: string[];
  isAnonymous: boolean;
  hasDeadline: boolean;
  audienceType: string;
}

// Prediction model based on survey research data
function predictCompletionRate(props: Props): { rate: number; confidence: string; factors: { label: string; impact: string; direction: "up" | "down" | "neutral" }[] } {
  let baseRate = 65; // Industry average
  const factors: { label: string; impact: string; direction: "up" | "down" | "neutral" }[] = [];

  // Question count impact
  if (props.questionCount <= 5) {
    baseRate += 15;
    factors.push({ label: "Short survey (≤5 Qs)", impact: "+15%", direction: "up" });
  } else if (props.questionCount <= 10) {
    baseRate += 5;
    factors.push({ label: "Medium length (6-10 Qs)", impact: "+5%", direction: "up" });
  } else if (props.questionCount <= 15) {
    baseRate -= 5;
    factors.push({ label: "Long survey (11-15 Qs)", impact: "-5%", direction: "down" });
  } else {
    baseRate -= 15;
    factors.push({ label: "Very long survey (>15 Qs)", impact: "-15%", direction: "down" });
  }

  // Anonymous boost
  if (props.isAnonymous) {
    baseRate += 8;
    factors.push({ label: "Anonymous responses", impact: "+8%", direction: "up" });
  }

  // Deadline pressure
  if (props.hasDeadline) {
    baseRate += 5;
    factors.push({ label: "Has deadline", impact: "+5%", direction: "up" });
  }

  // Open text penalty
  const textCount = props.questionTypes.filter(t => ["long_text", "short_text"].includes(t)).length;
  if (textCount > 3) {
    baseRate -= 8;
    factors.push({ label: `${textCount} open-text questions`, impact: "-8%", direction: "down" });
  } else if (textCount > 0) {
    factors.push({ label: `${textCount} open-text questions`, impact: "neutral", direction: "neutral" });
  }

  // NPS/Rating boosts (easy to answer)
  const easyCount = props.questionTypes.filter(t => ["rating", "nps", "yes_no"].includes(t)).length;
  if (easyCount > props.questionCount * 0.5) {
    baseRate += 5;
    factors.push({ label: "Mostly quick-answer types", impact: "+5%", direction: "up" });
  }

  // Internal audience boost
  if (props.audienceType === "internal") {
    baseRate += 5;
    factors.push({ label: "Internal audience", impact: "+5%", direction: "up" });
  }

  const rate = Math.max(15, Math.min(95, Math.round(baseRate)));
  const confidence = props.questionCount > 0 ? "medium" : "low";

  // Estimated time
  const estMinutes = Math.max(1, Math.round(props.questionCount * 0.7 + textCount * 0.8));

  return { rate, confidence, factors };
}

function estimateTime(questionCount: number, questionTypes: string[]): number {
  const textCount = questionTypes.filter(t => ["long_text", "short_text"].includes(t)).length;
  return Math.max(1, Math.round((questionCount - textCount) * 0.5 + textCount * 1.5));
}

const ResponsePredictor = ({ questionCount, questionTypes, isAnonymous, hasDeadline, audienceType }: Props) => {
  const prediction = useMemo(
    () => predictCompletionRate({ questionCount, questionTypes, isAnonymous, hasDeadline, audienceType }),
    [questionCount, questionTypes, isAnonymous, hasDeadline, audienceType]
  );
  const estTime = estimateTime(questionCount, questionTypes);

  if (questionCount === 0) {
    return (
      <Card className="border-border bg-secondary/20">
        <CardContent className="p-3 text-center text-xs text-muted-foreground">
          <Brain className="w-5 h-5 mx-auto mb-1 opacity-40" />
          Add questions to see completion predictions
        </CardContent>
      </Card>
    );
  }

  const rateColor = prediction.rate >= 70 ? "text-emerald-400" : prediction.rate >= 50 ? "text-amber-400" : "text-destructive";

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">AI Response Predictor</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className={`text-2xl font-bold ${rateColor}`}>{prediction.rate}%</p>
            <p className="text-[10px] text-muted-foreground">Expected completion</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{estTime}m</p>
            <p className="text-[10px] text-muted-foreground">Est. time</p>
          </div>
        </div>

        <Progress value={prediction.rate} className="h-1.5" />

        <div className="space-y-1">
          {prediction.factors.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              {f.direction === "up" ? (
                <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : f.direction === "down" ? (
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
              <span className="text-muted-foreground">{f.label}</span>
              <span className={`font-medium ${f.direction === "up" ? "text-emerald-400" : f.direction === "down" ? "text-amber-400" : "text-muted-foreground"}`}>
                {f.impact}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ResponsePredictor;
