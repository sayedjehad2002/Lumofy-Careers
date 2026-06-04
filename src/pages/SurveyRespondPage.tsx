import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle2, Loader2, ArrowRight, Send, User, Mail, Building2, Shield, Clock, ChevronRight, CheckCircle, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import lumofyLogo from "@/assets/lumofy-mark.png";
import { toast } from "sonner";
import type { Survey, SurveyQuestion, QuestionCondition } from "@/types/surveys";

const NAME_KEYWORDS = ["your name", "full name", "employee name", "respondent name", "first name", "last name"];
const DEPT_KEYWORDS = ["department", "team name", "division", "unit", "section you work"];
const EMAIL_KEYWORDS = ["email", "e-mail", "email address"];

const matchesKeywords = (text: string, keywords: string[]) =>
  keywords.some(kw => text.toLowerCase().includes(kw));

const ThemeToggleInline = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="w-8 h-8 rounded-lg bg-secondary/60 hover:bg-secondary flex items-center justify-center transition-all duration-200 hover:scale-105"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.div key="sun" initial={{ rotate: -90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: 90, scale: 0 }} transition={{ duration: 0.15 }}>
            <Sun className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        ) : (
          <motion.div key="moon" initial={{ rotate: 90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: -90, scale: 0 }} transition={{ duration: 0.15 }}>
            <Moon className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};

