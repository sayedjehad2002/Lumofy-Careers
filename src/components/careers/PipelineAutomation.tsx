import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Plus, Pencil, Trash2, Play, Pause, RotateCcw,
  ChevronRight, Loader2, Clock, ArrowRight, AlertTriangle,
  CheckCircle2, FileText, Flag, History, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Job } from "@/types/careers";

interface PipelineRule {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  condition_type: string;
  condition_operator: string;
  condition_value: string;
  condition_stage: string | null;
  condition_job_id: string | null;
  action_type: string;
  action_value: string;
  last_run_at: string | null;
  last_run_affected: number;
  total_affected: number;
  created_at: string;
}

interface AutomationLog {
  id: string;
  rule_id: string;
  applicant_id: string;
  action_taken: string;
  details: { rule_name?: string; applicant_name?: string; previous_status?: string };
  created_at: string;
}

const CONDITION_TYPES = [
  { value: "ai_score", label: "AI Fit Score", icon: Sparkles, description: "Based on the AI analysis fit score (0-100)" },
  { value: "days_in_stage", label: "Days in Current Stage", icon: Clock, description: "How long the candidate has been in their current stage" },
  { value: "missing_rating", label: "Missing AI Analysis", icon: AlertTriangle, description: "Candidates without AI analysis" },
];

const OPERATORS = [
  { value: "gte", label: "≥ (greater than or equal)" },
  { value: "gt", label: "> (greater than)" },
  { value: "lte", label: "≤ (less than or equal)" },
  { value: "lt", label: "< (less than)" },
  { value: "eq", label: "= (equals)" },
];

const STAGES = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "rejected", label: "Rejected" },
  { value: "hired", label: "Hired" },
];

const ACTION_TYPES = [
  { value: "move_stage", label: "Move to Stage", icon: ArrowRight, color: "text-primary" },
  { value: "add_note", label: "Add Note", icon: FileText, color: "text-amber-500" },
  { value: "flag", label: "Flag Candidate", icon: Flag, color: "text-destructive" },
];

const EMPTY_RULE = {
  name: "",
  description: "",
  is_active: true,
  condition_type: "ai_score",
  condition_operator: "gte",
  condition_value: "80",
  condition_stage: null as string | null,
  condition_job_id: null as string | null,
  action_type: "move_stage",
  action_value: "shortlisted",
};

interface PipelineAutomationProps {
  sessionToken: string;
  jobs: Job[];
}

