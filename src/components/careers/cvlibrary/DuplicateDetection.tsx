import { useMemo, useState } from "react";
import { AlertTriangle, Merge, Eye, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TONE_TEXT, TONE_BORDER } from "@/components/careers/statusColors";

interface CVCandidate {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  skills: string[];
  uploaded_at: string;
  status: string;
  resume_file_name: string;
  ai_analysis?: { fitScore: number } | null;
}

interface DuplicateGroup {
  reason: string;
  candidates: CVCandidate[];
}

interface Props {
  candidates: CVCandidate[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function DuplicateDetection({ candidates, onView, onDelete }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const duplicateGroups = useMemo(() => {
    const groups: DuplicateGroup[] = [];
    const emailMap: Record<string, CVCandidate[]> = {};
    const phoneMap: Record<string, CVCandidate[]> = {};
    const nameMap: Record<string, CVCandidate[]> = {};

    candidates.forEach(c => {
      if (c.email) {
        const key = c.email.toLowerCase().trim();
        if (!emailMap[key]) emailMap[key] = [];
        emailMap[key].push(c);
      }
      if (c.phone) {
        const key = c.phone.replace(/\D/g, "");
        if (key.length >= 7) {
          if (!phoneMap[key]) phoneMap[key] = [];
          phoneMap[key].push(c);
        }
      }
      if (c.name) {
        const key = c.name.toLowerCase().trim();
        if (!nameMap[key]) nameMap[key] = [];
        nameMap[key].push(c);
      }
    });

    const seen = new Set<string>();

    Object.entries(emailMap).filter(([, v]) => v.length > 1).forEach(([email, cands]) => {
      const key = cands.map(c => c.id).sort().join("|");
      if (!seen.has(key)) {
        seen.add(key);
        groups.push({ reason: `Same email: ${email}`, candidates: cands });
      }
    });

    Object.entries(phoneMap).filter(([, v]) => v.length > 1).forEach(([phone, cands]) => {
      const key = cands.map(c => c.id).sort().join("|");
      if (!seen.has(key)) {
        seen.add(key);
        groups.push({ reason: `Same phone: ${phone}`, candidates: cands });
      }
    });

    Object.entries(nameMap).filter(([, v]) => v.length > 1).forEach(([name, cands]) => {
      const key = cands.map(c => c.id).sort().join("|");
      if (!seen.has(key)) {
        seen.add(key);
        groups.push({ reason: `Same name: ${name}`, candidates: cands });
      }
    });

    return groups.filter(g => !dismissed.has(g.candidates.map(c => c.id).sort().join("|")));
  }, [candidates, dismissed]);

  const dismiss = (group: DuplicateGroup) => {
    setDismissed(prev => new Set(prev).add(group.candidates.map(c => c.id).sort().join("|")));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${TONE_TEXT.warning}`} aria-hidden="true" /> Duplicate Detection
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {duplicateGroups.length} potential duplicate group{duplicateGroups.length !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>

      {duplicateGroups.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <Check className={`w-8 h-8 mx-auto mb-2 ${TONE_TEXT.success}`} aria-hidden="true" />
          <p className="font-medium">No duplicates detected</p>
          <p className="text-xs text-muted-foreground mt-1">Your CV library is clean</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-3">
            {duplicateGroups.map((group, gi) => (
              <div key={gi} className="rounded-xl bg-card border border-[hsl(var(--intel-warning)/0.2)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className={`text-[10px] ${TONE_TEXT.warning} ${TONE_BORDER.warning}`}>
                    {group.reason}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => dismiss(group)}>
                    Dismiss
                  </Button>
                </div>
                <div className="space-y-2">
                  {group.candidates.map(c => (
                    <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name || "Unknown"}</p>
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          {c.email && <span>{c.email}</span>}
                          {c.phone && <span>{c.phone}</span>}
                          <span>Uploaded {new Date(c.uploaded_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onView(c.id)}>
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => onDelete(c.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
