import { useState } from "react";
import { Sparkles, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ScreeningQuestion } from "@/types/careers";
import lumofyLogo from "@/assets/lumofy-logo.jpg";

interface AIJobAssistModalProps {
  open: boolean;
  onClose: () => void;
  type: "summary" | "description" | "requirements" | "responsibilities" | "screening_questions";
  sessionToken: string;
  jobData: {
    title: string;
    department: string;
    location: string;
    type: string;
    summary: string;
    description: string;
    responsibilities: string[];
    requirements: string[];
    jdFilePath?: string;
  };
  onInsertSummary?: (summary: string) => void;
  onInsertDescription?: (description: string) => void;
  onInsertRequirements?: (items: string[]) => void;
  onInsertResponsibilities?: (items: string[]) => void;
  onInsertQuestions?: (questions: ScreeningQuestion[]) => void;
}

interface GeneratedQuestion {
  question: string;
  type: ScreeningQuestion["type"];
  options?: string[];
  required: boolean;
  assesses: string;
  ideal_indicators: string;
  selected: boolean;
}

const AIJobAssistModal = ({
  open, onClose, type, sessionToken, jobData,
  onInsertSummary, onInsertDescription, onInsertRequirements, onInsertResponsibilities, onInsertQuestions,
}: AIJobAssistModalProps) => {
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState("4");
  const [seniority, setSeniority] = useState("Mid");
  const [focusAreas, setFocusAreas] = useState<string[]>(["Role Skills"]);
  const [questionTypes, setQuestionTypes] = useState<string[]>(["short_text", "yes_no"]);

  // Results
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [generatedMustHave, setGeneratedMustHave] = useState<string[]>([]);
  const [generatedNiceToHave, setGeneratedNiceToHave] = useState<string[]>([]);
  const [generatedResponsibilities, setGeneratedResponsibilities] = useState<string[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [hasResults, setHasResults] = useState(false);

  const toggleFocus = (area: string) => {
    setFocusAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
  };

  const toggleQType = (t: string) => {
    setQuestionTypes(prev => prev.includes(t) ? prev.filter(a => a !== t) : [...prev, t]);
  };

  const generate = async () => {
    setLoading(true);
    setHasResults(false);
    try {
      const { data, error } = await supabase.functions.invoke("ai-job-assist", {
        body: {
          type,
          sessionToken,
          jobTitle: jobData.title,
          department: jobData.department,
          location: jobData.location,
          employmentType: jobData.type,
          summary: jobData.summary,
          description: jobData.description,
          responsibilities: jobData.responsibilities,
          requirements: jobData.requirements,
          jdFilePath: jobData.jdFilePath,
          count: parseInt(count),
          seniority,
          focusAreas,
          questionTypes,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const result = data.result;

      if (type === "summary") {
        setGeneratedSummary(result.summary || "");
      } else if (type === "description") {
        setGeneratedDescription(result.description || "");
      } else if (type === "requirements") {
        setGeneratedMustHave(result.must_have || []);
        setGeneratedNiceToHave(result.nice_to_have || []);
        const total = (result.must_have?.length || 0) + (result.nice_to_have?.length || 0);
        setSelectedItems(new Set(Array.from({ length: total }, (_, i) => i)));
      } else if (type === "responsibilities") {
        setGeneratedResponsibilities(result.responsibilities || []);
        setSelectedItems(new Set(result.responsibilities.map((_: any, i: number) => i)));
      } else if (type === "screening_questions") {
        const qs = (result.questions || []).map((q: any) => ({ ...q, selected: true }));
        setGeneratedQuestions(qs);
      }

      setHasResults(true);
    } catch (e: any) {
      toast.error(e.message || "AI generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (type === "summary" && onInsertSummary) {
      onInsertSummary(generatedSummary);
    } else if (type === "description" && onInsertDescription) {
      onInsertDescription(generatedDescription);
    } else if (type === "requirements" && onInsertRequirements) {
      const all = [...generatedMustHave, ...generatedNiceToHave];
      const selected = all.filter((_, i) => selectedItems.has(i));
      onInsertRequirements(selected);
    } else if (type === "responsibilities" && onInsertResponsibilities) {
      const selected = generatedResponsibilities.filter((_, i) => selectedItems.has(i));
      onInsertResponsibilities(selected);
    } else if (type === "screening_questions" && onInsertQuestions) {
      const selected = generatedQuestions
        .filter(q => q.selected)
        .map((q, i) => ({
          id: `sq_ai_${Date.now()}_${i}`,
          question: q.question,
          type: q.type,
          options: q.options,
          required: q.required,
        }));
      onInsertQuestions(selected);
    }
    toast.success("Content inserted");
    onClose();
  };

  const toggleItem = (idx: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const titleMap = {
    summary: "Generate Summary",
    description: "Generate About the Role",
    requirements: "Generate Requirements",
    responsibilities: "Generate Responsibilities",
    screening_questions: "Generate Screening Questions",
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {titleMap[type]}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <img src={lumofyLogo} alt="Lumofy" className="w-4 h-4 rounded" />
            <span className="text-xs text-muted-foreground">AI by Lumofy</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Config options */}
          {type !== "summary" && type !== "description" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Number of items</Label>
                <Select value={count} onValueChange={setCount}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {type !== "responsibilities" && (
                <div>
                  <Label className="text-xs">Seniority</Label>
                  <Select value={seniority} onValueChange={setSeniority}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Junior">Junior</SelectItem>
                      <SelectItem value="Mid">Mid-Level</SelectItem>
                      <SelectItem value="Senior">Senior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {type === "screening_questions" && (
            <>
              <div>
                <Label className="text-xs mb-2 block">Focus Areas</Label>
                <div className="flex flex-wrap gap-2">
                  {["Role Skills", "Communication", "Culture Fit", "Local Compliance"].map(area => (
                    <Badge
                      key={area}
                      variant={focusAreas.includes(area) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFocus(area)}
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs mb-2 block">Question Types</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "short_text", label: "Short Text" },
                    { value: "long_text", label: "Long Text" },
                    { value: "yes_no", label: "Yes/No" },
                    { value: "number", label: "Number" },
                    { value: "multiple_choice", label: "Multiple Choice" },
                  ].map(t => (
                    <Badge
                      key={t.value}
                      variant={questionTypes.includes(t.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleQType(t.value)}
                    >
                      {t.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Button onClick={generate} disabled={loading} className="w-full">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />{hasResults ? "Regenerate" : "Generate"}</>
            )}
          </Button>

          {/* Results */}
          {hasResults && (
            <div className="space-y-3 border-t border-border pt-4">
              {type === "summary" && (
                <div className="rounded-lg bg-secondary/50 p-4">
                  <p className="text-sm">{generatedSummary}</p>
                  <p className="text-xs text-muted-foreground mt-1">{generatedSummary.length} characters</p>
                </div>
              )}

              {type === "description" && (
                <div className="rounded-lg bg-secondary/50 p-4">
                  <p className="text-sm whitespace-pre-wrap">{generatedDescription}</p>
                </div>
              )}

              {type === "requirements" && (
                <>
                  {generatedMustHave.length > 0 && (
                    <div>
                      <Label className="text-xs text-primary font-semibold">Must-Have</Label>
                      {generatedMustHave.map((r, i) => (
                        <label key={i} className="flex items-start gap-2 py-1.5 cursor-pointer">
                          <Checkbox checked={selectedItems.has(i)} onCheckedChange={() => toggleItem(i)} className="mt-0.5" />
                          <span className="text-sm">{r}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {generatedNiceToHave.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground font-semibold">Nice-to-Have</Label>
                      {generatedNiceToHave.map((r, i) => {
                        const idx = generatedMustHave.length + i;
                        return (
                          <label key={idx} className="flex items-start gap-2 py-1.5 cursor-pointer">
                            <Checkbox checked={selectedItems.has(idx)} onCheckedChange={() => toggleItem(idx)} className="mt-0.5" />
                            <span className="text-sm">{r}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {type === "responsibilities" && generatedResponsibilities.map((r, i) => (
                <label key={i} className="flex items-start gap-2 py-1.5 cursor-pointer">
                  <Checkbox checked={selectedItems.has(i)} onCheckedChange={() => toggleItem(i)} className="mt-0.5" />
                  <span className="text-sm">{r}</span>
                </label>
              ))}

              {type === "screening_questions" && generatedQuestions.map((q, i) => (
                <div key={i} className="rounded-lg bg-secondary/50 p-3 space-y-1">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      checked={q.selected}
                      onCheckedChange={() => {
                        setGeneratedQuestions(prev => prev.map((qq, idx) => idx === i ? { ...qq, selected: !qq.selected } : qq));
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{q.type.replace("_", " ")}</Badge>
                        {q.required && <Badge variant="outline" className="text-[10px] text-primary">Required</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Assesses: {q.assesses}</p>
                    </div>
                  </label>
                </div>
              ))}

              <Button onClick={handleInsert} className="w-full">
                <Check className="w-4 h-4 mr-2" />
                Insert Selected
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIJobAssistModal;
