import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Copy, Send, FileText, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import type { Applicant, Job } from "@/types/careers";
import { TONE_SOFT } from "@/components/careers/statusColors";

interface EmailTemplatesProps {
  applicant: Applicant;
  job: Job | undefined;
}

type TemplateType = "rejection" | "interview_invite" | "offer" | "follow_up";

const TEMPLATES: { type: TemplateType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: "interview_invite", label: "Interview Invite", icon: <Calendar className="w-3.5 h-3.5" aria-hidden="true" />, color: "bg-primary/10 text-primary" },
  { type: "offer", label: "Offer Letter", icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />, color: TONE_SOFT.success },
  { type: "rejection", label: "Rejection", icon: <XCircle className="w-3.5 h-3.5" aria-hidden="true" />, color: TONE_SOFT.danger },
  { type: "follow_up", label: "Follow Up", icon: <Mail className="w-3.5 h-3.5" aria-hidden="true" />, color: TONE_SOFT.warning },
];

function generateTemplate(type: TemplateType, applicant: Applicant, job: Job | undefined): { subject: string; body: string } {
  const name = applicant.fullName.split(" ")[0];
  const jobTitle = job?.title || "the position";
  const company = "Lumofy";

  switch (type) {
    case "interview_invite":
      return {
        subject: `Interview Invitation – ${jobTitle} at ${company}`,
        body: `Dear ${name},\n\nThank you for your application for the ${jobTitle} position at ${company}. We were impressed with your background and would like to invite you for an interview.\n\nPlease let us know your availability for the coming week, and we'll arrange a suitable time.\n\nWe look forward to speaking with you.\n\nBest regards,\nTalent Acquisition Team\n${company}`,
      };
    case "offer":
      return {
        subject: `Offer of Employment – ${jobTitle} at ${company}`,
        body: `Dear ${name},\n\nWe are pleased to offer you the position of ${jobTitle} at ${company}. After careful consideration, we believe your skills and experience make you an excellent fit for our team.\n\nPlease find the formal offer details attached. We kindly request your response within 5 business days.\n\nWelcome aboard!\n\nBest regards,\nHR Department\n${company}`,
      };
    case "rejection":
      return {
        subject: `Application Update – ${jobTitle} at ${company}`,
        body: `Dear ${name},\n\nThank you for your interest in the ${jobTitle} position at ${company} and for taking the time to apply.\n\nAfter careful review, we have decided to move forward with other candidates whose qualifications more closely match our current needs.\n\nWe appreciate your interest in ${company} and encourage you to apply for future openings that match your profile.\n\nWe wish you the best in your career journey.\n\nBest regards,\nTalent Acquisition Team\n${company}`,
      };
    case "follow_up":
      return {
        subject: `Following Up – ${jobTitle} Application`,
        body: `Dear ${name},\n\nI hope this message finds you well. I wanted to follow up regarding your application for the ${jobTitle} position at ${company}.\n\nWe are still in the review process and expect to have an update for you shortly. Thank you for your patience.\n\nPlease don't hesitate to reach out if you have any questions.\n\nBest regards,\nTalent Acquisition Team\n${company}`,
      };
  }
}

const EmailTemplates = ({ applicant, job }: EmailTemplatesProps) => {
  const [selectedType, setSelectedType] = useState<TemplateType>("interview_invite");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [initialized, setInitialized] = useState(false);

  const template = useMemo(() => generateTemplate(selectedType, applicant, job), [selectedType, applicant, job]);

  if (!initialized || subject === generateTemplate(
    TEMPLATES.find(t => t.type !== selectedType)?.type || "interview_invite", applicant, job
  ).subject) {
    // Auto-fill on first render or type change
  }

  const handleSelectTemplate = (type: TemplateType) => {
    setSelectedType(type);
    const t = generateTemplate(type, applicant, job);
    setSubject(t.subject);
    setBody(t.body);
    setInitialized(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    toast.success("Email copied to clipboard");
  };

  const handleMailTo = () => {
    const mailto = `mailto:${applicant.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto);
  };

  // Initialize on first render
  if (!initialized) {
    handleSelectTemplate("interview_invite");
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          Quick Email
        </CardTitle>
        <CardDescription className="ml-[42px] text-xs">
          Send to {applicant.email}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Template Picker */}
          <div className="flex gap-2 flex-wrap">
            {TEMPLATES.map(t => (
              <Button
                key={t.type}
                size="sm"
                variant={selectedType === t.type ? "default" : "outline"}
                className="h-8 text-xs rounded-xl"
                onClick={() => handleSelectTemplate(t.type)}
              >
                {t.icon}
                <span className="ml-1.5">{t.label}</span>
              </Button>
            ))}
          </div>

          {/* Subject */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-sm rounded-xl"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">Body</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="text-sm rounded-xl resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleMailTo} className="text-xs h-9 rounded-xl">
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Open in Mail Client
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopy} className="text-xs h-9 rounded-xl">
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy to Clipboard
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailTemplates;
