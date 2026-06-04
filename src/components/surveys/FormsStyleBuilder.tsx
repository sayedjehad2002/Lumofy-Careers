import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Eye, Save, Settings, Share2, BarChart3,
  Plus, Trash2, Copy, GripVertical, ChevronUp, ChevronDown,
  Type, AlignLeft, CircleDot, CheckSquare, Star, Gauge,
  ToggleLeft, Calendar, Minus, List, Sparkles, MoreHorizontal,
  Check, Wand2, Loader2, Globe, Clock, Lightbulb, Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import SurveyPreview from "./SurveyPreview";
import SurveyScheduler from "./SurveyScheduler";
import MultiLanguage from "./MultiLanguage";
import SmartFollowUp from "./SmartFollowUp";
import ResponsePredictor from "./ResponsePredictor";
import type { Survey, SurveyQuestion, QuestionType, SurveyCategory, AudienceType } from "@/types/surveys";
import { SURVEY_CATEGORIES, AUDIENCE_TYPES } from "@/types/surveys";

type DraftQuestion = Omit<SurveyQuestion, "id" | "survey_id" | "created_at"> & { _key: string };

interface Props {
  survey: Survey | null;
  onSave: (survey: Partial<Survey>, questions: Omit<SurveyQuestion, "id" | "survey_id" | "created_at">[]) => void;
  onBack: () => void;
  sessionToken: string;
}

const QUESTION_TYPES: { value: QuestionType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "single_choice", label: "Choice", icon: CircleDot, desc: "Single or multiple choice" },
  { value: "short_text", label: "Text", icon: Type, desc: "Short or long answer" },
  { value: "rating", label: "Rating", icon: Star, desc: "Numeric scale" },
  { value: "likert", label: "Likert", icon: List, desc: "Agreement scale" },
  { value: "nps", label: "NPS", icon: Gauge, desc: "Net Promoter Score" },
  { value: "yes_no", label: "Yes / No", icon: ToggleLeft, desc: "Binary question" },
  { value: "date", label: "Date", icon: Calendar, desc: "Date input" },
  { value: "section_divider", label: "Section", icon: Minus, desc: "Divider block" },
];

