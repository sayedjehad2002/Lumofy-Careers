import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Type, AlignLeft, CircleDot, CheckSquare, ChevronDown, Star,
  BarChart3, Gauge, ToggleLeft, Calendar, Minus, Info,
  Plus, Trash2, Copy, GripVertical, Eye, Save, ArrowLeft, Settings,
  GitBranch, ChevronUp, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import SurveyPreview from "./SurveyPreview";
import type { Survey, SurveyQuestion, QuestionType, SurveyCategory, AudienceType, QuestionCondition, ConditionOperator } from "@/types/surveys";
import { SURVEY_CATEGORIES, AUDIENCE_TYPES, QUESTION_TYPES, CONDITION_OPERATORS } from "@/types/surveys";

const ICON_MAP: Record<string, React.ElementType> = {
  Type, AlignLeft, CircleDot, CheckSquare, ChevronDown, Star, BarChart3, Gauge, ToggleLeft, Calendar, Minus, Info,
};

type DraftQuestion = Omit<SurveyQuestion, 'id' | 'survey_id' | 'created_at'> & {
  _key: string;
  conditions?: QuestionCondition[];
};

interface Props {
  survey: Survey | null;
  onSave: (survey: Partial<Survey>, questions: Omit<SurveyQuestion, 'id' | 'survey_id' | 'created_at'>[]) => void;
  onCancel: () => void;
}

