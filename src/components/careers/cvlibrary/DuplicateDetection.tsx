import { useMemo, useState } from "react";
import { AlertTriangle, Eye, Check, Trash2, Mail, Phone, User, Star, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TONE_TEXT, TONE_BORDER, TONE_SOFT } from "@/components/careers/statusColors";

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

type Strength = "certain" | "possible";

interface DuplicateGroup {
  key: string;
  strength: Strength;
  /** Icon-friendly reason parts. */
  label: string;
  value: string;
  candidates: CVCandidate[];
}

interface Props {
  candidates: CVCandidate[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

/** How much of a record is filled in — used to suggest which copy to keep, so
 *  deleting a duplicate never silently discards the better-populated CV. */
function completeness(c: CVCandidate) {
  return (c.email ? 2 : 0) + (c.phone ? 2 : 0) + (c.name ? 1 : 0)
    + (c.skills?.length ? 1 : 0) + (c.ai_analysis ? 2 : 0);
}

const groupKey = (cands: CVCandidate[]) => cands.map(c => c.id).sort().join("|");

export default function DuplicateDetection({ candidates, onView, onDelete }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showPossible, setShowPossible] = useState(false);
  const [toDelete, setToDelete] = useState<CVCandidate | null>(null);

  const { certain, possible } = useMemo(() => {
    const byEmail = new Map<string, CVCandidate[]>();
    const byPhone = new Map<string, CVCandidate[]>();
    const byName = new Map<string, CVCandidate[]>();

    for (const c of candidates) {
      const email = c.email?.toLowerCase().trim();
      if (email) byEmail.set(email, [...(byEmail.get(email) || []), c]);

      const phone = c.phone?.replace(/\D/g, "");
      // Last 8 digits: the same mobile is stored with and without country code.
      if (phone && phone.length >= 8) {
        const tail = phone.slice(-8);
        byPhone.set(tail, [...(byPhone.get(tail) || []), c]);
      }

      // A shared FIRST name is not a duplicate. Five different people in this
      // library are recorded only as "Mohammed" — matching on that would invite
      // HR to delete five real candidates. Require a full name.
      const name = c.name?.toLowerCase().replace(/\s+/g, " ").trim();
      if (name && name.split(" ").length >= 2 && name.length >= 6) {
        byName.set(name, [...(byName.get(name) || []), c]);
      }
    }

    const seen = new Set<string>();
    const certain: DuplicateGroup[] = [];
    const possible: DuplicateGroup[] = [];

    const collect = (
      map: Map<string, CVCandidate[]>, strength: Strength, label: string, into: DuplicateGroup[]
    ) => {
      for (const [value, cands] of map) {
        if (cands.length < 2) continue;
        const key = groupKey(cands);
        if (seen.has(key)) continue;   // already caught by a stronger signal
        seen.add(key);
        into.push({ key, strength, label, value, candidates: cands });
      }
    };

    // Strongest signal first so a pair sharing an email is never re-reported by name.
    collect(byEmail, "certain", "Same email", certain);
    collect(byPhone, "certain", "Same phone", certain);
    collect(byName, "possible", "Same full name", possible);

    return {
      certain: certain.filter(g => !dismissed.has(g.key)),
      possible: possible.filter(g => !dismissed.has(g.key)),
    };
  }, [candidates, dismissed]);

  const dismiss = (g: DuplicateGroup) => setDismissed(prev => new Set(prev).add(g.key));

  const renderGroup = (group: DuplicateGroup) => {
    // Suggest keeping the fullest record; break ties on the most recent upload.
    const ranked = [...group.candidates].sort((a, b) =>
      completeness(b) - completeness(a) ||
      new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
    const keepId = ranked[0].id;
    const Icon = group.label === "Same email" ? Mail : group.label === "Same phone" ? Phone : User;
    const certain = group.strength === "certain";

    return (
      <div
        key={group.key}
        className={`rounded-xl bg-card border p-4 ${certain ? TONE_BORDER.warning : "border-border"}`}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${certain ? TONE_TEXT.warning : "text-muted-foreground"}`} aria-hidden="true" />
            <span className="text-xs text-muted-foreground">{group.label}</span>
            <code className="truncate rounded bg-secondary/60 px-1.5 py-0.5 text-[11px]">{group.value}</code>
            <Badge variant="secondary" className={`border-0 text-[10px] ${certain ? TONE_SOFT.warning : TONE_SOFT.muted}`}>
              {group.candidates.length} records
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => dismiss(group)}>
            Not a duplicate
          </Button>
        </div>

        <div className="space-y-2">
          {ranked.map(c => {
            const keep = c.id === keepId;
            return (
              <div
                key={c.id}
                className={`flex flex-wrap items-center gap-3 rounded-lg p-2 ${keep ? "bg-secondary/60 ring-1 ring-primary/20" : "bg-secondary/25"}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{c.name || "Unnamed candidate"}</span>
                    {keep && (
                      <span className="inline-flex flex-shrink-0 items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
                        Most complete
                      </span>
                    )}
                  </p>
                  {/* Show what actually differs, so the choice is informed rather
                      than a coin flip between two identical-looking rows. */}
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className={c.email ? "" : "italic opacity-60"}>{c.email || "no email"}</span>
                    <span className={c.phone ? "" : "italic opacity-60"}>{c.phone || "no phone"}</span>
                    <span>{c.skills?.length || 0} skills</span>
                    <span>{c.ai_analysis ? "analysed" : "not analysed"}</span>
                    <span>uploaded {new Date(c.uploaded_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onView(c.id)}>
                    <Eye className="mr-1 h-3 w-3" aria-hidden="true" />View
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => setToDelete(c)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" aria-hidden="true" />Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const total = certain.length + possible.length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle className={`h-4 w-4 ${TONE_TEXT.warning}`} aria-hidden="true" />
          Duplicate Detection
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {certain.length} confirmed by a shared email or phone
          {possible.length > 0 && `, ${possible.length} possible by name`}
        </p>
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Check className={`mx-auto mb-2 h-8 w-8 ${TONE_TEXT.success}`} aria-hidden="true" />
          <p className="font-medium">No duplicates detected</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Nothing in the library shares an email address or phone number.
          </p>
        </div>
      ) : (
        // A plain scroll container, not the shadcn ScrollArea: that component's
        // viewport is height:100%, which resolves to auto against a parent sized
        // only by max-height — so the box clipped at 600px and the wheel did
        // nothing. Verified in-browser: viewport 2000px inside a 600px box.
        <div className="max-h-[70vh] space-y-3 overflow-y-auto overscroll-contain pr-1 scrollbar-slim">
          {certain.length > 0 && (
            <>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Same person ({certain.length})
              </p>
              {certain.map(renderGroup)}
            </>
          )}

          {possible.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowPossible(v => !v)}
                className="flex w-full items-center gap-1.5 rounded-md py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                Possibly the same ({possible.length})
                <span className="ml-auto text-[10px] font-normal normal-case">
                  {showPossible ? "Hide" : "Review"}
                </span>
              </button>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Matched on full name only. Different people can share a name — check the
                email and phone before deleting anything.
              </p>
              {showPossible && <div className="space-y-3">{possible.map(renderGroup)}</div>}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={open => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.name || "this CV"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves {toDelete?.resume_file_name || "the CV"} to the trash, where it can be
              restored. Make sure you are deleting the duplicate and not the more complete record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { const c = toDelete; setToDelete(null); if (c) onDelete(c.id); }}
            >
              Delete CV
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
