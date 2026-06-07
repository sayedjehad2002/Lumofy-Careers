import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, Loader2, Brain, CheckCircle2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Applicant, Job } from "@/types/careers";
import { TONE_TEXT, TONE_SUBTLE } from "@/components/careers/statusColors";

interface InterviewPrepProps {
  applicant: Applicant;
  job: Job | undefined;
}

interface PrepKit {
  questions: { question: string; category: string; focus: string }[];
  scorecard: { criterion: string; weight: string; lookFor: string }[];
  redFlags: string[];
  talkingPoints: string[];
}

const InterviewPrep = ({ applicant, job }: InterviewPrepProps) => {
  const [kit, setKit] = useState<PrepKit | null>(null);
  const [loading, setLoading] = useState(false);

  const generateKit = useCallback(async () => {
    setLoading(true);
    try {
      // Generate from AI analysis + job requirements
      const ai = applicant.aiAnalysis;
      const gaps = ai?.gaps || [];
      const strengths = ai?.strengths || [];
      const missingSkills = ai?.missingSkills || [];
      const requirements = job?.requirements || [];

      // Generate locally from available data
      const questions: PrepKit["questions"] = [];

      // Gap-based questions
      gaps.slice(0, 3).forEach(gap => {
        questions.push({
          question: `Tell me about your experience with ${gap}. Can you describe a specific project where you demonstrated this?`,
          category: "Gap Probe",
          focus: gap,
        });
      });

      // Missing skills questions
      missingSkills.slice(0, 2).forEach(skill => {
        questions.push({
          question: `This role requires ${skill}. How would you approach ramping up in this area?`,
          category: "Skills Assessment",
          focus: skill,
        });
      });

      // Strength validation
      strengths.slice(0, 2).forEach(s => {
        questions.push({
          question: `Your background in ${s} is strong. Can you describe your most impactful achievement in this area?`,
          category: "Strength Validation",
          focus: s,
        });
      });

      // Behavioral
      questions.push({
        question: "Describe a time when you had to adapt quickly to a significant change at work. What was the outcome?",
        category: "Behavioral",
        focus: "Adaptability",
      });

      // Add AI-suggested interview questions
      if (ai?.interviewQuestions) {
        ai.interviewQuestions.slice(0, 3).forEach(q => {
          questions.push({ question: q, category: "AI Suggested", focus: "Role Fit" });
        });
      }

      const scorecard: PrepKit["scorecard"] = [
        { criterion: "Technical Skills", weight: "30%", lookFor: `Proficiency in ${(ai?.detectedSkills || []).slice(0, 3).join(", ") || "required stack"}` },
        { criterion: "Problem Solving", weight: "25%", lookFor: "Structured thinking, creative solutions, data-driven approach" },
        { criterion: "Role Fit", weight: "20%", lookFor: `Alignment with ${job?.title || "role"} requirements` },
        { criterion: "Culture Fit", weight: "15%", lookFor: ai?.organizationalFit || "Values alignment, collaboration style" },
        { criterion: "Growth Potential", weight: "10%", lookFor: ai?.growthPotential || "Learning agility, career trajectory" },
      ];

      const redFlags = ai?.redFlags || ai?.riskIndicators || [];
      const talkingPoints = [
        ...(ai?.recommendation ? [`AI Recommendation: ${ai.recommendation}`] : []),
        ...(ai?.fitLevel ? [`Fit Level: ${ai.fitLevel} (${ai.fitScore}/100)`] : []),
        ...(ai?.experienceVerification ? [`Experience: ${ai.experienceVerification.totalYears}, Seniority: ${ai.experienceVerification.seniorityAlignment}`] : []),
      ];

      setKit({ questions, scorecard, redFlags, talkingPoints });
      toast.success("Interview prep kit generated");
    } catch {
      toast.error("Failed to generate prep kit");
    } finally {
      setLoading(false);
    }
  }, [applicant, job]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TONE_SUBTLE.success}`}>
                <ClipboardList className={`w-4 h-4 ${TONE_TEXT.success}`} aria-hidden="true" />
              </div>
              AI Interview Prep Kit
            </CardTitle>
            <CardDescription className="ml-[42px]">
              Tailored questions &amp; scorecard based on {applicant.fullName}'s CV gaps
            </CardDescription>
          </div>
          {!kit && (
            <Button size="sm" onClick={generateKit} disabled={loading} className="text-xs h-9">
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Brain className="w-3.5 h-3.5 mr-1.5" />}
              Generate Kit
            </Button>
          )}
        </div>
      </CardHeader>

      {kit && (
        <CardContent>
          <div className="space-y-4">
            {/* Talking points */}
            {kit.talkingPoints.length > 0 && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                <span className="text-[10px] text-primary uppercase tracking-widest font-medium">Briefing Notes</span>
                {kit.talkingPoints.map((t, i) => (
                  <p key={i} className="text-xs text-foreground/80 mt-1">• {t}</p>
                ))}
              </div>
            )}

            {/* Questions */}
            <div>
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                Interview Questions ({kit.questions.length})
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                  onClick={() => copyToClipboard(kit.questions.map(q => `[${q.category}] ${q.question}`).join("\n\n"))}>
                  <Copy className="w-3 h-3 mr-1" /> Copy All
                </Button>
              </h4>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {kit.questions.map((q, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-3 rounded-xl bg-muted/20 border border-border/20"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[9px] py-0 border-0 bg-muted/50">{q.category}</Badge>
                        <span className="text-[9px] text-muted-foreground">Focus: {q.focus}</span>
                      </div>
                      <p className="text-xs">{q.question}</p>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Scorecard */}
            <div>
              <h4 className="text-xs font-semibold mb-2">Evaluation Scorecard</h4>
              <div className="space-y-1.5">
                {kit.scorecard.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/15 text-xs">
                    <span className="font-medium w-32">{s.criterion}</span>
                    <Badge variant="outline" className="text-[9px] py-0">{s.weight}</Badge>
                    <span className="text-muted-foreground flex-1 truncate">{s.lookFor}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Red flags */}
            {kit.redFlags.length > 0 && (
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                <span className="text-[10px] text-destructive uppercase tracking-widest font-medium">Watch For</span>
                {kit.redFlags.map((f, i) => (
                  <p key={i} className="text-xs text-destructive/80 mt-1">⚠ {f}</p>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default InterviewPrep;
