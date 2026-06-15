import { useState, useEffect } from "react";
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
  { type: "interview_invite", label: "Interview invite", icon: <Calendar className="w-3.5 h-3.5" aria-hidden="true" />, color: "bg-primary/10 text-primary" },
  { type: "offer", label: "Offer letter", icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />, color: TONE_SOFT.success },
  { type: "rejection", label: "Rejection", icon: <XCircle className="w-3.5 h-3.5" aria-hidden="true" />, color: TONE_SOFT.danger },
  { type: "follow_up", label: "Follow up", icon: <Mail className="w-3.5 h-3.5" aria-hidden="true" />, color: TONE_SOFT.warning },
];

function generateTemplate(type: TemplateType, applicant: Applicant, job: Job | undefined): { subject: string; body: string } {
  const name = applicant.fullName.split(" ")[0];
  const jobTitle = job?.title || "the position";
  const company = "Lumofy";

  switch (type) {
    case "interview_invite":
      return {
        subject: `Let's talk, ${name} - your ${jobTitle} application at ${company}`,
        body: `Hi ${name},\n\nYour application for the ${jobTitle} role stood out to us, and we'd genuinely love to get to know you.\n\nWe'd like to start with a friendly intro call - a real conversation, not an interrogation. We want to hear what you care about and what you're looking for next, and to share where ${company} is headed.\n\nA little about us: ${company} is an AI-powered, skills-first platform built in Bahrain for the MENA region - an intelligence layer connecting performance, goals, skills, and learning, with 100+ organizations already building with us. Join us and you'd own real work from day one, learn fast, and have genuine regional impact.\n\nWe've proposed a time in this invite. If another moment suits you better, just let us know - we're flexible and happy to find what works.\n\nCan't wait to meet you.\n\nWarmly,\nPeople & Culture Team\n${company}`,
      };
    case "offer":
      return {
        subject: `We'd love for you to join us, ${name} - your ${jobTitle} offer from ${company}`,
        body: `Hi ${name},\n\nIt's our pleasure to offer you the ${jobTitle} role at ${company}. From our very first conversation, it was clear how much you'd add to the team - and we'd be thrilled to have you with us.\n\nAt ${company}, you'll help build the intelligence layer that connects performance, skills, and learning for organizations across MENA - work already trusted by 100+ organizations and just getting started. You'd be part of it from day one, with real ownership, the freedom to build fast, continuous learning, mentorship, and a clear path to grow.\n\nThe formal details are attached. Please take the time you need to read everything, and reach out with any question at all - big or small. We're here, and we'd love to talk it through.\n\nWe really hope you'll say yes.\n\nWarmly,\nThe ${company} Team`,
      };
    case "rejection":
      return {
        subject: `Thank you, ${name} - an update on your ${jobTitle} application`,
        body: `Hi ${name},\n\nThank you for the time and care you put into applying for the ${jobTitle} role at ${company}, and for letting us get to know you.\n\nAfter much thought, we've decided to move forward with another candidate for this role. It was a genuinely hard decision and no reflection of your talent - we simply had an exceptional pool this time.\n\nThis isn't a no for the future. We're growing quickly across MENA and new roles open often, so we'd warmly welcome your application when the timing is right.\n\nWishing you real success in your search - we're rooting for you.\n\nWarmly,\nPeople & Culture Team\n${company}`,
      };
    case "follow_up":
      return {
        subject: `Just checking in, ${name} - your ${jobTitle} conversation with ${company}`,
        body: `Hi ${name},\n\nI wanted to drop you a quick, friendly note - you've been on our minds since we last spoke about the ${jobTitle} role.\n\nWe know decisions like this matter, and we don't want you waiting in the dark. Things are moving on our side, and we'll have a clear update for you very soon.\n\nIn the meantime, if anything's come up or you'd simply like to talk something through, just reply here - we're always happy to.\n\nThank you for your patience, and for your interest in ${company}.\n\nWarmly,\nPeople & Culture Team\n${company}`,
      };
  }
}

const EmailTemplates = ({ applicant, job }: EmailTemplatesProps) => {
  const [selectedType, setSelectedType] = useState<TemplateType>("interview_invite");
  const [subject, setSubject] = useState(() => generateTemplate("interview_invite", applicant, job).subject);
  const [body, setBody] = useState(() => generateTemplate("interview_invite", applicant, job).body);

  // Regenerate the draft when the candidate changes (e.g. navigating between profiles).
  useEffect(() => {
    const t = generateTemplate(selectedType, applicant, job);
    setSubject(t.subject);
    setBody(t.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicant.id]);

  const handleSelectTemplate = (type: TemplateType) => {
    setSelectedType(type);
    const t = generateTemplate(type, applicant, job);
    setSubject(t.subject);
    setBody(t.body);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)
      .then(() => toast.success("Email copied to clipboard"))
      .catch(() => toast.error("Couldn't copy to clipboard"));
  };

  const handleMailTo = () => {
    // Outlook honors CRLF (%0D%0A) line breaks; a bare \n collapses the draft into
    // one block, which is what made it look unorganized. Send CRLF so the formal
    // paragraph structure survives into the mail client.
    const crlfBody = body.replace(/\r?\n/g, "\r\n");
    window.location.href = `mailto:${applicant.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(crlfBody)}`;
  };

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
              Open in mail client
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopy} className="text-xs h-9 rounded-xl">
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy to clipboard
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailTemplates;
