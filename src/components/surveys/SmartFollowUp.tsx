import { useState } from "react";
import { Sparkles, Loader2, Plus, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { QuestionType } from "@/types/surveys";

interface SuggestedQuestion {
  question_text: string;
  type: QuestionType;
  reasoning: string;
  options?: string[];
}

interface Props {
  existingQuestions: { question_text: string; type: string }[];
  surveyTitle: string;
  surveyCategory: string;
  onAddQuestion: (q: { type: QuestionType; question_text: string; options: string[] }) => void;
  sessionToken: string;
}

const SmartFollowUp = ({ existingQuestions, surveyTitle, surveyCategory, onAddQuestion, sessionToken }: Props) => {
  const [suggestions, setSuggestions] = useState<SuggestedQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (existingQuestions.length === 0) {
      toast.error("Add at least one question first");
      return;
    }

    setLoading(true);
    try {
      const questionsContext = existingQuestions.map((q, i) => `Q${i + 1} (${q.type}): ${q.question_text}`).join("\n");

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-ai-improve`, {
        method: "POST",
        headers: {
          "x-session-token": sessionToken,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_text: questionsContext,
          question_type: "long_text",
          options: [],
          action: "suggest_followup",
          custom_instruction: `Based on these existing survey questions for a "${surveyCategory}" survey titled "${surveyTitle}", suggest 3-4 follow-up questions that would provide deeper insights. For each question, respond in this exact format on separate lines:

QUESTION: [question text]
TYPE: [one of: short_text, long_text, single_choice, multiple_choice, rating, likert, nps, yes_no]
OPTIONS: [comma-separated options if choice/likert type, otherwise "none"]
REASONING: [brief explanation of why this question adds value]

Focus on uncovering root causes, measuring specific dimensions, or filling gaps in the existing question set.`,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to generate suggestions");
        setLoading(false);
        return;
      }

      const json = await res.json();
      const text = json.improved_text || "";

      // Parse suggestions
      const parsed: SuggestedQuestion[] = [];
      const blocks = text.split("QUESTION:").filter(Boolean);
      blocks.forEach((block: string) => {
        const lines = block.split("\n").map((l: string) => l.trim()).filter(Boolean);
        const qText = lines[0]?.trim();
        const typeLine = lines.find((l: string) => l.startsWith("TYPE:"));
        const optionsLine = lines.find((l: string) => l.startsWith("OPTIONS:"));
        const reasoningLine = lines.find((l: string) => l.startsWith("REASONING:"));

        if (qText) {
          const type = (typeLine?.replace("TYPE:", "").trim() || "short_text") as QuestionType;
          const optionsRaw = optionsLine?.replace("OPTIONS:", "").trim() || "";
          const options = optionsRaw !== "none" ? optionsRaw.split(",").map(o => o.trim()).filter(Boolean) : [];

          parsed.push({
            question_text: qText,
            type,
            reasoning: reasoningLine?.replace("REASONING:", "").trim() || "",
            options: options.length > 0 ? options : undefined,
          });
        }
      });

      setSuggestions(parsed);
      if (parsed.length === 0) toast.info("No suggestions generated. Try adding more questions first.");
    } catch {
      toast.error("Failed to generate suggestions");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium">Smart Follow-Up Suggestions</span>
        </div>
        <Button size="sm" variant="outline" onClick={handleGenerate} disabled={loading || existingQuestions.length === 0}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
          Suggest Questions
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <Card key={i} className="border-border hover:border-primary/20 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.question_text}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="secondary" className="text-[10px]">{s.type.replace(/_/g, " ")}</Badge>
                      {s.options && s.options.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{s.options.length} options</span>
                      )}
                    </div>
                    {s.reasoning && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic">{s.reasoning}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 h-7 text-xs"
                    onClick={() => {
                      onAddQuestion({
                        type: s.type,
                        question_text: s.question_text,
                        options: s.options || [],
                      });
                      setSuggestions(suggestions.filter((_, idx) => idx !== i));
                      toast.success("Question added");
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {suggestions.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground">
          Click "Suggest Questions" to get AI-powered follow-up question recommendations based on your current survey.
        </p>
      )}
    </div>
  );
};

export default SmartFollowUp;
