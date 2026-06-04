import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bookmark, Plus, Sparkles, Zap, Clock, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface RuleTemplatesProps {
  onCreateRule: (template: RuleTemplate) => void;
}

export interface RuleTemplate {
  name: string;
  description: string;
  condition_type: string;
  condition_operator: string;
  condition_value: string;
  condition_stage: string | null;
  action_type: string;
  action_value: string;
  category: string;
}

const TEMPLATES: RuleTemplate[] = [
  {
    name: "Auto-Shortlist Top Matches",
    description: "Move candidates with AI score ≥ 85 directly to shortlisted",
    condition_type: "ai_score",
    condition_operator: "gte",
    condition_value: "85",
    condition_stage: "new",
    action_type: "move_stage",
    action_value: "shortlisted",
    category: "Fast-Track",
  },
  {
    name: "Auto-Reject Low Scores",
    description: "Reject candidates with AI score below 30",
    condition_type: "ai_score",
    condition_operator: "lt",
    condition_value: "30",
    condition_stage: "new",
    action_type: "move_stage",
    action_value: "rejected",
    category: "Quality Control",
  },
  {
    name: "Flag Stale New Candidates",
    description: "Add note to candidates stuck in New for more than 5 days",
    condition_type: "days_in_stage",
    condition_operator: "gt",
    condition_value: "5",
    condition_stage: "new",
    action_type: "add_note",
    action_value: "⚠ Candidate has been in New stage for over 5 days — needs review",
    category: "SLA Compliance",
  },
  {
    name: "Advance Strong Reviewed Candidates",
    description: "Move reviewing candidates with AI score ≥ 70 to shortlisted",
    condition_type: "ai_score",
    condition_operator: "gte",
    condition_value: "70",
    condition_stage: "reviewing",
    action_type: "move_stage",
    action_value: "shortlisted",
    category: "Fast-Track",
  },
  {
    name: "Flag Missing AI Analysis",
    description: "Add reminder note to candidates without AI analysis after 3 days",
    condition_type: "missing_rating",
    condition_operator: "eq",
    condition_value: "true",
    condition_stage: null,
    action_type: "add_note",
    action_value: "📋 Reminder: Run AI analysis for this candidate",
    category: "Quality Control",
  },
  {
    name: "Stale Interview Escalation",
    description: "Flag candidates in Interview stage for over 7 days",
    condition_type: "days_in_stage",
    condition_operator: "gt",
    condition_value: "7",
    condition_stage: "interview",
    action_type: "add_note",
    action_value: "🔴 Critical: Interview decision pending for over 7 days",
    category: "SLA Compliance",
  },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Fast-Track": <Zap className="w-3.5 h-3.5" />,
  "Quality Control": <Sparkles className="w-3.5 h-3.5" />,
  "SLA Compliance": <Clock className="w-3.5 h-3.5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  "Fast-Track": "bg-emerald-500/10 text-emerald-400",
  "Quality Control": "bg-primary/10 text-primary",
  "SLA Compliance": "bg-yellow-500/10 text-yellow-400",
};

const RuleTemplates = ({ onCreateRule }: RuleTemplatesProps) => {
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const handleApply = (template: RuleTemplate) => {
    onCreateRule(template);
    setApplied(prev => new Set(prev).add(template.name));
    toast.success(`Rule "${template.name}" created`);
  };

  const categories = [...new Set(TEMPLATES.map(t => t.category))];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-primary" />
          Automation Rule Templates
        </CardTitle>
        <CardDescription className="text-xs">Pre-built rules for common pipeline scenarios — one-click activate</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map(category => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${CATEGORY_COLORS[category]}`}>
                  {CATEGORY_ICONS[category]}
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{category}</span>
              </div>
              <div className="space-y-1.5">
                {TEMPLATES.filter(t => t.category === category).map((template, i) => (
                  <motion.div
                    key={template.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{template.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{template.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={applied.has(template.name) ? "ghost" : "outline"}
                      className="text-[10px] h-7 rounded-lg px-3 flex-shrink-0"
                      disabled={applied.has(template.name)}
                      onClick={() => handleApply(template)}
                    >
                      {applied.has(template.name) ? (
                        <><CheckCircle2 className="w-3 h-3 mr-0.5 text-emerald-400" /> Added</>
                      ) : (
                        <><Plus className="w-3 h-3 mr-0.5" /> Use Template</>
                      )}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RuleTemplates;
