import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Library, Plus, Search, Tag, Trash2, Copy, Star, Filter,
  CheckSquare, Type, CircleDot, Gauge, ToggleLeft, Calendar,
  AlignLeft, ChevronDown, BarChart3, Minus, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { QuestionType } from "@/types/surveys";

interface BankQuestion {
  id: string;
  type: QuestionType;
  question_text: string;
  help_text: string | null;
  options: string[];
  settings: Record<string, any>;
  is_required: boolean;
  category: string;
  tags: string[];
  usage_count: number;
  created_at: string;
}

const BANK_CATEGORIES = [
  { value: "engagement", label: "Engagement" },
  { value: "satisfaction", label: "Satisfaction" },
  { value: "exit_interview", label: "Exit Interview" },
  { value: "onboarding", label: "Onboarding" },
  { value: "candidate_experience", label: "Candidate Experience" },
  { value: "manager_feedback", label: "Manager Feedback" },
  { value: "learning", label: "Learning & Development" },
  { value: "wellbeing", label: "Wellbeing" },
  { value: "custom", label: "Custom" },
];

const ICON_MAP: Record<string, React.ElementType> = {
  short_text: Type, long_text: AlignLeft, single_choice: CircleDot,
  multiple_choice: CheckSquare, dropdown: ChevronDown, rating: Star,
  likert: BarChart3, nps: Gauge, yes_no: ToggleLeft, date: Calendar,
  section_divider: Minus, statement: Info,
};

