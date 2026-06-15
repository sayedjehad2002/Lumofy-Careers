import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock, CalendarPlus, Download } from "lucide-react";
import { toast } from "sonner";
import type { Applicant, Job } from "@/types/careers";

interface ScheduleMeetingProps {
  applicant: Applicant;
  job: Job | undefined;
}

const DEFAULT_DURATION = 30;

// Tomorrow at 10:00 local, formatted for a <input type="datetime-local">.
function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Local datetime-local string -> UTC iCalendar stamp (YYYYMMDDTHHMMSSZ).
function toIcsUtc(dtLocal: string): string {
  return new Date(dtLocal).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

// Escape text for an iCalendar property value (commas, semicolons, backslashes, newlines).
function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

const ScheduleMeeting = ({ applicant, job }: ScheduleMeetingProps) => {
  const firstName = applicant.fullName.split(" ")[0] || applicant.fullName;
  const jobTitle = job?.title || applicant.jobTitle || "the position";
  const company = "Lumofy";

  const [start, setStart] = useState(defaultStart);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [subject, setSubject] = useState(`Interview – ${jobTitle} at ${company}`);
  const [body, setBody] = useState(
    `Hi ${firstName},\n\nWe'd like to schedule a meeting to discuss your application for the ${jobTitle} position at ${company}.\n\nPlease join us at the proposed time below. If it doesn't suit you, reply with a couple of slots that do.\n\nBest regards,\nTalent Acquisition Team\n${company}`,
  );

  const hasEmail = !!applicant.email;
  const endDate = new Date(new Date(start).getTime() + duration * 60_000);
  const prettyWhen = new Date(start).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });

  // Local "YYYY-MM-DDTHH:mm:ss" (Outlook reads deeplink times in the user's calendar tz).
  const fmtLocal = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
  };

  const openOutlookWeb = () => {
    if (!hasEmail) return;
    const params = new URLSearchParams({
      path: "/calendar/action/compose",
      rru: "addevent",
      subject,
      body,
      to: applicant.email,
      startdt: `${start}:00`,
      enddt: fmtLocal(endDate),
    });
    window.open(`https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`, "_blank", "noopener");
  };

  const downloadIcs = () => {
    if (!hasEmail) return;
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const uid = `${applicant.id}-${Date.now()}@lumofy`;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Lumofy//Careers//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toIcsUtc(start)}`,
      `DTEND:${toIcsUtc(endDate.toISOString())}`,
      `SUMMARY:${icsEscape(subject)}`,
      `DESCRIPTION:${icsEscape(body)}`,
      `ORGANIZER;CN=${company} Talent Team:mailto:talent@lumofy.ai`,
      `ATTENDEE;CN=${icsEscape(applicant.fullName)};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${applicant.email}`,
      "LOCATION:Online",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meeting-${applicant.fullName.replace(/\s+/g, "-").toLowerCase()}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Invite downloaded — open it to add the meeting in Outlook");
  };

  return (
    <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.07 }}>
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarClock className="w-4 h-4 text-primary" aria-hidden="true" />
            </div>
            Schedule Meeting
          </CardTitle>
          <CardDescription className="ml-[42px] text-xs">
            {hasEmail ? <>Invites {applicant.email}</> : "Add the candidate's email to schedule"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">When</label>
                <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="text-sm rounded-xl" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  aria-label="Meeting duration"
                >
                  {[15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="text-sm rounded-xl" />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">Message</label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="text-sm rounded-xl resize-none" />
            </div>

            <p className="text-[11px] text-muted-foreground">Proposed: <span className="font-medium text-foreground">{prettyWhen}</span> · {duration} min</p>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={openOutlookWeb} disabled={!hasEmail} className="text-xs h-9 rounded-xl">
                <CalendarPlus className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                Schedule in Outlook
              </Button>
              <Button size="sm" variant="outline" onClick={downloadIcs} disabled={!hasEmail} className="text-xs h-9 rounded-xl">
                <Download className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                Download invite (.ics)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ScheduleMeeting;
