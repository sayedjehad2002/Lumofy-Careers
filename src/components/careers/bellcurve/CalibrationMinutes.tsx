import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  FileText, Download, Plus, Trash2, Clock, Users, Flag, Award, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface CalibrationMinutesProps {
  kpis: { totalReviewed: number; avgRating: number; highPerfPct: number; lowPerfPct: number };
  healthScore: number;
  managerFlags: { name: string; flag: string }[];
}

interface ActionItem {
  id: string;
  type: "pip" | "promotion" | "calibration" | "note";
  employee: string;
  description: string;
  owner: string;
  timestamp: number;
}

const ACTION_TYPES = {
  pip: { label: "PIP Flag", icon: Flag, color: "text-destructive", bg: "bg-destructive/10" },
  promotion: { label: "Promotion", icon: Award, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  calibration: { label: "Calibration Review", icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
  note: { label: "General Note", icon: FileText, color: "text-primary", bg: "bg-primary/10" },
};

const CalibrationMinutes = ({ kpis, healthScore, managerFlags }: CalibrationMinutesProps) => {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [sessionTitle, setSessionTitle] = useState(`Calibration Session — ${new Date().toLocaleDateString()}`);
  const [notes, setNotes] = useState("");
  const [newAction, setNewAction] = useState({ type: "note" as ActionItem["type"], employee: "", description: "", owner: "" });

  const addAction = () => {
    if (!newAction.description) return;
    setActions(prev => [...prev, {
      id: `${Date.now()}`,
      ...newAction,
      timestamp: Date.now(),
    }]);
    setNewAction({ type: "note", employee: "", description: "", owner: "" });
    toast.success("Action item added");
  };

  const removeAction = (id: string) => {
    setActions(prev => prev.filter(a => a.id !== id));
  };

  const exportMinutesPDF = useCallback(() => {
    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, w, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Calibration Meeting Minutes", 14, 18);
    doc.setFontSize(10);
    doc.text(sessionTitle, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleString()}`, w - 14, 28, { align: "right" });

    y = 45;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.text("Session Summary", 14, y);
    y += 8;
    doc.setFontSize(9);
    doc.text(`Employees Reviewed: ${kpis.totalReviewed}`, 14, y); y += 5;
    doc.text(`Average Rating: ${kpis.avgRating.toFixed(2)}`, 14, y); y += 5;
    doc.text(`High Performers: ${kpis.highPerfPct}%`, 14, y); y += 5;
    doc.text(`Low Performers: ${kpis.lowPerfPct}%`, 14, y); y += 5;
    doc.text(`Calibration Health Score: ${healthScore}/100`, 14, y); y += 10;

    if (notes) {
      doc.setFontSize(12);
      doc.text("Session Notes", 14, y); y += 7;
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(notes, w - 28);
      doc.text(lines, 14, y);
      y += lines.length * 4.5 + 8;
    }

    if (managerFlags.filter(m => m.flag !== "Balanced").length > 0) {
      doc.setFontSize(12);
      doc.text("Manager Flags", 14, y); y += 7;
      doc.setFontSize(9);
      managerFlags.filter(m => m.flag !== "Balanced").forEach(m => {
        doc.text(`• ${m.name}: ${m.flag}`, 18, y); y += 5;
      });
      y += 5;
    }

    if (actions.length > 0) {
      doc.setFontSize(12);
      doc.text(`Action Items (${actions.length})`, 14, y); y += 8;
      doc.setFontSize(9);
      actions.forEach((a, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const typeInfo = ACTION_TYPES[a.type];
        doc.text(`${i + 1}. [${typeInfo.label}] ${a.employee ? a.employee + " — " : ""}${a.description}`, 18, y);
        y += 5;
        if (a.owner) {
          doc.setTextColor(100, 100, 100);
          doc.text(`   Owner: ${a.owner}`, 18, y); y += 5;
          doc.setTextColor(30, 30, 30);
        }
      });
    }

    // Footer
    const pages = doc.internal.pages.length - 1;
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("CONFIDENTIAL — Calibration Meeting Minutes — Lumofy HR", 14, 290);
      doc.text(`Page ${i}/${pages}`, w - 14, 290, { align: "right" });
    }

    doc.save(`calibration-minutes-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Meeting minutes exported as PDF");
  }, [sessionTitle, kpis, healthScore, managerFlags, notes, actions]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Session header */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <Input
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto text-sm font-semibold focus-visible:ring-0"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {new Date().toLocaleDateString()} · {actions.length} action items
                </p>
              </div>
            </div>
            <Button size="sm" onClick={exportMinutesPDF} className="h-9 text-xs">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session notes */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Session Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key discussion points, decisions made, disagreements resolved..."
            className="min-h-[100px] text-xs resize-none"
          />
        </CardContent>
      </Card>

      {/* Add action item */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Add Action Item</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1 block">Type</label>
              <select
                value={newAction.type}
                onChange={(e) => setNewAction(prev => ({ ...prev, type: e.target.value as ActionItem["type"] }))}
                className="w-full h-9 text-xs rounded-md border border-input bg-background px-3"
              >
                {Object.entries(ACTION_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1 block">Employee</label>
              <Input
                value={newAction.employee}
                onChange={(e) => setNewAction(prev => ({ ...prev, employee: e.target.value }))}
                placeholder="Employee name"
                className="h-9 text-xs"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1 block">Description</label>
              <Input
                value={newAction.description}
                onChange={(e) => setNewAction(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Action description..."
                className="h-9 text-xs"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1 block">Owner</label>
                <Input
                  value={newAction.owner}
                  onChange={(e) => setNewAction(prev => ({ ...prev, owner: e.target.value }))}
                  placeholder="Assigned to"
                  className="h-9 text-xs"
                />
              </div>
              <Button size="sm" onClick={addAction} disabled={!newAction.description} className="h-9">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action items list */}
      {actions.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Action Items ({actions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {actions.map((action, i) => {
                const typeInfo = ACTION_TYPES[action.type];
                const Icon = typeInfo.icon;
                return (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${typeInfo.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[9px] py-0 border-0 bg-muted/50">{typeInfo.label}</Badge>
                        {action.employee && <span className="text-xs font-semibold">{action.employee}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                      {action.owner && <p className="text-[10px] text-muted-foreground mt-0.5">Owner: {action.owner}</p>}
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeAction(action.id)}>
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default CalibrationMinutes;
