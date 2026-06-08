import { useMemo, useState } from "react";
import { Shield, Clock, AlertTriangle, Trash2, Check, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TONE_TEXT } from "@/components/careers/statusColors";

interface CVCandidate {
  id: string;
  name: string | null;
  email: string | null;
  uploaded_at: string;
  status: string;
}

interface Props {
  candidates: CVCandidate[];
  onDelete: (id: string) => void;
  onViewCandidate: (id: string) => void;
}

export default function GDPRRetention({ candidates, onDelete, onViewCandidate }: Props) {
  const [retentionMonths, setRetentionMonths] = useState("6");
  const months = parseInt(retentionMonths);

  const flagged = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    return candidates
      .filter(c => new Date(c.uploaded_at) < cutoff)
      .sort((a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime());
  }, [candidates, months]);

  const ageInDays = (date: string) => Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));

  const handleBulkDelete = () => {
    if (!confirm(`Delete ${flagged.length} CVs older than ${months} months? This cannot be undone.`)) return;
    flagged.forEach(c => onDelete(c.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">GDPR / Retention Manager</h3>
      </div>

      <div className="rounded-xl bg-card border border-border p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">Flag CVs older than:</p>
          <Select value={retentionMonths} onValueChange={setRetentionMonths}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 months</SelectItem>
              <SelectItem value="6">6 months</SelectItem>
              <SelectItem value="9">9 months</SelectItem>
              <SelectItem value="12">12 months</SelectItem>
              <SelectItem value="18">18 months</SelectItem>
              <SelectItem value="24">24 months</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant={flagged.length > 0 ? "destructive" : "secondary"} className="text-xs">
            {flagged.length} flagged for review
          </Badge>
        </div>
      </div>

      {flagged.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <Check className={`w-8 h-8 mx-auto mb-2 ${TONE_TEXT.success}`} aria-hidden="true" />
          <p className="font-medium">All CVs are within retention policy</p>
          <p className="text-xs text-muted-foreground mt-1">No action needed</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-card border border-[hsl(var(--intel-warning)/0.2)] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${TONE_TEXT.warning}`} aria-hidden="true" />
                {flagged.length} CV{flagged.length !== 1 ? "s" : ""} exceed retention period
              </p>
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleBulkDelete}>
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete all flagged
              </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {flagged.map(c => {
                const days = ageInDays(c.uploaded_at);
                const severity = days > months * 60 ? "critical" : days > months * 45 ? "warning" : "info";
                return (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20">
                    <Clock className={`w-4 h-4 flex-shrink-0 ${severity === "critical" ? TONE_TEXT.danger : severity === "warning" ? TONE_TEXT.warning : "text-muted-foreground"}`} aria-hidden="true" />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onViewCandidate(c.id)}>
                      <p className="text-sm font-medium truncate">{c.name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.email} · Uploaded {days} days ago · {new Date(c.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => {
                      if (confirm(`Delete CV for ${c.name || "Unknown"}?`)) onDelete(c.id);
                    }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="rounded-xl bg-card border border-border p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">📋 Data Retention Policy Notes</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>CVs should be reviewed and deleted when no longer needed per GDPR Article 5(1)(e)</li>
          <li>Candidates have the right to request deletion of their data (Right to Erasure)</li>
          <li>Consider setting up automatic retention policies based on your organization's requirements</li>
          <li>Archived CVs count towards retention; review archived candidates regularly</li>
        </ul>
      </div>
    </div>
  );
}
