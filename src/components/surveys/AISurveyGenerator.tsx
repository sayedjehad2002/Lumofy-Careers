import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ArrowLeft, ArrowRight, Wand2, Copy, RotateCcw,
  CheckCircle2, AlertCircle, Info, Loader2, FileText, MessageSquare,
  Star, BarChart3, Gauge, CircleDot, CheckSquare, ChevronDown,
  ToggleLeft, Calendar, Minus, Type, AlignLeft, Shield, Clock,
  Lightbulb, Users, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { Survey, SurveyQuestion, QuestionType, SurveyCategory, AudienceType } from "@/types/surveys";

interface AIGeneratedQuestion {
  type: QuestionType;
  question_text: string;
  help_text: string | null;
  placeholder: string | null;
  is_required: boolean;
  options: string[];
  settings: Record<string, any>;
  confidence: "high" | "medium" | "needs_review";
  ai_reasoning: string;
}

interface AIGeneratedSurvey {
  title: string;
  description: string;
  category: SurveyCategory;
  audience_type: AudienceType;
  is_anonymous: boolean;
  estimated_time_minutes: number;
  sections_count: number;
  questions: AIGeneratedQuestion[];
  ai_recommendations: string[];
}

interface Props {
  sessionToken: string;
  onCreateSurvey: (survey: Partial<Survey>, questions: Omit<SurveyQuestion, 'id' | 'survey_id' | 'created_at'>[]) => void;
  onCancel: () => void;
}

const PROCESSING_STEPS = [
  "Reading survey content...",
  "Detecting structure and purpose...",
  "Identifying question intent...",
  "Choosing optimal field types...",
  "Grouping into sections...",
  "Building survey draft...",
];

const QUESTION_ICON_MAP: Record<string, React.ElementType> = {
  short_text: Type, long_text: AlignLeft, single_choice: CircleDot,
  multiple_choice: CheckSquare, dropdown: ChevronDown, rating: Star,
  likert: BarChart3, nps: Gauge, yes_no: ToggleLeft, date: Calendar,
  section_divider: Minus, statement: Info,
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  short_text: "Short Text", long_text: "Long Text", single_choice: "Single Choice",
  multiple_choice: "Multiple Choice", dropdown: "Dropdown", rating: "Rating Scale",
  likert: "Likert Scale", nps: "NPS (0-10)", yes_no: "Yes / No", date: "Date",
  section_divider: "Section", statement: "Statement",
};

const CONFIDENCE_STYLES: Record<string, { color: string; label: string }> = {
  high: { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "High Confidence" },
  medium: { color: "text-amber-400 bg-amber-500/10 border-amber-500/20", label: "Medium Confidence" },
  needs_review: { color: "text-red-400 bg-red-500/10 border-red-500/20", label: "Needs Review" },
};

