import { motion } from "framer-motion";
import { FileText, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SURVEY_TEMPLATES, SURVEY_CATEGORIES } from "@/types/surveys";
import type { SurveyTemplate } from "@/types/surveys";

interface Props {
  onUseTemplate: (template: SurveyTemplate) => void;
}

const SurveyTemplates = ({ onUseTemplate }: Props) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> Survey Templates
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Start with a pre-built HR survey template and customize it to your needs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SURVEY_TEMPLATES.map((template, i) => {
          const catDef = SURVEY_CATEGORIES.find((c) => c.value === template.category);
          return (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-border hover:border-primary/30 transition-all h-full flex flex-col">
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    {catDef && <Badge variant="secondary" className="text-xs">{catDef.label}</Badge>}
                  </div>
                  <h3 className="font-semibold mb-1">{template.title}</h3>
                  <p className="text-xs text-muted-foreground flex-1 mb-4">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{template.questions.length} questions</span>
                    <Button size="sm" variant="outline" onClick={() => onUseTemplate(template)}>
                      <Copy className="w-3 h-3 mr-1" /> Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SurveyTemplates;
