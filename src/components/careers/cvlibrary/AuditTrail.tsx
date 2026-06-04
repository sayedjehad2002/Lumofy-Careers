import { useMemo, useState } from "react";
import { History, Upload, Download, Pencil, Eye, Brain, Trash2, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface AuditEntry {
  id: string;
  candidateId: string;
  candidateName: string;
  action: "upload" | "download" | "edit" | "view" | "ai_parse" | "ai_analyze" | "delete" | "status_change" | "tag_change";
  details?: string;
  timestamp: string;
}

interface Props {
  entries: AuditEntry[];
}

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  upload: { icon: <Upload className="w-3 h-3" />, color: "bg-emerald-500/20 text-emerald-400", label: "Uploaded" },
  download: { icon: <Download className="w-3 h-3" />, color: "bg-blue-500/20 text-blue-400", label: "Downloaded" },
  edit: { icon: <Pencil className="w-3 h-3" />, color: "bg-yellow-500/20 text-yellow-400", label: "Edited" },
  view: { icon: <Eye className="w-3 h-3" />, color: "bg-secondary text-foreground", label: "Viewed" },
  ai_parse: { icon: <Brain className="w-3 h-3" />, color: "bg-purple-500/20 text-purple-400", label: "AI Parsed" },
  ai_analyze: { icon: <Brain className="w-3 h-3" />, color: "bg-primary/20 text-primary", label: "AI Analyzed" },
  delete: { icon: <Trash2 className="w-3 h-3" />, color: "bg-red-500/20 text-red-400", label: "Deleted" },
  status_change: { icon: <Filter className="w-3 h-3" />, color: "bg-cyan-500/20 text-cyan-400", label: "Status Changed" },
  tag_change: { icon: <Filter className="w-3 h-3" />, color: "bg-pink-500/20 text-pink-400", label: "Tags Updated" },
};

export default function AuditTrail({ entries }: Props) {
  const [filterAction, setFilterAction] = useState("all");

  const filtered = useMemo(() => {
    let result = [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (filterAction !== "all") result = result.filter(e => e.action === filterAction);
    return result.slice(0, 100);
  }, [entries, filterAction]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Audit Trail</h3>
          <Badge variant="secondary" className="text-[10px]">{entries.length} events</Badge>
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(ACTION_CONFIG).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No audit events recorded yet</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {filtered.map(entry => {
            const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.view;
            return (
              <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/20">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${config.color}`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{entry.candidateName}</span>
                    <span className="text-muted-foreground"> — {config.label}</span>
                  </p>
                  {entry.details && <p className="text-[10px] text-muted-foreground">{entry.details}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatTime(entry.timestamp)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