const AISurveyGenerator = ({ sessionToken, onCreateSurvey, onCancel }: Props) => {
  const [step, setStep] = useState<"input" | "processing" | "review">("input");
  const [inputText, setInputText] = useState("");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("standard");
  const [audience, setAudience] = useState("");
  const [processingStep, setProcessingStep] = useState(0);
  const [generated, setGenerated] = useState<AIGeneratedSurvey | null>(null);
  const [editedQuestions, setEditedQuestions] = useState<AIGeneratedQuestion[]>([]);

  const handleGenerate = async () => {
    if (inputText.trim().length < 10) {
      toast.error("Please provide at least 10 characters.");
      return;
    }

    setStep("processing");
    setProcessingStep(0);

    // Animate processing steps
    const interval = setInterval(() => {
      setProcessingStep((prev) => Math.min(prev + 1, PROCESSING_STEPS.length - 1));
    }, 1200);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-ai-generate`,
        {
          method: "POST",
          headers: {
            "x-session-token": sessionToken,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: inputText, tone, length, audience }),
        }
      );

      clearInterval(interval);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to generate survey" }));
        toast.error(err.error || "Failed to generate survey");
        setStep("input");
        return;
      }

      const data = await res.json();
      if (data.survey) {
        setGenerated(data.survey);
        setEditedQuestions(data.survey.questions || []);
        setProcessingStep(PROCESSING_STEPS.length - 1);
        setTimeout(() => setStep("review"), 600);
      } else {
        toast.error("No survey generated. Try rephrasing your input.");
        setStep("input");
      }
    } catch (err: any) {
      clearInterval(interval);
      toast.error(err.message || "Generation failed");
      setStep("input");
    }
  };

  const handleCreateDraft = () => {
    if (!generated) return;
    const surveyData: Partial<Survey> = {
      title: generated.title,
      description: generated.description,
      category: generated.category,
      audience_type: generated.audience_type,
      is_anonymous: generated.is_anonymous,
      status: "draft",
    };
    const questions = editedQuestions.map(({ confidence, ai_reasoning, ...q }, i) => ({
      ...q,
      order_index: i,
    }));
    onCreateSurvey(surveyData, questions);
    toast.success("Survey draft created! You can now edit it in the builder.");
  };

  const removeQuestion = (idx: number) => {
    setEditedQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleRequired = (idx: number) => {
    setEditedQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, is_required: !q.is_required } : q))
    );
  };

  const updateQuestionType = (idx: number, newType: QuestionType) => {
    setEditedQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== idx) return q;
        const updated = { ...q, type: newType };
        if ((newType === "single_choice" || newType === "multiple_choice" || newType === "dropdown") && (!q.options || q.options.length === 0)) {
          updated.options = ["Option 1", "Option 2"];
        }
        if (newType === "likert") {
          updated.options = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];
        }
        if (newType === "rating") {
          updated.settings = { min: 1, max: 5, minLabel: "Poor", maxLabel: "Excellent" };
        }
        return updated;
      })
    );
  };

  // INPUT STEP
  if (step === "input") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI Survey Architect</span>
            </div>
            <h2 className="text-2xl font-bold">Generate Survey with AI</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Paste a survey, describe your goal, or provide any content — the AI will analyze it and build a structured, publish-ready survey.
            </p>
          </div>

          {/* Main input card */}
          <Card className="border-primary/20">
            <CardContent className="p-6 space-y-5">
              <div>
                <Label className="text-sm font-medium mb-2 block">Survey Content or Description</Label>
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste a survey from another tool, describe the survey you want (e.g. 'Create an onboarding feedback survey for new hires after 30 days'), or provide a list of questions..."
                  rows={8}
                  className="resize-y text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {inputText.length} characters · Min 10 required
                </p>
              </div>

              {/* Options row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                      <SelectItem value="candidate-friendly">Candidate-Friendly</SelectItem>
                      <SelectItem value="employee-friendly">Employee-Friendly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Length</Label>
                  <Select value={length} onValueChange={setLength}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (5-8 questions)</SelectItem>
                      <SelectItem value="standard">Standard (8-15)</SelectItem>
                      <SelectItem value="detailed">Detailed (15-25)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Audience</Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Auto-detect" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Auto-detect</SelectItem>
                      <SelectItem value="employees">Employees</SelectItem>
                      <SelectItem value="candidates">Candidates</SelectItem>
                      <SelectItem value="managers">Managers</SelectItem>
                      <SelectItem value="new-joiners">New Joiners</SelectItem>
                      <SelectItem value="exiting-employees">Exiting Employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={inputText.trim().length < 10}
                className="w-full"
                size="lg"
              >
                <Wand2 className="w-4 h-4 mr-2" /> Generate Survey
              </Button>
            </CardContent>
          </Card>

          {/* Tips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Copy, title: "Paste a Survey", desc: "Copy from ChatGPT, Google Forms, or any source" },
              { icon: MessageSquare, title: "Describe It", desc: "\"Create an exit interview survey for managers\"" },
              { icon: Zap, title: "Mixed Input", desc: "Paste questions + add instructions for AI" },
            ].map((tip) => (
              <Card key={tip.title} className="border-border/50">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-secondary shrink-0">
                    <tip.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tip.title}</p>
                    <p className="text-xs text-muted-foreground">{tip.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // PROCESSING STEP
  if (step === "processing") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md space-y-8">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/30">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">AI is building your survey</h3>
            <div className="space-y-2">
              {PROCESSING_STEPS.map((s, i) => (
                <motion.div
                  key={s}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: i <= processingStep ? 1 : 0.3, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-center gap-2 text-sm"
                >
                  {i < processingStep ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : i === processingStep ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                  )}
                  <span className={i <= processingStep ? "text-foreground" : "text-muted-foreground"}>
                    {s}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // REVIEW STEP
  if (!generated) return null;

  const questionCount = editedQuestions.filter((q) => !["section_divider", "statement"].includes(q.type)).length;
  const sectionCount = editedQuestions.filter((q) => q.type === "section_divider").length;
  const needsReviewCount = editedQuestions.filter((q) => q.confidence === "needs_review").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep("input")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Input
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setStep("input"); }}>
            <RotateCcw className="w-4 h-4 mr-1" /> Regenerate
          </Button>
          <Button onClick={handleCreateDraft}>
            <Sparkles className="w-4 h-4 mr-1" /> Create Survey Draft
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Summary */}
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold mb-1">{generated.title}</h2>
                <p className="text-sm text-muted-foreground mb-4">{generated.description}</p>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="secondary" className="gap-1"><FileText className="w-3 h-3" /> {questionCount} Questions</Badge>
                  <Badge variant="secondary" className="gap-1"><Minus className="w-3 h-3" /> {sectionCount} Sections</Badge>
                  <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> ~{generated.estimated_time_minutes || 5} min</Badge>
                  <Badge variant="secondary" className="gap-1"><Users className="w-3 h-3" /> {generated.audience_type}</Badge>
                  {generated.is_anonymous && <Badge variant="secondary" className="gap-1"><Shield className="w-3 h-3" /> Anonymous</Badge>}
                  {needsReviewCount > 0 && (
                    <Badge variant="outline" className="gap-1 text-amber-400 border-amber-500/30">
                      <AlertCircle className="w-3 h-3" /> {needsReviewCount} needs review
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        {generated.ai_recommendations && generated.ai_recommendations.length > 0 && (
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" /> AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ul className="space-y-1.5">
                {generated.ai_recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span> {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Questions review */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Survey Structure</h3>
          <AnimatePresence>
            {editedQuestions.map((q, i) => {
              const Icon = QUESTION_ICON_MAP[q.type] || Info;
              const typeLabel = QUESTION_TYPE_LABELS[q.type] || q.type;
              const conf = CONFIDENCE_STYLES[q.confidence] || CONFIDENCE_STYLES.high;
              const isSectionOrStatement = ["section_divider", "statement"].includes(q.type);

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Card className={`border-border hover:border-primary/20 transition-colors ${q.type === "section_divider" ? "bg-secondary/30 border-primary/10" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2 shrink-0 mt-0.5">
                          <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                          <div className="p-1.5 rounded-md bg-secondary">
                            <Icon className="w-3.5 h-3.5 text-primary" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${isSectionOrStatement ? "font-semibold" : "font-medium"}`}>
                            {q.question_text}
                          </p>
                          {q.help_text && (
                            <p className="text-xs text-muted-foreground mt-0.5">{q.help_text}</p>
                          )}
                          {q.options && q.options.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {q.options.map((opt, oi) => (
                                <Badge key={oi} variant="outline" className="text-[10px] font-normal">{opt}</Badge>
                              ))}
                            </div>
                          )}
                          {q.ai_reasoning && (
                            <p className="text-[11px] text-muted-foreground/70 mt-1.5 italic">
                              AI: {q.ai_reasoning}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Type selector */}
                          {!isSectionOrStatement && (
                            <Select value={q.type} onValueChange={(v) => updateQuestionType(i, v as QuestionType)}>
                              <SelectTrigger className="h-7 text-[11px] w-28 border-border/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(QUESTION_TYPE_LABELS).map(([val, lab]) => (
                                  <SelectItem key={val} value={val} className="text-xs">{lab}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {/* Confidence badge */}
                          <Badge variant="outline" className={`text-[10px] ${conf.color} border`}>
                            {conf.label.split(" ")[0]}
                          </Badge>

                          {/* Required toggle */}
                          {!isSectionOrStatement && (
                            <button
                              onClick={() => toggleRequired(i)}
                              className={`text-[10px] px-1.5 py-0.5 rounded border ${q.is_required ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"}`}
                            >
                              {q.is_required ? "Required" : "Optional"}
                            </button>
                          )}

                          {/* Remove */}
                          <button onClick={() => removeQuestion(i)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                            <span className="text-xs">✕</span>
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Bottom action bar */}
        <Card className="border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {questionCount} questions · {sectionCount} sections · ~{generated.estimated_time_minutes || 5} min to complete
            </p>
            <Button onClick={handleCreateDraft} size="lg">
              <Sparkles className="w-4 h-4 mr-2" /> Create Editable Draft
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AISurveyGenerator;
