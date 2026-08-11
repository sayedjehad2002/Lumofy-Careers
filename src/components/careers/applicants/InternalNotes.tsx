import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Cog, MessageSquarePlus, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ApplicantEvent } from "@/hooks/use-applicant-events";

interface InternalNotesProps {
  notes: string[];
  /** Recorded history — carries the author and the real timestamp for each note. */
  events: ApplicantEvent[];
  saving: boolean;
  onAdd: (text: string) => void;
}

/**
 * Notes the app writes for itself.
 *
 * 292 of the 305 notes in production start with "Added from CV Library"; only 13
 * were typed by a person. Labelling machine-written entries "System" rather than
 * "author not recorded" is both truer and quieter — nothing is missing from them,
 * no human ever wrote them.
 */
const SYSTEM_NOTE = /^(Added from CV Library|Moved from ")/;

function initials(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase() || "?";
}

/** "2 minutes ago" close up, an absolute date once that stops being useful. */
function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  if (days <= 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function InternalNotes({ notes, events, saving, onAdd }: InternalNotesProps) {
  const [draft, setDraft] = useState("");

  /**
   * Note text → who wrote it and when.
   *
   * Matched on the text because applicants.notes is a bare string array with no
   * ids — the note itself is all the two sides share. Anything written before
   * this history existed simply will not match, and is shown as unattributed
   * rather than credited to whoever wrote something similar.
   */
  const meta = useMemo(() => {
    const map = new Map<string, { author: string | null; at: string }>();
    for (const e of events) {
      if (e.kind === "note" && e.note && !map.has(e.note)) {
        map.set(e.note, { author: e.actor_email, at: e.created_at });
      }
    }
    return map;
  }, [events]);

  /**
   * Newest first.
   *
   * Notes are appended to the array, so its natural order is oldest-first — the
   * opposite of what you want when the last thing written is the thing you came
   * to read.
   *
   * Recorded notes sort by their real timestamp. Notes that predate the event
   * log have no timestamp at all, so they fall below every recorded one (they
   * are all genuinely older) and among themselves keep array order reversed,
   * which is append order and therefore the best available proxy for recency.
   */
  const items = useMemo(() => {
    const seen = new Map<string, { note: string; count: number; key: number }>();
    notes.forEach((note, i) => {
      const hit = seen.get(note);
      if (hit) hit.count += 1;
      else seen.set(note, { note, count: 1, key: i });
    });
    return Array.from(seen.values()).sort((a, b) => {
      const ta = meta.get(a.note)?.at;
      const tb = meta.get(b.note)?.at;
      if (ta && tb) return new Date(tb).getTime() - new Date(ta).getTime();
      if (ta) return -1;
      if (tb) return 1;
      return b.key - a.key;
    });
  }, [notes, meta]);

  const submit = () => {
    const text = draft.trim();
    if (!text || saving) return;
    onAdd(text);
    setDraft("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-card))] p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="font-semibold">Internal Notes</h3>
        {items.length > 0 && (
          <span className="rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-muted-foreground">
            {items.length}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <Lock className="h-2.5 w-2.5" aria-hidden="true" />
          Team only
        </span>
      </div>

      {/* Composer above the list, because the list is newest-first: you write
          here and your note appears directly underneath, instead of at the far
          end of a scroll. */}
      <div className="mb-3 flex gap-2">
        <Input
          placeholder="Add a note for your team…"
          aria-label="Add an internal note"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          className="h-9 rounded-xl text-sm"
        />
        <Button size="sm" className="h-9 shrink-0 gap-1.5 rounded-xl" onClick={submit} disabled={saving || !draft.trim()}>
          <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
          {saving ? "Saving…" : "Add"}
        </Button>
      </div>

      <div className="max-h-72 space-y-2.5 overflow-y-auto scrollbar-slim pr-1">
        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No notes yet. Anything you write here is visible to your HR team and never to the candidate.
          </p>
        )}

        {items.map((n) => {
          const info = meta.get(n.note);
          const isSystem = SYSTEM_NOTE.test(n.note);
          const author = info?.author ?? null;

          return (
            <div key={n.key} className="rounded-xl border border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-surface))] p-3">
              <div className="mb-1.5 flex items-center gap-2">
                {author ? (
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary"
                    aria-hidden="true"
                  >
                    {initials(author)}
                  </span>
                ) : (
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
                    aria-hidden="true"
                  >
                    <Cog className="h-3 w-3" />
                  </span>
                )}

                {/* The full address, at a size you can actually read. Knowing a
                    colleague's exact account is the point of the attribution —
                    a truncated local part leaves you guessing between two people
                    who share a first name. */}
                {author ? (
                  <span className="truncate text-xs font-semibold text-foreground" title={author}>
                    {author}
                  </span>
                ) : isSystem ? (
                  <span className="text-xs font-medium text-muted-foreground">System</span>
                ) : (
                  <span className="text-xs italic text-muted-foreground">Author not recorded</span>
                )}

                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                  {info ? (
                    <span title={new Date(info.at).toLocaleString("en-GB")}>{relativeTime(info.at)}</span>
                  ) : (
                    // No event row means no timestamp either — notes predating the
                    // history have neither an author nor a time.
                    <span className="italic">no date</span>
                  )}
                </span>
              </div>

              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                {n.note}
              </p>

              {n.count > 1 && (
                <p className="mt-1 text-[10px] text-muted-foreground/70">Added {n.count}×</p>
              )}
            </div>
          );
        })}
      </div>

    </motion.div>
  );
}
