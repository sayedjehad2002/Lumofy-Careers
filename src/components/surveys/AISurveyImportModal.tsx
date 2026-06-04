import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Wand2, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Survey, SurveyQuestion, QuestionType } from "@/types/surveys";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreateSurvey: (survey: Partial<Survey>, questions: Omit<SurveyQuestion, "id" | "survey_id" | "created_at">[]) => void;
  sessionToken: string;
}

const STEPS = [
  "Reading content...",
  "Detecting structure...",
  "Choosing question types...",
  "Building draft...",
];

const AISurveyImportModal = ({ open, onClose, onCreateSurvey, sessionToken }: Props) => {
  const [input, setInput] = useState("");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("standard");
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);

  const handleGenerate = async () => {
    if (input.trim().length < 10) { toast.error("Please enter at least 10 characters"); return; }

    setGenerating(true);
    setStep(0);
    const interval = setInterval(() => setStep((p) => Math.min(p + 1, STEPS.length - 1)), 1500);

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-ai-generate`, {
        method: "POST",
        headers: {
          "x-session-token": sessionToken,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input, tone, length, audience: "" }),
      });

      clearInterval(interval);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        toast.error(err.error || "Generation failed");
        setGenerating(false);
        return;
      }

      const data = await res.json();
      if (data.survey) {
        const { title, description, category, audience_type, questions } = data.survey;
        const surveyData: Partial<Survey> = { title, description, category, audience_type, is_anonymous: false, status: "draft" };
        const cleanQ = (questions || []).map(({ confidence, ai_reasoning, ...q }: any, i: number) => ({
          ...q, order_index: i,
        }));
        onCreateSurvey(surveyData, cleanQ);
        setInput("");
        toast.success("Survey draft created!");
      } else {
        toast.error("No survey generated. Try different input.");
      }
    } catch (err: any) {
      clearInterval(interval);
      toast.error(err.message || "Generation failed");
    }
    setGenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !generating && !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Quick Import with AI
          </DialogTitle>
        </DialogHeader>

        {generating ? (
          <div className="py-8 text-center space-y-6">
            <div className="relative mx-auto w-14 h-14">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/30">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: i <= step ? 1 : 0.3 }}
                  className="flex items-center justify-center gap-2 text-sm"
                >
                  {i < step ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> :
                   i === step ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" /> :
                   <div className="w-3.5 h-3.5 rounded-full border border-border" />}
                  <span>{s}</span>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Paste a survey, describe what you need, or provide a list of questions
              </Label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='e.g. "Create an onboarding feedback survey for new hires after 30 days" or paste questions from another tool...'
                rows={6}
                className="text-sm resize-y"
              />
              <p className="text-[10px] text-muted-foreground mt-1">{input.length} chars · Min 10</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="candidate-friendly">Candidate-Friendly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Length</Label>
                <Select value={length} onValueChange={setLength}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (5-8)</SelectItem>
                    <SelectItem value="standard">Standard (8-15)</SelectItem>
                    <SelectItem value="detailed">Detailed (15-25)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={input.trim().length < 10} className="w-full">
              <Wand2 className="w-4 h-4 mr-2" /> Generate Survey
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AISurveyImportModal;