const FormsStyleBuilder = ({ survey, onSave, onBack, sessionToken }: Props) => {
  const [title, setTitle] = useState(survey?.title || "");
  const [description, setDescription] = useState(survey?.description || "");
  const [category, setCategory] = useState<SurveyCategory>(survey?.category || "custom");
  const [audienceType, setAudienceType] = useState<AudienceType>(survey?.audience_type || "internal");
  const [isAnonymous, setIsAnonymous] = useState(survey ? !!survey.is_anonymous : false);
  const [allowMultiple, setAllowMultiple] = useState(survey?.allow_multiple_responses || false);
  const [deadline, setDeadline] = useState(survey?.response_deadline?.split("T")[0] || "");
  const [thankYou, setThankYou] = useState(survey?.thank_you_message || "Thank you for completing this survey!");
  const [maxResponses, setMaxResponses] = useState(survey?.max_responses?.toString() || "");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [questionPickerIdx, setQuestionPickerIdx] = useState<number | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(3);
  const [translations, setTranslations] = useState<any[]>([]);

  const [questions, setQuestions] = useState<DraftQuestion[]>(() => {
    if (survey?.questions && survey.questions.length > 0) {
      return survey.questions.map((q) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
        settings: q.settings || {},
        _key: crypto.randomUUID(),
      }));
    }
    return [];
  });

  const addQuestion = (type: QuestionType, insertIdx?: number) => {
    const defaults: Partial<DraftQuestion> = {};
    if (type === "single_choice") defaults.options = ["Option 1", "Option 2"];
    if (type === "likert") defaults.options = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];
    if (type === "rating") defaults.settings = { min: 1, max: 5, minLabel: "Poor", maxLabel: "Excellent" };

    const newQ: DraftQuestion = {
      _key: crypto.randomUUID(),
      type,
      question_text: "",
      help_text: null,
      placeholder: null,
      is_required: false,
      options: [],
      order_index: 0,
      settings: {},
      ...defaults,
    };

    if (insertIdx !== undefined && insertIdx !== null) {
      const next = [...questions];
      next.splice(insertIdx + 1, 0, newQ);
      setQuestions(next);
    } else {
      setQuestions([...questions, newQ]);
    }
    setQuestionPickerIdx(null);
  };

  const updateQuestion = (key: string, updates: Partial<DraftQuestion>) => {
    setQuestions(questions.map((q) => (q._key === key ? { ...q, ...updates } : q)));
  };

  const removeQuestion = (key: string) => setQuestions(questions.filter((q) => q._key !== key));

  const duplicateQuestion = (key: string) => {
    const idx = questions.findIndex((q) => q._key === key);
    if (idx >= 0) {
      const clone = { ...questions[idx], _key: crypto.randomUUID() };
      const next = [...questions];
      next.splice(idx + 1, 0, clone);
      setQuestions(next);
    }
  };

  const moveQuestion = (key: string, dir: -1 | 1) => {
    const idx = questions.findIndex((q) => q._key === key);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const next = [...questions];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setQuestions(next);
  };

  const handleSave = (status?: string) => {
    if (!title.trim()) { toast.error("Survey title is required"); return; }
    const surveyData: Partial<Survey> = {
      ...(survey?.id ? { id: survey.id } : {}),
      title, description, category,
      audience_type: audienceType,
      is_anonymous: isAnonymous,
      allow_multiple_responses: allowMultiple,
      response_deadline: deadline ? new Date(deadline).toISOString() : null,
      thank_you_message: thankYou,
      status: (status || survey?.status || "draft") as any,
      max_responses: maxResponses ? parseInt(maxResponses) : null,
    };
    const cleanQ = questions.map(({ _key, ...q }, i) => ({ ...q, order_index: i }));
    onSave(surveyData, cleanQ);
  };

  const surveyId = survey?.id;

  if (previewOpen) {
    return (
      <SurveyPreview
        survey={{ title, description, is_anonymous: isAnonymous, thank_you_message: thankYou } as Survey}
        questions={questions}
        onClose={() => setPreviewOpen(false)}
      />
    );
  }

  return (
    <div className="space-y-0">
      {/* Top bar */}
      <div className="flex items-center justify-between py-3 mb-6 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate max-w-[200px]">{title || "Untitled Survey"}</span>
            <Badge variant="outline" className="text-[10px]">Draft</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings className="w-4 h-4 mr-1" /> Settings
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye className="w-4 h-4 mr-1" /> Preview
          </Button>
          {surveyId && (
            <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="w-4 h-4 mr-1" /> Share
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => handleSave("draft")}>
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
          <Button size="sm" onClick={() => handleSave("published")} disabled={!title.trim() || questions.length === 0}>
            Publish
          </Button>
        </div>
      </div>

      {/* Center canvas */}
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Title card */}
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardContent className="p-6">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Survey"
              className="w-full text-2xl font-bold bg-transparent border-0 outline-none placeholder:text-muted-foreground/40 mb-2"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description (optional)"
              className="w-full text-sm bg-transparent border-0 outline-none text-muted-foreground placeholder:text-muted-foreground/30"
            />
          </CardContent>
        </Card>

        {/* Questions */}
        <AnimatePresence>
          {questions.map((q, i) => (
            <motion.div
              key={q._key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <QuestionCard
                question={q}
                index={i}
                onUpdate={(updates) => updateQuestion(q._key, updates)}
                onRemove={() => removeQuestion(q._key)}
                onDuplicate={() => duplicateQuestion(q._key)}
                onMoveUp={() => moveQuestion(q._key, -1)}
                onMoveDown={() => moveQuestion(q._key, 1)}
                isFirst={i === 0}
                isLast={i === questions.length - 1}
                sessionToken={sessionToken}
              />

              {/* Insert question button between cards */}
              <div className="flex justify-center py-1 relative">
                <button
                  onClick={() => setQuestionPickerIdx(i)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-1 rounded-full hover:bg-secondary"
                >
                  <Plus className="w-3 h-3" /> Add question
                </button>
                {questionPickerIdx === i && (
                  <QuestionTypePicker
                    onSelect={(type) => addQuestion(type, i)}
                    onClose={() => setQuestionPickerIdx(null)}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add first / more questions */}
        <div className="flex justify-center py-2 relative">
          <button
            onClick={() => setQuestionPickerIdx(-1)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 text-sm text-muted-foreground hover:text-primary transition-all hover:bg-secondary/50"
          >
            <Plus className="w-4 h-4" /> Add new question
          </button>
          {questionPickerIdx === -1 && (
            <QuestionTypePicker
              onSelect={(type) => addQuestion(type)}
              onClose={() => setQuestionPickerIdx(null)}
            />
          )}
        </div>

        {/* AI Tools Sidebar */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <ResponsePredictor
            questionCount={questions.length}
            questionTypes={questions.map(q => q.type)}
            isAnonymous={isAnonymous}
            hasDeadline={!!deadline}
            audienceType={audienceType}
          />
          <SmartFollowUp
            existingQuestions={questions.map(q => ({ question_text: q.question_text, type: q.type }))}
            surveyTitle={title}
            surveyCategory={category}
            onAddQuestion={(q) => {
              const newQ: DraftQuestion = {
                _key: crypto.randomUUID(),
                type: q.type,
                question_text: q.question_text,
                help_text: null,
                placeholder: null,
                is_required: false,
                options: q.options || [],
                order_index: questions.length,
                settings: q.type === "rating" ? { min: 1, max: 5, minLabel: "Poor", maxLabel: "Excellent" } : {},
              };
              setQuestions([...questions, newQ]);
            }}
            sessionToken={sessionToken}
          />
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Survey Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as SurveyCategory)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SURVEY_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Audience</Label>
              <Select value={audienceType} onValueChange={(v) => setAudienceType(v as AudienceType)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCE_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Response Deadline</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Max Responses</Label>
              <Input type="number" value={maxResponses} onChange={(e) => setMaxResponses(e.target.value)} placeholder="Unlimited" className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Thank You Message</Label>
              <Textarea value={thankYou} onChange={(e) => setThankYou(e.target.value)} className="mt-1" rows={2} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Anonymous Responses</Label>
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Allow Multiple Responses</Label>
              <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} />
            </div>

            {/* Scheduling */}
            <div className="border-t border-border pt-4">
              <SurveyScheduler
                scheduledAt={scheduledAt}
                onScheduleChange={setScheduledAt}
                reminderEnabled={reminderEnabled}
                onReminderChange={setReminderEnabled}
                reminderDays={reminderDays}
                onReminderDaysChange={setReminderDays}
              />
            </div>

            {/* Multi-Language */}
            <div className="border-t border-border pt-4">
              <MultiLanguage
                title={title}
                description={description}
                questions={questions.map(q => ({ question_text: q.question_text }))}
                translations={translations}
                onTranslationsChange={setTranslations}
                sessionToken={sessionToken}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share Survey</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Copy the link below to share this survey.</p>
            <div className="flex gap-2">
              <Input readOnly value={`${window.location.origin}/survey/${surveyId}/respond`} className="text-xs h-9" />
              <Button size="sm" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/survey/${surveyId}/respond`);
                toast.success("Link copied!");
              }}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Question Type Picker ─── */
const QuestionTypePicker = ({ onSelect, onClose }: { onSelect: (type: QuestionType) => void; onClose: () => void }) => {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl p-2 min-w-[280px]"
      >
        <div className="grid grid-cols-2 gap-1">
          {QUESTION_TYPES.map((qt) => (
            <button
              key={qt.value}
              onClick={() => onSelect(qt.value)}
              className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <div className="p-1.5 rounded-md bg-primary/10">
                <qt.icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium">{qt.label}</p>
                <p className="text-[10px] text-muted-foreground">{qt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
};

/* ─── Question Card ─── */
interface QuestionCardProps {
  question: DraftQuestion;
  index: number;
  onUpdate: (updates: Partial<DraftQuestion>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  sessionToken: string;
}

const AI_ACTIONS = [
  { value: "improve", label: "Improve wording" },
  { value: "simplify", label: "Simplify" },
  { value: "formal", label: "Make formal" },
  { value: "friendly", label: "Employee-friendly" },
  { value: "candidate", label: "Candidate-friendly" },
];

const QuestionCard = ({ question, index, onUpdate, onRemove, onDuplicate, onMoveUp, onMoveDown, isFirst, isLast, sessionToken }: QuestionCardProps) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);

  const handleAIImprove = async (action: string) => {
    if (!question.question_text.trim()) return;
    setAiMenuOpen(false);
    setAiLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-ai-improve`, {
        method: "POST",
        headers: {
          "x-session-token": sessionToken,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_text: question.question_text,
          question_type: question.type,
          options: question.options,
          action,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        toast.error(err.error || "AI improvement failed");
        setAiLoading(false);
        return;
      }
      const data = await res.json();
      const updates: Partial<DraftQuestion> = {};
      if (data.improved_text) updates.question_text = data.improved_text;
      if (data.improved_options && Array.isArray(data.improved_options) && data.improved_options.length > 0) {
        updates.options = data.improved_options;
      }
      onUpdate(updates);
      if (data.change_summary) toast.success(data.change_summary);
    } catch {
      toast.error("AI improvement failed");
    }
    setAiLoading(false);
  };
  const isSection = question.type === "section_divider";
  const isStatement = question.type === "statement";

  const addOption = () => {
    onUpdate({ options: [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`] });
  };

  const updateOption = (idx: number, value: string) => {
    const opts = [...(question.options || [])];
    opts[idx] = value;
    onUpdate({ options: opts });
  };

  const removeOption = (idx: number) => {
    onUpdate({ options: (question.options || []).filter((_, i) => i !== idx) });
  };

  if (isSection) {
    return (
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="p-5">
          <input
            value={question.question_text}
            onChange={(e) => onUpdate({ question_text: e.target.value })}
            placeholder="Section title"
            className="w-full text-base font-semibold bg-transparent border-0 outline-none placeholder:text-muted-foreground/40 mb-1"
          />
          <input
            value={question.help_text || ""}
            onChange={(e) => onUpdate({ help_text: e.target.value || null })}
            placeholder="Section description (optional)"
            className="w-full text-xs bg-transparent border-0 outline-none text-muted-foreground placeholder:text-muted-foreground/30"
          />
          <div className="flex items-center gap-1 mt-3">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} disabled={isFirst}><ChevronUp className="w-3 h-3" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} disabled={isLast}><ChevronDown className="w-3 h-3" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}><Trash2 className="w-3 h-3 text-destructive" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border hover:border-primary/15 transition-colors">
      <CardContent className="p-5">
        {/* Question header */}
        <div className="flex items-start gap-3">
          <span className="text-xs text-muted-foreground mt-2 w-5 text-right shrink-0">{index + 1}</span>
          <div className="flex-1 space-y-3">
            <input
              value={question.question_text}
              onChange={(e) => onUpdate({ question_text: e.target.value })}
              placeholder="Type your question"
              className="w-full text-sm font-medium bg-transparent border-0 outline-none placeholder:text-muted-foreground/40"
            />

            {/* Options for choice/likert */}
            {(question.type === "single_choice" || question.type === "multiple_choice" || question.type === "dropdown" || question.type === "likert") && (
              <div className="space-y-1.5 pl-1">
                {(question.options || []).map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2 group">
                    <div className={`w-4 h-4 rounded-${question.type === "single_choice" ? "full" : "sm"} border border-border shrink-0`} />
                    <input
                      value={opt}
                      onChange={(e) => updateOption(oi, e.target.value)}
                      className="flex-1 text-sm bg-transparent border-0 border-b border-transparent focus:border-border outline-none py-0.5"
                    />
                    <button onClick={() => removeOption(oi)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button onClick={addOption} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-1">
                  <Plus className="w-3 h-3" /> Add option
                </button>
              </div>
            )}

            {/* Rating preview */}
            {question.type === "rating" && (
              <div className="flex items-center gap-1 pl-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className="w-5 h-5 text-muted-foreground/30" />
                ))}
              </div>
            )}

            {/* NPS preview */}
            {question.type === "nps" && (
              <div className="flex items-center gap-0.5 pl-1">
                {Array.from({ length: 11 }, (_, i) => (
                  <div key={i} className="w-7 h-7 rounded border border-border flex items-center justify-center text-[10px] text-muted-foreground">
                    {i}
                  </div>
                ))}
              </div>
            )}

            {/* Yes/No preview */}
            {question.type === "yes_no" && (
              <div className="flex gap-2 pl-1">
                <div className="px-4 py-1.5 rounded-md border border-border text-xs text-muted-foreground">Yes</div>
                <div className="px-4 py-1.5 rounded-md border border-border text-xs text-muted-foreground">No</div>
              </div>
            )}

            {/* Text preview */}
            {(question.type === "short_text" || question.type === "long_text") && (
              <div className="pl-1">
                <div className={`border-b border-border/50 ${question.type === "long_text" ? "h-16" : "h-8"} text-xs text-muted-foreground/40 flex items-end pb-1`}>
                  {question.type === "long_text" ? "Long answer text" : "Short answer text"}
                </div>
              </div>
            )}

            {/* Date preview */}
            {question.type === "date" && (
              <div className="pl-1">
                <div className="border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground/40 w-40">
                  MM / DD / YYYY
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            {/* AI Improve button */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] gap-1 text-primary/70 hover:text-primary hover:bg-primary/10"
                onClick={() => question.question_text.trim() ? setAiMenuOpen(!aiMenuOpen) : null}
                disabled={aiLoading || !question.question_text.trim()}
              >
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                AI
              </Button>
              {aiMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAiMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute bottom-full mb-1 left-0 z-50 bg-card border border-border rounded-lg shadow-xl p-1 min-w-[160px]"
                  >
                    {AI_ACTIONS.map((a) => (
                      <button
                        key={a.value}
                        onClick={() => handleAIImprove(a.value)}
                        className="w-full text-left text-xs px-3 py-1.5 rounded hover:bg-secondary transition-colors"
                      >
                        {a.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </div>
            <div className="h-4 w-px bg-border" />
            <Select value={question.type} onValueChange={(v) => {
              const updates: Partial<DraftQuestion> = { type: v as QuestionType };
              if (v === "single_choice" && (!question.options || question.options.length === 0)) updates.options = ["Option 1", "Option 2"];
              if (v === "likert") updates.options = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];
              if (v === "rating") updates.settings = { min: 1, max: 5 };
              onUpdate(updates);
            }}>
              <SelectTrigger className="h-7 text-[11px] w-28 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.filter(t => t.value !== "section_divider").map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                ))}
                <SelectItem value="long_text" className="text-xs">Long Text</SelectItem>
                <SelectItem value="multiple_choice" className="text-xs">Multiple Choice</SelectItem>
                <SelectItem value="dropdown" className="text-xs">Dropdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Required</span>
              <Switch checked={question.is_required} onCheckedChange={(v) => onUpdate({ is_required: v })} className="scale-75" />
            </div>
            <div className="h-4 w-px bg-border" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate}><Copy className="w-3 h-3" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} disabled={isFirst}><ChevronUp className="w-3 h-3" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} disabled={isLast}><ChevronDown className="w-3 h-3" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}><Trash2 className="w-3 h-3 text-destructive" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FormsStyleBuilder;