const PipelineAutomation = ({ sessionToken, jobs }: PipelineAutomationProps) => {
  const [rules, setRules] = useState<PipelineRule[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PipelineRule | null>(null);
  const [formData, setFormData] = useState(EMPTY_RULE);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PipelineRule | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pipeline-automation`;

  const fetchData = useCallback(async () => {
    try {
      const [rulesRes, logsRes] = await Promise.all([
        fetch(`${baseUrl}?action=list`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, "x-session-token": sessionToken },
          body: JSON.stringify({}),
        }),
        fetch(`${baseUrl}?action=logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, "x-session-token": sessionToken },
          body: JSON.stringify({ limit: 50 }),
        }),
      ]);

      if (rulesRes.ok) {
        const d = await rulesRes.json();
        setRules(d.rules || []);
      }
      if (logsRes.ok) {
        const d = await logsRes.json();
        setLogs(d.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch automation data:", err);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, sessionToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Rule name is required");
      return;
    }
    setSaving(true);
    try {
      const action = editingRule ? "update" : "create";
      const rule = editingRule ? { ...formData, id: editingRule.id } : formData;
      const res = await fetch(`${baseUrl}?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, "x-session-token": sessionToken },
        body: JSON.stringify({ rule }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(editingRule ? "Rule updated" : "Rule created");
      setFormOpen(false);
      setEditingRule(null);
      setFormData(EMPTY_RULE);
      fetchData();
    } catch {
      toast.error("Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`${baseUrl}?action=delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, "x-session-token": sessionToken },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      toast.success("Rule deleted");
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleToggle = async (rule: PipelineRule) => {
    try {
      await fetch(`${baseUrl}?action=toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, "x-session-token": sessionToken },
        body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
      });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
    } catch {
      toast.error("Failed to toggle rule");
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const res = await fetch(`${baseUrl}?action=evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to run");
      const data = await res.json();
      toast.success(`Evaluated ${data.evaluated} rules, ${data.affected} candidates affected`);
      fetchData();
    } catch {
      toast.error("Failed to run automation");
    } finally {
      setRunning(false);
    }
  };

  const openEdit = (rule: PipelineRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description,
      is_active: rule.is_active,
      condition_type: rule.condition_type,
      condition_operator: rule.condition_operator,
      condition_value: rule.condition_value,
      condition_stage: rule.condition_stage,
      condition_job_id: rule.condition_job_id,
      action_type: rule.action_type,
      action_value: rule.action_value,
    });
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditingRule(null);
    setFormData(EMPTY_RULE);
    setFormOpen(true);
  };

  const getConditionLabel = (rule: PipelineRule) => {
    const ct = CONDITION_TYPES.find(c => c.value === rule.condition_type);
    const op = OPERATORS.find(o => o.value === rule.condition_operator);
    if (rule.condition_type === "missing_rating") return "Missing AI Analysis";
    return `${ct?.label || rule.condition_type} ${op?.label?.split(" ")[0] || rule.condition_operator} ${rule.condition_value}`;
  };

  const getActionLabel = (rule: PipelineRule) => {
    const at = ACTION_TYPES.find(a => a.value === rule.action_type);
    if (rule.action_type === "move_stage") {
      const stage = STAGES.find(s => s.value === rule.action_value);
      return `Move to ${stage?.label || rule.action_value}`;
    }
    return `${at?.label || rule.action_type}: ${rule.action_value}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pipeline Automation</h1>
            <p className="text-sm text-muted-foreground">
              {rules.length} rule{rules.length !== 1 ? "s" : ""} · {rules.filter(r => r.is_active).length} active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowLogs(!showLogs)}>
            <History className="w-4 h-4 mr-1.5" />
            {showLogs ? "Hide" : "View"} Logs
          </Button>
          <Button variant="outline" size="sm" onClick={handleRunNow} disabled={running || rules.filter(r => r.is_active).length === 0}>
            {running ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
            Run Now
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <Card className="border-dashed bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Zap className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">No Automation Rules Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Create rules to automatically move candidates, add notes, or flag profiles based on AI scores, time in stage, and more.
              </p>
            </div>
            <Button onClick={openCreate} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Card className={`transition-all duration-200 ${rule.is_active ? "border-border" : "border-border/50 opacity-60"}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => handleToggle(rule)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{rule.name}</h3>
                        {rule.is_active ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[10px]">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Paused</Badge>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-xs text-muted-foreground mb-2">{rule.description}</p>
                      )}

                      {/* Rule visualization */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium">
                          IF {getConditionLabel(rule)}
                        </span>
                        {rule.condition_stage && (
                          <span className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground font-medium">
                            in {STAGES.find(s => s.value === rule.condition_stage)?.label || rule.condition_stage}
                          </span>
                        )}
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                          THEN {getActionLabel(rule)}
                        </span>
                      </div>

                      {/* Stats */}
                      {rule.last_run_at && (
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                          <span>Last run: {new Date(rule.last_run_at).toLocaleString()}</span>
                          <span>Last affected: {rule.last_run_affected}</span>
                          <span>Total affected: {rule.total_affected}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rule)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(rule)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Logs */}
      <AnimatePresence>
        {showLogs && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Automation Log
                </CardTitle>
                <CardDescription>Recent automated actions taken on candidates</CardDescription>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No automation actions logged yet.</p>
                ) : (
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2">
                      {logs.map(log => (
                        <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{log.details?.applicant_name || log.applicant_id}</span>
                            <span className="text-muted-foreground"> — {log.action_taken.replace(":", ": ")}</span>
                            {log.details?.rule_name && (
                              <span className="text-muted-foreground"> (Rule: {log.details.rule_name})</span>
                            )}
                          </div>
                          <span className="text-muted-foreground shrink-0">
                            {new Date(log.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { setFormOpen(false); setEditingRule(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Create Automation Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Name & Description */}
            <div className="space-y-3">
              <div>
                <Label>Rule Name *</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Auto-shortlist high scorers"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Optional description of what this rule does"
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            {/* Condition */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">IF</span>
                Condition
              </h4>
              <div>
                <Label>Condition Type</Label>
                <Select value={formData.condition_type} onValueChange={v => setFormData(p => ({ ...p, condition_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITION_TYPES.map(ct => (
                      <SelectItem key={ct.value} value={ct.value}>
                        <div className="flex items-center gap-2">
                          <ct.icon className="w-3.5 h-3.5" />
                          {ct.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {CONDITION_TYPES.find(c => c.value === formData.condition_type)?.description}
                </p>
              </div>

              {formData.condition_type !== "missing_rating" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Operator</Label>
                    <Select value={formData.condition_operator} onValueChange={v => setFormData(p => ({ ...p, condition_operator: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map(op => (
                          <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Value</Label>
                    <Input
                      value={formData.condition_value}
                      onChange={e => setFormData(p => ({ ...p, condition_value: e.target.value }))}
                      placeholder={formData.condition_type === "ai_score" ? "80" : "7"}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Scope filters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Only in Stage (optional)</Label>
                  <Select value={formData.condition_stage || "__any__"} onValueChange={v => setFormData(p => ({ ...p, condition_stage: v === "__any__" ? null : v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">Any Stage</SelectItem>
                      {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Only for Job (optional)</Label>
                  <Select value={formData.condition_job_id || "__any__"} onValueChange={v => setFormData(p => ({ ...p, condition_job_id: v === "__any__" ? null : v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">All Jobs</SelectItem>
                      {jobs.filter(j => j.status === "open").map(j => (
                        <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Action */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500 text-[10px] font-bold">→</span>
                Action
              </h4>
              <div>
                <Label>Action Type</Label>
                <Select value={formData.action_type} onValueChange={v => setFormData(p => ({ ...p, action_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map(at => (
                      <SelectItem key={at.value} value={at.value}>
                        <div className="flex items-center gap-2">
                          <at.icon className={`w-3.5 h-3.5 ${at.color}`} />
                          {at.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.action_type === "move_stage" ? (
                <div>
                  <Label>Target Stage</Label>
                  <Select value={formData.action_value} onValueChange={v => setFormData(p => ({ ...p, action_value: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>{formData.action_type === "add_note" ? "Note Text" : "Flag Reason"}</Label>
                  <Textarea
                    value={formData.action_value}
                    onChange={e => setFormData(p => ({ ...p, action_value: e.target.value }))}
                    placeholder={formData.action_type === "add_note" ? "Auto-generated note text..." : "Reason for flagging..."}
                    rows={2}
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Rule Preview:</p>
              <p className="text-sm">
                <span className="text-primary font-medium">IF</span>{" "}
                {formData.condition_type === "missing_rating" ? "Missing AI Analysis" : `${CONDITION_TYPES.find(c => c.value === formData.condition_type)?.label} ${OPERATORS.find(o => o.value === formData.condition_operator)?.label?.split(" ")[0]} ${formData.condition_value}`}
                {formData.condition_stage && <span className="text-muted-foreground"> in {STAGES.find(s => s.value === formData.condition_stage)?.label}</span>}
                {" "}<span className="text-amber-500 font-medium">THEN</span>{" "}
                {formData.action_type === "move_stage" ? `Move to ${STAGES.find(s => s.value === formData.action_value)?.label}` : `${ACTION_TYPES.find(a => a.value === formData.action_type)?.label}`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              {editingRule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will also remove all related automation logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PipelineAutomation;
