import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Send, Clock, Users, CheckCircle2, AlertCircle, Plus, Trash2, Eye, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Survey } from "@/types/surveys";

interface Campaign {
  id: string;
  name: string;
  survey_id: string;
  recipients: string[];
  subject: string;
  body: string;
  status: "draft" | "scheduled" | "sent";
  scheduled_at: string | null;
  reminder_enabled: boolean;
  reminder_days: number;
  stats: { sent: number; opened: number; clicked: number; completed: number };
  created_at: string;
}

const STORAGE_KEY = "survey_email_campaigns";

function loadCampaigns(): Campaign[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveCampaigns(c: Campaign[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

interface Props {
  surveys: Survey[];
}

const EmailCampaign = ({ surveys }: Props) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>(loadCampaigns);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", survey_id: "", subject: "", body: "",
    recipients: "", reminder_enabled: false, reminder_days: 3,
    scheduled_at: "",
  });

  const handleCreate = () => {
    if (!form.name || !form.survey_id || !form.recipients.trim()) {
      toast.error("Fill in campaign name, survey, and recipients");
      return;
    }
    const emails = form.recipients.split(/[,;\n]/).map(e => e.trim()).filter(Boolean);
    const campaign: Campaign = {
      id: crypto.randomUUID(),
      name: form.name,
      survey_id: form.survey_id,
      recipients: emails,
      subject: form.subject || `You're invited to take a survey`,
      body: form.body || "We'd love to hear your feedback. Please take a few minutes to complete this survey.",
      status: form.scheduled_at ? "scheduled" : "draft",
      scheduled_at: form.scheduled_at || null,
      reminder_enabled: form.reminder_enabled,
      reminder_days: form.reminder_days,
      stats: { sent: 0, opened: 0, clicked: 0, completed: 0 },
      created_at: new Date().toISOString(),
    };
    const next = [campaign, ...campaigns];
    setCampaigns(next);
    saveCampaigns(next);
    setCreateOpen(false);
    setForm({ name: "", survey_id: "", subject: "", body: "", recipients: "", reminder_enabled: false, reminder_days: 3, scheduled_at: "" });
    toast.success("Campaign created");
  };

  const handleSend = (id: string) => {
    const next = campaigns.map(c => {
      if (c.id !== id) return c;
      return { ...c, status: "sent" as const, stats: { ...c.stats, sent: c.recipients.length } };
    });
    setCampaigns(next);
    saveCampaigns(next);
    toast.success("Campaign sent! (simulated — email delivery requires integration)");
  };

  const handleDelete = (id: string) => {
    const next = campaigns.filter(c => c.id !== id);
    setCampaigns(next);
    saveCampaigns(next);
    toast.success("Campaign deleted");
  };

  const publishedSurveys = surveys.filter(s => s.status === "published");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> Email Campaigns
          </h3>
          <p className="text-sm text-muted-foreground">Send surveys via email with tracking and automated reminders</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Campaigns", value: campaigns.length, icon: Mail },
          { label: "Emails Sent", value: campaigns.reduce((s, c) => s + c.stats.sent, 0), icon: Send },
          { label: "Avg Open Rate", value: campaigns.length > 0 ? "—" : "—", icon: Eye },
          { label: "Avg Completion", value: campaigns.length > 0 ? "—" : "—", icon: CheckCircle2 },
        ].map((stat, i) => (
          <Card key={stat.label}>
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-secondary">
                <stat.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                <p className="text-base font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign List */}
      {campaigns.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No campaigns yet. Create one to start distributing surveys.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c, i) => {
            const survey = surveys.find(s => s.id === c.survey_id);
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="border-border hover:border-primary/20 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{c.name}</h4>
                          <Badge variant={c.status === "sent" ? "default" : c.status === "scheduled" ? "secondary" : "outline"} className="text-[10px]">
                            {c.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{survey?.title || "Unknown survey"}</span>
                          <span>{c.recipients.length} recipients</span>
                          {c.status === "sent" && (
                            <span className="flex items-center gap-1">
                              <Send className="w-3 h-3" /> {c.stats.sent} sent
                            </span>
                          )}
                          {c.reminder_enabled && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Reminder in {c.reminder_days}d
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {c.status === "draft" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleSend(c.id)}>
                            <Send className="w-3 h-3 mr-1" /> Send
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Email Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Campaign Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 h-9" placeholder="Q1 Engagement Survey Rollout" />
            </div>
            <div>
              <Label className="text-xs">Survey *</Label>
              <Select value={form.survey_id} onValueChange={(v) => setForm({ ...form, survey_id: v })}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select published survey" /></SelectTrigger>
                <SelectContent>
                  {publishedSurveys.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Recipients (emails, comma or line-separated) *</Label>
              <Textarea value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} className="mt-1" rows={3} placeholder="john@company.com, jane@company.com" />
            </div>
            <div>
              <Label className="text-xs">Email Subject</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="mt-1 h-9" placeholder="You're invited to take a survey" />
            </div>
            <div>
              <Label className="text-xs">Email Body</Label>
              <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="mt-1" rows={3} placeholder="We'd love your feedback..." />
            </div>
            <div>
              <Label className="text-xs">Schedule (optional)</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="mt-1 h-9" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Auto-Reminder</Label>
                <p className="text-[10px] text-muted-foreground">Send reminder to non-respondents</p>
              </div>
              <div className="flex items-center gap-2">
                {form.reminder_enabled && (
                  <Input type="number" value={form.reminder_days} onChange={(e) => setForm({ ...form, reminder_days: parseInt(e.target.value) || 3 })} className="w-16 h-7 text-xs" min={1} max={30} />
                )}
                <Switch checked={form.reminder_enabled} onCheckedChange={(v) => setForm({ ...form, reminder_enabled: v })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailCampaign;