const SurveyRespondPage = () => {
  const { id } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState(0);

  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [respondentDepartment, setRespondentDepartment] = useState("");
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=get_published_survey&id=${id}`,
          { headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        if (!res.ok) { setError("Survey not found or no longer accepting responses."); setLoading(false); return; }
        const json = await res.json();
        if (json.survey) {
          setSurvey(json.survey);
          setQuestions(json.survey.questions || []);
        } else {
          setError("Survey not found.");
        }
      } catch {
        setError("Failed to load survey.");
      }
      setLoading(false);
    };
    if (id) fetchSurvey();
  }, [id]);

  useEffect(() => {
    if (!questions.length) return;
    setAnswers(prev => {
      const next = { ...prev };
      questions.forEach(q => {
        if (q.type === "section_divider" || q.type === "statement") return;
        const text = q.question_text || "";
        if ((q.type === "short_text" || q.type === "long_text") && matchesKeywords(text, NAME_KEYWORDS) && respondentName && !prev[q.id]) {
          next[q.id] = respondentName;
        }
        if ((q.type === "short_text" || q.type === "long_text") && matchesKeywords(text, DEPT_KEYWORDS) && respondentDepartment && !prev[q.id]) {
          next[q.id] = respondentDepartment;
        }
        if ((q.type === "short_text" || q.type === "long_text") && matchesKeywords(text, EMAIL_KEYWORDS) && respondentEmail && !prev[q.id]) {
          next[q.id] = respondentEmail;
        }
      });
      return next;
    });
  }, [respondentName, respondentEmail, respondentDepartment, questions]);

  const sections = useMemo(() => {
    const result: { title: string; helpText?: string; questions: SurveyQuestion[] }[] = [];
    let current: { title: string; helpText?: string; questions: SurveyQuestion[] } = { title: "Survey", questions: [] };

    questions.forEach((q) => {
      if (q.type === "section_divider") {
        if (current.questions.length > 0) result.push(current);
        current = { title: q.question_text || "Section", helpText: q.help_text || undefined, questions: [] };
      } else {
        current.questions.push(q);
      }
    });
    if (current.questions.length > 0) result.push(current);
    if (result.length === 0 && questions.length > 0) {
      result.push({ title: "Survey", questions: questions.filter(q => q.type !== "section_divider") });
    }
    return result;
  }, [questions]);

  const isMultiSection = sections.length > 1;

  const isQuestionVisible = useCallback((q: SurveyQuestion): boolean => {
    const conditions = q.settings?.conditions as QuestionCondition[] | undefined;
    if (!conditions || conditions.length === 0) return true;

    return conditions.every((cond) => {
      let sourceId: string | null = null;
      for (const sq of questions) {
        if (sq.id === cond.source_question_key) { sourceId = sq.id; break; }
        const sqIdx = questions.indexOf(sq);
        if (String(sqIdx) === cond.source_question_key) { sourceId = sq.id; break; }
      }
      if (!sourceId) return true;

      const answer = answers[sourceId];
      if (answer === undefined || answer === null || answer === '') return false;

      const answerStr = String(answer);
      const condValue = String(cond.value);

      switch (cond.operator) {
        case 'equals': return answerStr === condValue;
        case 'not_equals': return answerStr !== condValue;
        case 'includes': return answerStr.toLowerCase().includes(condValue.toLowerCase());
        case 'greater_than': return Number(answerStr) > Number(condValue);
        case 'less_than': return Number(answerStr) < Number(condValue);
        case 'one_of': {
          const values = Array.isArray(cond.value) ? cond.value : condValue.split(',').map(v => v.trim());
          return values.includes(answerStr);
        }
        default: return true;
      }
    });
  }, [answers, questions]);

  const setAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleMultiChoice = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || [];
      const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
      return { ...prev, [questionId]: next };
    });
  };

  const handleSubmit = async () => {
    if (!survey) return;

    const visibleQuestions = questions.filter(q => q.type !== "section_divider" && q.type !== "statement" && isQuestionVisible(q));
    const required = visibleQuestions.filter((q) => q.is_required);
    for (const q of required) {
      const ans = answers[q.id];
      if (ans === undefined || ans === null || ans === "" || (Array.isArray(ans) && ans.length === 0)) {
        toast.error(`Please answer: "${q.question_text}"`);
        return;
      }
    }

    if (!survey.is_anonymous && !respondentName.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    setSubmitting(true);
    try {
      const processedAnswers: Record<string, any> = {};
      Object.entries(answers).forEach(([qId, val]) => {
        const q = questions.find(qu => qu.id === qId);
        if (q && isQuestionVisible(q)) processedAnswers[qId] = val;
      });

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=submit_response`,
        {
          method: "POST",
          headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            survey_id: survey.id,
            respondent_name: respondentName || null,
            respondent_email: respondentEmail || null,
            respondent_department: respondentDepartment || null,
            is_anonymous: survey.is_anonymous,
            answers: processedAnswers,
          }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
      } else {
        toast.error(json.error || "Failed to submit response");
      }
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    }
    setSubmitting(false);
  };

  const allVisibleQuestions = questions.filter((q) => q.type !== "section_divider" && q.type !== "statement" && isQuestionVisible(q));
  const answeredCount = allVisibleQuestions.filter((q) => {
    const a = answers[q.id];
    return a !== undefined && a !== null && a !== "" && !(Array.isArray(a) && a.length === 0);
  }).length;
  const progress = allVisibleQuestions.length > 0 ? (answeredCount / allVisibleQuestions.length) * 100 : 0;

  const currentSectionQuestions = isMultiSection
    ? (sections[currentSection]?.questions || []).filter(q => isQuestionVisible(q))
    : questions.filter(q => q.type !== 'section_divider' && isQuestionVisible(q));

  const isAutoFilled = (q: SurveyQuestion) => {
    const text = q.question_text || "";
    if (matchesKeywords(text, NAME_KEYWORDS) && respondentName && answers[q.id] === respondentName) return true;
    if (matchesKeywords(text, DEPT_KEYWORDS) && respondentDepartment && answers[q.id] === respondentDepartment) return true;
    if (matchesKeywords(text, EMAIL_KEYWORDS) && respondentEmail && answers[q.id] === respondentEmail) return true;
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Loading survey...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="max-w-md w-full shadow-2xl border-border/50">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">⚠️</span>
              </div>
              <h1 className="text-xl font-bold mb-3">Survey Unavailable</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">{error}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          <Card className="max-w-lg w-full shadow-2xl border-border/50 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
            <CardContent className="p-12 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", damping: 15 }}
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-11 h-11 text-primary" />
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h1 className="text-2xl font-bold mb-3">Thank You!</h1>
                <p className="text-muted-foreground leading-relaxed mb-8">{survey?.thank_you_message}</p>
                <Separator className="mb-6" />
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <img src={lumofyLogo} alt="Lumofy" className="w-4 h-4 rounded bg-white/90 p-px" />
                  <span>Powered by Lumofy</span>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const renderQuestion = (q: SurveyQuestion, i: number, totalInSection: number) => {
    if (q.type === "statement") {
      return (
        <Card className="bg-secondary/20 border-primary/5">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground leading-relaxed">{q.question_text}</p>
          </CardContent>
        </Card>
      );
    }

    const autoFilled = isAutoFilled(q);

    return (
      <Card className="group border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
        <CardContent className="p-8 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-xs font-bold text-primary/60 tabular-nums">{i + 1}/{totalInSection}</span>
                <Label className="text-base leading-relaxed font-medium">
                  {q.question_text}
                  {q.is_required && <span className="text-destructive ml-1.5">*</span>}
                </Label>
              </div>
              {q.help_text && (
                <p className="text-xs text-muted-foreground leading-relaxed pl-8">{q.help_text}</p>
              )}
            </div>
            {autoFilled && (
              <Badge variant="secondary" className="text-[9px] gap-1 shrink-0">
                <CheckCircle className="w-2.5 h-2.5" /> Auto-filled
              </Badge>
            )}
          </div>

          <div className="pl-8">
            {q.type === "short_text" && (
              <Input
                value={answers[q.id] || ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder={q.placeholder || "Type your answer..."}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            )}
            {q.type === "long_text" && (
              <Textarea
                value={answers[q.id] || ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder={q.placeholder || "Type your answer..."}
                rows={5}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            )}
            {q.type === "single_choice" && (
              <RadioGroup value={answers[q.id] || ""} onValueChange={(v) => setAnswer(q.id, v)} className="space-y-2.5">
                {(q.options as string[] || []).map((opt, oi) => (
                  <motion.label
                    key={oi}
                    htmlFor={`q${q.id}-${oi}`}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-4 px-5 py-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      answers[q.id] === opt
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/40 hover:bg-secondary/30"
                    }`}
                  >
                    <RadioGroupItem value={opt} id={`q${q.id}-${oi}`} className="shrink-0" />
                    <span className="text-sm font-medium">{opt}</span>
                  </motion.label>
                ))}
              </RadioGroup>
            )}
            {q.type === "multiple_choice" && (
              <div className="space-y-2.5">
                {(q.options as string[] || []).map((opt, oi) => (
                  <motion.label
                    key={oi}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-4 px-5 py-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      (answers[q.id] || []).includes(opt)
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/40 hover:bg-secondary/30"
                    }`}
                  >
                    <Checkbox checked={(answers[q.id] || []).includes(opt)} onCheckedChange={() => toggleMultiChoice(q.id, opt)} className="shrink-0" />
                    <span className="text-sm font-medium">{opt}</span>
                  </motion.label>
                ))}
              </div>
            )}
            {q.type === "dropdown" && (
              <Select value={answers[q.id] || ""} onValueChange={(v) => setAnswer(q.id, v)}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select an option" /></SelectTrigger>
                <SelectContent>
                  {(q.options as string[] || []).map((opt, oi) => (
                    <SelectItem key={oi} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {q.type === "likert" && (
              <div className="flex flex-wrap gap-2.5">
                {(q.options as string[] || []).map((opt, oi) => (
                  <motion.button
                    key={oi}
                    onClick={() => setAnswer(q.id, opt)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-5 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                      answers[q.id] === opt
                        ? "border-primary bg-primary text-primary-foreground shadow-lg"
                        : "border-border hover:border-primary/40 hover:bg-secondary/50"
                    }`}
                  >{opt}</motion.button>
                ))}
              </div>
            )}
            {q.type === "rating" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {Array.from({ length: ((q.settings as any)?.max || 5) - ((q.settings as any)?.min || 1) + 1 }, (_, idx) => {
                    const val = ((q.settings as any)?.min || 1) + idx;
                    return (
                      <motion.button
                        key={idx}
                        onClick={() => setAnswer(q.id, String(val))}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-1.5 transition-all duration-200"
                      >
                        <Star className={`w-9 h-9 transition-all duration-200 ${Number(answers[q.id]) >= val ? "text-amber-400 fill-amber-400 drop-shadow-lg" : "text-muted-foreground/20"}`} />
                      </motion.button>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                  <span>{(q.settings as any)?.minLabel}</span>
                  <span>{(q.settings as any)?.maxLabel}</span>
                </div>
              </div>
            )}
            {q.type === "nps" && (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: 11 }, (_, idx) => (
                    <motion.button
                      key={idx}
                      onClick={() => setAnswer(q.id, String(idx))}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                        answers[q.id] === String(idx)
                          ? "border-primary bg-primary text-primary-foreground shadow-xl scale-110"
                          : idx <= 6 ? "border-destructive/20 hover:bg-destructive/5 hover:border-destructive/40"
                            : idx <= 8 ? "border-amber-500/20 hover:bg-amber-500/5 hover:border-amber-500/40"
                              : "border-primary/20 hover:bg-primary/5 hover:border-primary/40"
                      }`}
                    >{idx}</motion.button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                  <span>Not at all likely</span>
                  <span>Extremely likely</span>
                </div>
              </div>
            )}
            {q.type === "yes_no" && (
              <div className="flex gap-4">
                {["Yes", "No"].map((opt) => (
                  <motion.button
                    key={opt}
                    onClick={() => setAnswer(q.id, opt)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-1 px-8 py-4 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                      answers[q.id] === opt
                        ? "border-primary bg-primary text-primary-foreground shadow-lg"
                        : "border-border hover:border-primary/40 hover:bg-secondary/50"
                    }`}
                  >{opt}</motion.button>
                ))}
              </div>
            )}
            {q.type === "date" && (
              <Input type="date" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} className="max-w-xs h-12" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 glass border-b border-border/50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
          <img src={lumofyLogo} alt="Lumofy" className="w-7 h-7 rounded-lg bg-white/90 p-0.5 shadow-md" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{survey?.title}</p>
            <p className="text-[10px] text-muted-foreground">Lumofy People & Culture</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggleInline />
            {isMultiSection && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                Section {currentSection + 1}/{sections.length}
              </Badge>
            )}
            <div className="text-xs font-bold text-primary tabular-nums">{Math.round(progress)}%</div>
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none bg-secondary/30" />
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        {/* Header card */}
        {(!isMultiSection || currentSection === 0) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="shadow-xl border-border/50 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
              <CardContent className="p-10 text-center space-y-6">
                <div>
                  <h1 className="text-3xl font-bold mb-4 leading-tight">{survey?.title}</h1>
                  {survey?.description && (
                    <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">{survey.description}</p>
                  )}
                </div>
                <Separator />
                <div className="flex items-center justify-center gap-6">
                  {survey?.is_anonymous && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Shield className="w-4 h-4" />
                      <span className="font-medium">Anonymous</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>~{Math.max(2, Math.ceil(allVisibleQuestions.length * 0.5))} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">{allVisibleQuestions.length}</span>
                    <span>questions</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Section header */}
        {isMultiSection && (
          <motion.div key={`section-${currentSection}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{currentSection + 1}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">{sections[currentSection]?.title}</h2>
                {sections[currentSection]?.helpText && (
                  <p className="text-sm text-muted-foreground">{sections[currentSection]?.helpText}</p>
                )}
              </div>
            </div>
            <Separator className="mb-8" />
          </motion.div>
        )}

        {/* Respondent info */}
        {(!isMultiSection || currentSection === 0) && !survey?.is_anonymous && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-primary/20 shadow-lg">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-2.5">
                  <User className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Your Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={respondentName}
                      onChange={(e) => setRespondentName(e.target.value)}
                      placeholder="Enter your name"
                      className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Mail className="w-3 h-3" /> Email
                    </Label>
                    <Input
                      value={respondentEmail}
                      onChange={(e) => setRespondentEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="w-3 h-3" /> Department
                    </Label>
                    <Input
                      value={respondentDepartment}
                      onChange={(e) => setRespondentDepartment(e.target.value)}
                      placeholder="e.g., Engineering, HR"
                      className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground bg-secondary/30 px-4 py-2 rounded-lg">
                  💡 Your name and department will auto-fill matching questions below.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Questions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`section-content-${currentSection}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {currentSectionQuestions.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                {renderQuestion(q, i, currentSectionQuestions.length)}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Card className="shadow-xl border-border/50 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
            <CardContent className="p-8 space-y-6">
              {/* Progress summary */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span>{answeredCount} of {allVisibleQuestions.length} answered</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-32 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-sm font-bold text-primary tabular-nums">{Math.round(progress)}%</span>
                </div>
              </div>

              <Separator />

              {/* Navigation buttons */}
              <div className="flex items-center justify-between gap-4">
                {isMultiSection && currentSection > 0 ? (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => { setCurrentSection(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="gap-2 px-8 h-12 text-sm font-semibold border-2 hover:bg-secondary/50"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" /> Previous
                  </Button>
                ) : (
                  <div />
                )}

                {isMultiSection && currentSection < sections.length - 1 ? (
                  <Button
                    size="lg"
                    onClick={() => { setCurrentSection(s => s + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="gap-2 px-8 h-12 text-sm font-semibold shadow-lg hover:shadow-xl transition-shadow"
                  >
                    Next Section <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="gap-2 px-10 h-12 text-sm font-semibold shadow-lg hover:shadow-xl transition-shadow"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Submit Response</>
                    )}
                  </Button>
                )}
              </div>

              {/* Section indicator dots for multi-section */}
              {isMultiSection && sections.length > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  {sections.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setCurrentSection(idx); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={`transition-all duration-300 rounded-full ${
                        idx === currentSection
                          ? "w-8 h-2.5 bg-primary"
                          : idx < currentSection
                            ? "w-2.5 h-2.5 bg-primary/40 hover:bg-primary/60"
                            : "w-2.5 h-2.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
                      }`}
                      aria-label={`Go to section ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <div className="text-center pt-6 pb-12">
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <img src={lumofyLogo} alt="Lumofy" className="w-3.5 h-3.5 rounded bg-white/90 p-px" />
            <span>Powered by Lumofy</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyRespondPage;