const SurveyBuilder = ({ survey, onSave, onCancel }: Props) => {
  const [title, setTitle] = useState(survey?.title || "");
  const [description, setDescription] = useState(survey?.description || "");
  const [category, setCategory] = useState<SurveyCategory>(survey?.category || "custom");
  const [audienceType, setAudienceType] = useState<AudienceType>(survey?.audience_type || "internal");
  const [isAnonymous, setIsAnonymous] = useState(survey?.is_anonymous || false);
  const [allowMultiple, setAllowMultiple] = useState(survey?.allow_multiple_responses || false);
  const [deadline, setDeadline] = useState(survey?.response_deadline?.split("T")[0] || "");
  const [thankYou, setThankYou] = useState(survey?.thank_you_message || "Thank you for completing this survey!");
  const [maxResponses, setMaxResponses] = useState<string>(survey?.max_responses?.toString() || "");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [builderTab, setBuilderTab] = useState<"questions" | "settings">("questions");

  const [questions, setQuestions] = useState<DraftQuestion[]>(() => {
    if (survey?.questions && survey.questions.length > 0) {
      return survey.questions.map((q) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
        settings: q.settings || {},
        conditions: q.settings?.conditions || [],
        _key: crypto.randomUUID(),
      }));
    }
    return [];
  });

  const addQuestion = (type: QuestionType) => {
    const defaults: Partial<DraftQuestion> = {};
    if (type === "single_choice" || type === "multiple_choice" || type === "dropdown") {
      defaults.options = ["Option 1", "Option 2"];
    }
    if (type === "likert") {
      defaults.options = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];
    }
    if (type === "rating") {
      defaults.settings = { min: 1, max: 5, minLabel: "Poor", maxLabel: "Excellent" };
    }
    setQuestions([
      ...questions,
      {
        _key: crypto.randomUUID(),
        type,
        question_text: "",
        help_text: null,
        placeholder: null,
        is_required: false,
        options: [],
        order_index: questions.length,
        settings: {},
        conditions: [],
        ...defaults,
      },
    ]);
  };

  const updateQuestion = (key: string, updates: Partial<DraftQuestion>) => {
    setQuestions(questions.map((q) => (q._key === key ? { ...q, ...updates } : q)));
  };

  const removeQuestion = (key: string) => {
    // Also remove conditions referencing this question
    const removedKey = key;
    setQuestions(questions
      .filter((q) => q._key !== key)
      .map((q) => ({
        ...q,
        conditions: (q.conditions || []).filter(c => c.source_question_key !== removedKey),
      }))
    );
  };

  const duplicateQuestion = (key: string) => {
    const idx = questions.findIndex((q) => q._key === key);
    if (idx >= 0) {
      const clone = { ...questions[idx], _key: crypto.randomUUID(), conditions: [] };
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
    if (!title.trim()) return;
    const surveyData: Partial<Survey> = {
      ...(survey?.id ? { id: survey.id } : {}),
      title,
      description,
      category,
      audience_type: audienceType,
      is_anonymous: isAnonymous,
      allow_multiple_responses: allowMultiple,
      response_deadline: deadline ? new Date(deadline).toISOString() : null,
      thank_you_message: thankYou,
      status: (status || survey?.status || "draft") as any,
      max_responses: maxResponses ? parseInt(maxResponses) : null,
    };
    const cleanQuestions = questions.map(({ _key, conditions, ...q }, i) => ({
      ...q,
      order_index: i,
      settings: { ...q.settings, conditions: conditions || [] },
    }));
    onSave(surveyData, cleanQuestions);
  };

  // Get previous questions that can be condition sources
  const getSourceQuestions = (currentKey: string) => {
    const currentIdx = questions.findIndex(q => q._key === currentKey);
    return questions
      .slice(0, currentIdx)
      .filter(q => !['section_divider', 'statement'].includes(q.type));
  };

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
    <div className="space-y-6">
      {/* Top actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="w-4 h-4 mr-1" /> Preview
          </Button>
          <Button variant="outline" onClick={() => handleSave("draft")}>
            <Save className="w-4 h-4 mr-1" /> Save Draft
          </Button>
          <Button onClick={() => handleSave("published")} disabled={!title.trim() || questions.length === 0}>
            Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left: Question types palette */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Add Question</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 grid grid-cols-2 gap-2">
              {QUESTION_TYPES.map((qt) => {
                const IconComp = ICON_MAP[qt.icon] || Info;
                return (
                  <button
                    key={qt.value}
                    onClick={() => addQuestion(qt.value)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border hover:border-primary/40 hover:bg-secondary transition-colors text-xs text-center"
                  >
                    <IconComp className="w-4 h-4 text-primary" />
                    <span className="leading-tight">{qt.label}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Sections overview */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-primary" /> Logic Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {questions.filter(q => (q.conditions || []).length > 0).length === 0 ? (
                <p className="text-xs text-muted-foreground">No conditional logic added yet. Add conditions to questions to show/hide them based on previous answers.</p>
              ) : (
                <div className="space-y-1.5">
                  {questions.filter(q => (q.conditions || []).length > 0).map(q => (
                    <div key={q._key} className="text-xs p-2 rounded bg-secondary/50 border border-border">
                      <span className="font-medium truncate block">Q{questions.indexOf(q) + 1}: {q.question_text.slice(0, 30) || "Untitled"}</span>
                      <span className="text-muted-foreground">{q.conditions!.length} condition(s)</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Builder area */}
        <div className="space-y-4">
          <Tabs value={builderTab} onValueChange={(v) => setBuilderTab(v as any)}>
            <TabsList>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" /> Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="mt-4">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Survey Title *</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter survey title" className="mt-1" />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={category} onValueChange={(v) => setCategory(v as SurveyCategory)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SURVEY_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Description</Label>
                      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the purpose of this survey..." className="mt-1" rows={3} />
                    </div>
                    <div>
                      <Label>Audience</Label>
                      <Select value={audienceType} onValueChange={(v) => setAudienceType(v as AudienceType)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {AUDIENCE_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Response Deadline</Label>
                      <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>Max Responses</Label>
                      <Input type="number" value={maxResponses} onChange={(e) => setMaxResponses(e.target.value)} placeholder="Unlimited" className="mt-1" />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Thank You Message</Label>
                      <Textarea value={thankYou} onChange={(e) => setThankYou(e.target.value)} className="mt-1" rows={2} />
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                      <Label>Anonymous Responses</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} />
                      <Label>Allow Multiple Responses</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="questions" className="mt-4 space-y-4">
              {/* Inline title */}
              <Card>
                <CardContent className="p-4">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Survey Title *"
                    className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
                  />
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description..."
                    className="border-0 px-0 focus-visible:ring-0 bg-transparent text-sm text-muted-foreground resize-none mt-1"
                    rows={2}
                  />
                </CardContent>
              </Card>

              {/* Questions */}
              <AnimatePresence>
                {questions.map((q, i) => (
                  <QuestionCard
                    key={q._key}
                    question={q}
                    index={i}
                    allQuestions={questions}
                    sourceQuestions={getSourceQuestions(q._key)}
                    onUpdate={(updates) => updateQuestion(q._key, updates)}
                    onRemove={() => removeQuestion(q._key)}
                    onDuplicate={() => duplicateQuestion(q._key)}
                    onMoveUp={() => moveQuestion(q._key, -1)}
                    onMoveDown={() => moveQuestion(q._key, 1)}
                    isFirst={i === 0}
                    isLast={i === questions.length - 1}
                  />
                ))}
              </AnimatePresence>

              {questions.length === 0 && (
                <Card className="border-dashed border-2">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Add questions from the panel on the left</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// Question Card component
interface QuestionCardProps {
  question: DraftQuestion;
  index: number;
  allQuestions: DraftQuestion[];
  sourceQuestions: DraftQuestion[];
  onUpdate: (updates: Partial<DraftQuestion>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const QuestionCard = ({ question, index, allQuestions, sourceQuestions, onUpdate, onRemove, onDuplicate, onMoveUp, onMoveDown, isFirst, isLast }: QuestionCardProps) => {
  const [conditionOpen, setConditionOpen] = useState(false);
  const qtDef = QUESTION_TYPES.find((t) => t.value === question.type);
  const IconComp = ICON_MAP[qtDef?.icon || "Info"] || Info;

  const conditions = question.conditions || [];

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

  const addCondition = () => {
    if (sourceQuestions.length === 0) return;
    const newCondition: QuestionCondition = {
      source_question_key: sourceQuestions[0]._key,
      operator: 'equals',
      value: '',
    };
    onUpdate({ conditions: [...conditions, newCondition] });
  };

  const updateCondition = (idx: number, updates: Partial<QuestionCondition>) => {
    const next = [...conditions];
    next[idx] = { ...next[idx], ...updates };
    onUpdate({ conditions: next });
  };

  const removeCondition = (idx: number) => {
    onUpdate({ conditions: conditions.filter((_, i) => i !== idx) });
  };

  const getConditionSummary = (cond: QuestionCondition) => {
    const sourceQ = allQuestions.find(q => q._key === cond.source_question_key);
    const sourceLabel = sourceQ ? `Q${allQuestions.indexOf(sourceQ) + 1}` : '?';
    const opLabel = CONDITION_OPERATORS.find(o => o.value === cond.operator)?.label || cond.operator;
    const valLabel = Array.isArray(cond.value) ? cond.value.join(', ') : String(cond.value);
    return `If ${sourceLabel} ${opLabel.toLowerCase()} "${valLabel}"`;
  };

  const isSectionOrStatement = question.type === "section_divider" || question.type === "statement";
  const hasOptions = ["single_choice", "multiple_choice", "dropdown", "likert"].includes(question.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
    >
      <Card className={`border-border hover:border-primary/20 transition-colors ${conditions.length > 0 ? 'border-l-2 border-l-amber-500/60' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1 pt-1">
              <button onClick={onMoveUp} disabled={isFirst} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronUp className="w-4 h-4" />
              </button>
              <GripVertical className="w-4 h-4 text-muted-foreground/50" />
              <button onClick={onMoveDown} disabled={isLast} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs gap-1">
                  <IconComp className="w-3 h-3" /> {qtDef?.label}
                </Badge>
                <span className="text-xs text-muted-foreground">Q{index + 1}</span>
                {conditions.length > 0 && (
                  <Badge variant="outline" className="text-xs gap-1 text-amber-400 border-amber-500/30">
                    <GitBranch className="w-3 h-3" /> {conditions.length} condition{conditions.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {/* Condition summary badges */}
              {conditions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {conditions.map((cond, ci) => (
                    <span key={ci} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {getConditionSummary(cond)}
                    </span>
                  ))}
                </div>
              )}

              {isSectionOrStatement ? (
                <Input
                  value={question.question_text}
                  onChange={(e) => onUpdate({ question_text: e.target.value })}
                  placeholder={question.type === "section_divider" ? "Section Title" : "Statement text"}
                  className="font-medium"
                />
              ) : (
                <>
                  <Input
                    value={question.question_text}
                    onChange={(e) => onUpdate({ question_text: e.target.value })}
                    placeholder="Enter your question"
                  />
                  <Input
                    value={question.help_text || ""}
                    onChange={(e) => onUpdate({ help_text: e.target.value || null })}
                    placeholder="Help text (optional)"
                    className="text-xs"
                  />
                </>
              )}

              {hasOptions && (
                <div className="space-y-2 pl-2">
                  {(question.options || []).map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(oi, e.target.value)}
                        className="h-8 text-sm"
                      />
                      <button onClick={() => removeOption(oi)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={addOption} className="text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Add option
                  </Button>
                </div>
              )}

              {question.type === "rating" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Scale: {question.settings?.min || 1} - {question.settings?.max || 5}</span>
                  <span>({question.settings?.minLabel || "Low"} → {question.settings?.maxLabel || "High"})</span>
                </div>
              )}

              {question.type === "nps" && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: 11 }, (_, i) => (
                    <div key={i} className="w-7 h-7 rounded border border-border flex items-center justify-center text-xs text-muted-foreground">
                      {i}
                    </div>
                  ))}
                </div>
              )}

              {/* Conditional Logic Editor */}
              {!isSectionOrStatement && sourceQuestions.length > 0 && (
                <Collapsible open={conditionOpen} onOpenChange={setConditionOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <GitBranch className="w-3.5 h-3.5" />
                      {conditionOpen ? "Hide" : "Add"} conditional logic
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="space-y-2 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-amber-400">Show this question when:</span>
                        <Button variant="ghost" size="sm" onClick={addCondition} className="h-7 text-xs">
                          <Plus className="w-3 h-3 mr-1" /> Add Condition
                        </Button>
                      </div>
                      {conditions.map((cond, ci) => {
                        const sourceQ = allQuestions.find(q => q._key === cond.source_question_key);
                        const sourceHasOptions = sourceQ && ['single_choice', 'multiple_choice', 'dropdown', 'likert', 'yes_no'].includes(sourceQ.type);
                        const sourceOptions = sourceQ?.type === 'yes_no' ? ['Yes', 'No'] : (sourceQ?.options || []);

                        return (
                          <div key={ci} className="flex flex-wrap items-center gap-2 p-2 rounded bg-background/50 border border-border">
                            <span className="text-xs text-muted-foreground">If</span>
                            <Select value={cond.source_question_key} onValueChange={(v) => updateCondition(ci, { source_question_key: v, value: '' })}>
                              <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {sourceQuestions.map(sq => (
                                  <SelectItem key={sq._key} value={sq._key} className="text-xs">
                                    Q{allQuestions.indexOf(sq) + 1}: {sq.question_text.slice(0, 25) || "Untitled"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={cond.operator} onValueChange={(v) => updateCondition(ci, { operator: v as ConditionOperator })}>
                              <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {CONDITION_OPERATORS.map(op => (
                                  <SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {sourceHasOptions ? (
                              <Select value={String(cond.value)} onValueChange={(v) => updateCondition(ci, { value: v })}>
                                <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Select value" /></SelectTrigger>
                                <SelectContent>
                                  {sourceOptions.map(opt => (
                                    <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={String(cond.value)}
                                onChange={(e) => updateCondition(ci, { value: e.target.value })}
                                placeholder="Value"
                                className="h-7 text-xs w-28"
                              />
                            )}
                            <button onClick={() => removeCondition(ci)} className="text-muted-foreground hover:text-destructive">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {conditions.length === 0 && (
                        <p className="text-[10px] text-muted-foreground">No conditions yet. Click "Add Condition" above.</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {!isSectionOrStatement && (
                <div className="flex items-center gap-1.5 mr-2">
                  <Switch
                    checked={question.is_required}
                    onCheckedChange={(v) => onUpdate({ is_required: v })}
                    className="scale-75"
                  />
                  <span className="text-xs text-muted-foreground">Required</span>
                </div>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SurveyBuilder;
