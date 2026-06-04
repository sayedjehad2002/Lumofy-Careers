import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Plus, Sparkles, Users, Briefcase, GraduationCap, LogOut,
  Heart, Gauge, UserCheck, ArrowRight, ArrowLeft, CheckCircle2, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SURVEY_TEMPLATES, SURVEY_CATEGORIES, AUDIENCE_TYPES } from "@/types/surveys";
import type { Survey, SurveyQuestion, SurveyTemplate, AudienceType } from "@/types/surveys";

interface Props {
  onSelect: (survey: Partial<Survey>, questions: Omit<SurveyQuestion, "id" | "survey_id" | "created_at">[]) => void;
  onCancel: () => void;
}

const TEMPLATE_ICONS: Record<string, typeof FileText> = {
  enps: Gauge,
  "onboarding-30-60-90": GraduationCap,
  "candidate-experience": Briefcase,
  "exit-interview": LogOut,
  "learning-feedback": GraduationCap,
  "engagement-pulse": Heart,
  "manager-feedback": UserCheck,
};

const SurveyCreationWizard = ({ onSelect, onCancel }: Props) => {
  const [step, setStep] = useState<"choose" | "audience">("choose");
  const [selectedTemplate, setSelectedTemplate] = useState<SurveyTemplate | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<AudienceType>("internal");

  const handleChooseBlank = () => {
    setSelectedTemplate(null);
    setStep("audience");
  };

  const handleChooseTemplate = (t: SurveyTemplate) => {
    setSelectedTemplate(t);
    setStep("audience");
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      const survey: Partial<Survey> = {
        title: selectedTemplate.title,
        description: selectedTemplate.description,
        category: selectedTemplate.category,
        audience_type: selectedAudience,
        is_anonymous: false,
        allow_multiple_responses: false,
        thank_you_message: "Thank you for completing this survey!",
        status: "draft" as const,
      };
      onSelect(survey, selectedTemplate.questions);
    } else {
      const survey: Partial<Survey> = {
        title: "",
        description: "",
        category: "custom",
        audience_type: selectedAudience,
        is_anonymous: false,
        allow_multiple_responses: false,
        thank_you_message: "Thank you for completing this survey!",
        status: "draft" as const,
      };
      onSelect(survey, []);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Create New Survey</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {step === "choose" ? "Start from scratch or use an HR-ready template" : "Select your target audience"}
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {["Template", "Audience"].map((label, i) => {
          const isActive = (i === 0 && step === "choose") || (i === 1 && step === "audience");
          const isDone = i === 0 && step === "audience";
          return (
            <div key={label} className="flex items-center gap-2">
              <motion.div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isDone ? "bg-primary text-primary-foreground" : isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
                animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.4 }}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </motion.div>
              <span className={`text-sm font-medium ${isActive || isDone ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
              {i === 0 && <ArrowRight className="w-4 h-4 text-muted-foreground mx-1" />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === "choose" && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Blank template */}
              <motion.div variants={itemVariants}>
                <Card
                  className="group border-2 border-dashed border-primary/30 hover:border-primary/60 cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/5 h-full"
                  onClick={handleChooseBlank}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[200px] gap-3">
                    <motion.div
                      className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"
                      whileHover={{ rotate: 90, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Plus className="w-7 h-7 text-primary" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-base">Blank Survey</h3>
                      <p className="text-xs text-muted-foreground mt-1">Start fresh with a clean canvas</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Custom</Badge>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Templates */}
              {SURVEY_TEMPLATES.map((template) => {
                const Icon = TEMPLATE_ICONS[template.id] || FileText;
                const catDef = SURVEY_CATEGORIES.find((c) => c.value === template.category);
                return (
                  <motion.div key={template.id} variants={itemVariants}>
                    <Card
                      className="group border-border hover:border-primary/40 cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/5 h-full"
                      onClick={() => handleChooseTemplate(template)}
                    >
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-3">
                          <motion.div
                            className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"
                            whileHover={{ scale: 1.12, rotate: -5 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            <Icon className="w-5 h-5 text-primary" />
                          </motion.div>
                          {catDef && <Badge variant="secondary" className="text-[10px]">{catDef.label}</Badge>}
                        </div>
                        <h3 className="font-semibold text-sm mb-1">{template.title}</h3>
                        <p className="text-xs text-muted-foreground flex-1 mb-3">{template.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Zap className="w-3 h-3" /> {template.questions.length} questions ready
                          </span>
                          <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        )}

        {step === "audience" && (
          <motion.div
            key="audience"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Selected template summary */}
            {selectedTemplate && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    {(() => { const Icon = TEMPLATE_ICONS[selectedTemplate.id] || FileText; return <Icon className="w-5 h-5 text-primary" />; })()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{selectedTemplate.title}</h3>
                    <p className="text-xs text-muted-foreground">{selectedTemplate.questions.length} pre-built questions</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep("choose")} className="text-xs">
                    <ArrowLeft className="w-3 h-3 mr-1" /> Change
                  </Button>
                </CardContent>
              </Card>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-3">Who is this survey for?</h3>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 lg:grid-cols-4 gap-3"
              >
                {AUDIENCE_TYPES.map((aud) => {
                  const isSelected = selectedAudience === aud.value;
                  return (
                    <motion.div key={aud.value} variants={itemVariants}>
                      <Card
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                            : "border-border hover:border-primary/30"
                        }`}
                        onClick={() => setSelectedAudience(aud.value)}
                      >
                        <CardContent className="p-4 text-center">
                          <motion.div
                            animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.3 }}
                            className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                              isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            <Users className="w-5 h-5" />
                          </motion.div>
                          <p className="text-sm font-medium">{aud.label}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("choose")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={handleConfirm} className="gap-1.5">
                {selectedTemplate ? "Use Template" : "Create Blank"} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SurveyCreationWizard;