const PRESET_QUESTIONS: Omit<BankQuestion, "id" | "created_at">[] = [
  { type: "nps", question_text: "On a scale of 0-10, how likely are you to recommend this company as a place to work?", help_text: null, options: [], settings: {}, is_required: true, category: "engagement", tags: ["eNPS", "loyalty"], usage_count: 0 },
  { type: "rating", question_text: "How satisfied are you with your current role?", help_text: null, options: [], settings: { min: 1, max: 5, minLabel: "Very Dissatisfied", maxLabel: "Very Satisfied" }, is_required: true, category: "satisfaction", tags: ["role", "satisfaction"], usage_count: 0 },
  { type: "likert", question_text: "I feel valued and recognized for my contributions.", help_text: null, options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"], settings: {}, is_required: true, category: "engagement", tags: ["recognition", "value"], usage_count: 0 },
  { type: "single_choice", question_text: "What is the primary reason for your departure?", help_text: null, options: ["Career growth", "Compensation", "Work-life balance", "Management", "Relocation", "Other"], settings: {}, is_required: true, category: "exit_interview", tags: ["exit", "reason"], usage_count: 0 },
  { type: "likert", question_text: "My manager communicates expectations clearly.", help_text: null, options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"], settings: {}, is_required: true, category: "manager_feedback", tags: ["manager", "communication"], usage_count: 0 },
  { type: "rating", question_text: "How would you rate your onboarding experience?", help_text: null, options: [], settings: { min: 1, max: 5, minLabel: "Poor", maxLabel: "Excellent" }, is_required: true, category: "onboarding", tags: ["onboarding", "experience"], usage_count: 0 },
  { type: "likert", question_text: "I have the tools and resources I need to do my job.", help_text: null, options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"], settings: {}, is_required: true, category: "satisfaction", tags: ["tools", "resources"], usage_count: 0 },
  { type: "long_text", question_text: "What could we improve to make this a better place to work?", help_text: null, options: [], settings: {}, is_required: false, category: "engagement", tags: ["improvement", "feedback"], usage_count: 0 },
  { type: "rating", question_text: "How would you rate your overall interview experience?", help_text: null, options: [], settings: { min: 1, max: 5, minLabel: "Very Poor", maxLabel: "Excellent" }, is_required: true, category: "candidate_experience", tags: ["interview", "candidate"], usage_count: 0 },
  { type: "likert", question_text: "I feel my work-life balance is healthy.", help_text: null, options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"], settings: {}, is_required: true, category: "wellbeing", tags: ["wellbeing", "balance"], usage_count: 0 },
  { type: "likert", question_text: "The training content was relevant to my role.", help_text: null, options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"], settings: {}, is_required: true, category: "learning", tags: ["learning", "training"], usage_count: 0 },
  { type: "yes_no", question_text: "Do you have any blockers preventing you from doing your best work?", help_text: null, options: [], settings: {}, is_required: true, category: "engagement", tags: ["blockers", "pulse"], usage_count: 0 },
];

const STORAGE_KEY = "survey_question_bank";

function loadBank(): BankQuestion[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  // Initialize with presets
  const initial = PRESET_QUESTIONS.map((q, i) => ({
    ...q,
    id: `preset-${i}`,
    created_at: new Date().toISOString(),
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveBank(bank: BankQuestion[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bank));
}

interface Props {
  onInsertQuestion?: (question: Omit<BankQuestion, "id" | "created_at" | "usage_count" | "tags" | "category">) => void;
}

const QuestionBank = ({ onInsertQuestion }: Props) => {
  const [bank, setBank] = useState<BankQuestion[]>(loadBank);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newQ, setNewQ] = useState({ question_text: "", type: "short_text" as QuestionType, category: "custom", tags: "", options: "", is_required: false, help_text: "" });

  useEffect(() => { saveBank(bank); }, [bank]);

  const filtered = bank.filter((q) => {
    const matchSearch = q.question_text.toLowerCase().includes(search.toLowerCase()) ||
      q.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchCat = categoryFilter === "all" || q.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleAdd = () => {
    if (!newQ.question_text.trim()) { toast.error("Question text required"); return; }
    const q: BankQuestion = {
      id: crypto.randomUUID(),
      type: newQ.type,
      question_text: newQ.question_text,
      help_text: newQ.help_text || null,
      options: newQ.options ? newQ.options.split(",").map(s => s.trim()).filter(Boolean) : [],
      settings: newQ.type === "rating" ? { min: 1, max: 5, minLabel: "Poor", maxLabel: "Excellent" } : {},
      is_required: newQ.is_required,
      category: newQ.category,
      tags: newQ.tags ? newQ.tags.split(",").map(s => s.trim()).filter(Boolean) : [],
      usage_count: 0,
      created_at: new Date().toISOString(),
    };
    setBank([q, ...bank]);
    setAddOpen(false);
    setNewQ({ question_text: "", type: "short_text", category: "custom", tags: "", options: "", is_required: false, help_text: "" });
    toast.success("Question added to bank");
  };

  const handleDelete = (id: string) => {
    setBank(bank.filter(q => q.id !== id));
    toast.success("Question removed");
  };

  const handleUse = (q: BankQuestion) => {
    if (onInsertQuestion) {
      onInsertQuestion({
        type: q.type,
        question_text: q.question_text,
        help_text: q.help_text,
        options: q.options,
        settings: q.settings,
        is_required: q.is_required,
      });
      setBank(bank.map(bq => bq.id === q.id ? { ...bq, usage_count: bq.usage_count + 1 } : bq));
      toast.success("Question added to survey");
    } else {
      navigator.clipboard.writeText(q.question_text);
      toast.success("Question copied to clipboard");
    }
  };

  const catCounts = BANK_CATEGORIES.reduce((acc, c) => {
    acc[c.value] = bank.filter(q => q.category === c.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Library className="w-5 h-5 text-primary" /> Question Bank
          </h2>
          <p className="text-sm text-muted-foreground">{bank.length} questions across {BANK_CATEGORIES.length} categories</p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Question
        </Button>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${categoryFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
        >
          All ({bank.length})
        </button>
        {BANK_CATEGORIES.map(c => catCounts[c.value] > 0 && (
          <button
            key={c.value}
            onClick={() => setCategoryFilter(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${categoryFilter === c.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            {c.label} ({catCounts[c.value]})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search questions or tags..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Questions list */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((q, i) => {
            const Icon = ICON_MAP[q.type] || Info;
            const catDef = BANK_CATEGORIES.find(c => c.value === q.category);
            return (
              <motion.div key={q.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: i * 0.02 }}>
                <Card className="border-border hover:border-primary/20 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{q.question_text}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {catDef && <Badge variant="secondary" className="text-[10px]">{catDef.label}</Badge>}
                          {q.tags.map(t => (
                            <Badge key={t} variant="outline" className="text-[10px] gap-0.5">
                              <Tag className="w-2.5 h-2.5" /> {t}
                            </Badge>
                          ))}
                          {q.usage_count > 0 && (
                            <span className="text-[10px] text-muted-foreground">Used {q.usage_count}×</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUse(q)} title={onInsertQuestion ? "Add to survey" : "Copy"}>
                          {onInsertQuestion ? <Plus className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(q.id)} title="Delete">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Library className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No questions match your filters</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Question Bank</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Question Text *</Label>
              <Textarea value={newQ.question_text} onChange={(e) => setNewQ({ ...newQ, question_text: e.target.value })} className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={newQ.type} onValueChange={(v) => setNewQ({ ...newQ, type: v as QuestionType })}>
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ICON_MAP).filter(([k]) => k !== "section_divider" && k !== "statement").map(([k]) => (
                      <SelectItem key={k} value={k}>{k.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={newQ.category} onValueChange={(v) => setNewQ({ ...newQ, category: v })}>
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BANK_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Options (comma-separated, for choice types)</Label>
              <Input value={newQ.options} onChange={(e) => setNewQ({ ...newQ, options: e.target.value })} className="mt-1 h-9 text-xs" placeholder="Option 1, Option 2, Option 3" />
            </div>
            <div>
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input value={newQ.tags} onChange={(e) => setNewQ({ ...newQ, tags: e.target.value })} className="mt-1 h-9 text-xs" placeholder="engagement, pulse" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Required by default</Label>
              <Switch checked={newQ.is_required} onCheckedChange={(v) => setNewQ({ ...newQ, is_required: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add to Bank</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionBank;
