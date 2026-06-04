import { motion } from "framer-motion";
import { ArrowLeft, Star } from "lucide-react";
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
import type { Survey, SurveyQuestion } from "@/types/surveys";

interface Props {
  survey: Partial<Survey>;
  questions: (Omit<SurveyQuestion, 'id' | 'survey_id' | 'created_at'> & { _key?: string })[];
  onClose: () => void;
}

const SurveyPreview = ({ survey, questions, onClose }: Props) => {
  const answerableQuestions = questions.filter((q) => q.type !== "section_divider" && q.type !== "statement");
  const totalQuestions = answerableQuestions.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Editor
        </Button>
        <span className="text-xs text-muted-foreground">Preview Mode</span>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardContent className="p-8 text-center">
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold mb-2">
              {survey.title || "Untitled Survey"}
            </motion.h1>
            {survey.description && (
              <p className="text-muted-foreground">{survey.description}</p>
            )}
            {totalQuestions > 0 && (
              <p className="text-xs text-muted-foreground mt-3">{totalQuestions} questions</p>
            )}
            {survey.is_anonymous && (
              <p className="text-xs text-emerald-400 mt-2">🔒 Your responses are anonymous</p>
            )}
          </CardContent>
        </Card>

        {/* Respondent info (if not anonymous) */}
        {!survey.is_anonymous && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-sm font-semibold">Your Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Full Name</Label>
                  <Input placeholder="Enter your name" className="mt-1" disabled />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input placeholder="Enter your email" className="mt-1" disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions */}
        {questions.map((q, i) => (
          <motion.div key={q._key || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            {q.type === "section_divider" ? (
              <div className="pt-4">
                <Separator className="mb-3" />
                <h2 className="text-lg font-semibold">{q.question_text || "Section"}</h2>
              </div>
            ) : q.type === "statement" ? (
              <Card className="bg-secondary/50">
                <CardContent className="p-5">
                  <p className="text-sm">{q.question_text}</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-5 space-y-3">
                  <Label className="text-sm">
                    {q.question_text || "Question"}
                    {q.is_required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {q.help_text && <p className="text-xs text-muted-foreground">{q.help_text}</p>}

                  {q.type === "short_text" && (
                    <Input placeholder={q.placeholder || "Your answer"} disabled />
                  )}
                  {q.type === "long_text" && (
                    <Textarea placeholder={q.placeholder || "Your answer"} disabled rows={3} />
                  )}
                  {q.type === "single_choice" && (
                    <RadioGroup disabled>
                      {(q.options || []).map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <RadioGroupItem value={opt} id={`${i}-${oi}`} disabled />
                          <Label htmlFor={`${i}-${oi}`} className="text-sm font-normal">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  {q.type === "multiple_choice" && (
                    <div className="space-y-2">
                      {(q.options || []).map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <Checkbox disabled />
                          <span className="text-sm">{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === "dropdown" && (
                    <Select disabled>
                      <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
                      <SelectContent>
                        {(q.options || []).map((opt, oi) => (
                          <SelectItem key={oi} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {q.type === "likert" && (
                    <div className="flex flex-wrap gap-2">
                      {(q.options || []).map((opt, oi) => (
                        <div key={oi} className="px-3 py-2 rounded-lg border border-border text-xs text-center cursor-default hover:border-primary/40 transition-colors">
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === "rating" && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: (q.settings?.max || 5) - (q.settings?.min || 1) + 1 }, (_, idx) => (
                        <button key={idx} disabled className="p-1">
                          <Star className="w-6 h-6 text-muted-foreground/30" />
                        </button>
                      ))}
                      <div className="flex justify-between w-full text-[10px] text-muted-foreground mt-1 px-1">
                        <span>{q.settings?.minLabel}</span>
                        <span>{q.settings?.maxLabel}</span>
                      </div>
                    </div>
                  )}
                  {q.type === "nps" && (
                    <div className="space-y-2">
                      <div className="flex gap-1 flex-wrap">
                        {Array.from({ length: 11 }, (_, idx) => (
                          <div key={idx} className={`w-9 h-9 rounded-lg border flex items-center justify-center text-sm cursor-default
                            ${idx <= 6 ? "border-red-500/30" : idx <= 8 ? "border-yellow-500/30" : "border-emerald-500/30"}`}>
                            {idx}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Not at all likely</span>
                        <span>Extremely likely</span>
                      </div>
                    </div>
                  )}
                  {q.type === "yes_no" && (
                    <div className="flex gap-3">
                      <div className="px-6 py-2 rounded-lg border border-border text-sm cursor-default">Yes</div>
                      <div className="px-6 py-2 rounded-lg border border-border text-sm cursor-default">No</div>
                    </div>
                  )}
                  {q.type === "date" && (
                    <Input type="date" disabled />
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        ))}

        {/* Submit area */}
        <Card>
          <CardContent className="p-6 text-center">
            <Button size="lg" disabled>Submit Response</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SurveyPreview;
