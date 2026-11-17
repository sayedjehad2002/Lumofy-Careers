import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpRight, FileText, Loader2, Mail, MailWarning, Phone } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { APPLICANT_STATUSES, type Applicant, type ApplicantStatus } from "@/types/careers";
import type { SlaState } from "@/lib/pipelineMetrics";
import { STATUS_COLORS, fitBand } from "../statusColors";

/** The decisions a first read usually ends in, with the key that makes each. */
export const PEEK_DECISIONS: { status: ApplicantStatus; key: string; label: string }[] = [
  { status: "reviewing", key: "e", label: "Reviewing" },
  { status: "shortlisted", key: "s", label: "Shortlist" },
  { status: "rejected", key: "r", label: "Reject" },
];

export interface CandidatePeekProps {
  /** Null closes the panel. */
  applicant: Applicant | null;
  jobTitle: string;
  profileHref: string;
  /** 1-based place in the list being worked through, and its length. */
  position: number;
  total: number;
  days: number;
  sla: SlaState;
  /** False for viewers: they can read and add notes, not move candidates. */
  canDecide: boolean;
  sessionToken: string | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDecide: (status: ApplicantStatus) => void;
  onAddNote: (applicantId: string, note: string) => Promise<void>;
}

/**
 * A candidate at a glance, without leaving the list.
 *
 * The full profile is a page of its own; working through fifty new applications
 * one page-load at a time is what made triage slow. This shows what a first
 * decision needs (who, for what, how they scored and why, their CV) and moves to
 * the next person the moment a decision is made.
 */
export default function CandidatePeek({
  applicant, jobTitle, profileHref, position, total, days, sla, canDecide, sessionToken,
  onClose, onPrev, onNext, onDecide, onAddNote,
}: CandidatePeekProps) {
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [openingCv, setOpeningCv] = useState(false);
  const id = applicant?.id;

  // A half-typed note belongs to the person it was typed about.
  useEffect(() => { setNote(""); }, [id]);

  if (!applicant) return null;

  const name = applicant.fullName?.trim();
  const stage = APPLICANT_STATUSES.find((s) => s.value === applicant.status) ?? APPLICANT_STATUSES[0];
  const ai = applicant.aiAnalysis;
  const email = applicant.email?.trim();
  const applied = new Date(applicant.appliedDate);

  const openCv = async () => {
    setOpeningCv(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-cv-url", {
        body: { applicantId: applicant.id, sessionToken, inline: true },
      });
      if (error || !data?.url) throw error ?? new Error("No URL");
      const u = new URL(data.url);
      u.searchParams.delete("download");
      window.open(u.toString(), "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Couldn't open the CV. Please try again.");
    } finally {
      setOpeningCv(false);
    }
  };

  const saveNote = async () => {
    const text = note.trim();
    if (!text) return;
    setSavingNote(true);
    try {
      await onAddNote(applicant.id, text);
      setNote("");
      toast.success("Note added");
    } catch {
      toast.error("Couldn't save the note. Please try again.");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="pk w-full gap-0 overflow-y-auto p-0 sm:max-w-md" overlayClassName="bg-black/30" aria-describedby="pk-desc">
        <header className="pk__head">
          <div className="pk__nav">
            <button type="button" className="ar-icon-btn" onClick={onPrev} disabled={position <= 1} aria-label="Previous candidate" title="Previous (K)">
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className="ar-icon-btn" onClick={onNext} disabled={position >= total} aria-label="Next candidate" title="Next (J)">
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="pk__pos">{position > 0 ? `${position} of ${total}` : "No longer in this list"}</span>
          </div>
          <SheetTitle className="pk__name" dir="auto">
            {name || <span className="italic text-muted-foreground">Name not captured</span>}
          </SheetTitle>
          <SheetDescription id="pk-desc" className="pk__role">
            {jobTitle}
            {!Number.isNaN(applied.getTime()) && (
              <> · {applied.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</>
            )}
          </SheetDescription>
          <div className="pk__meta">
            <span className="ar-stage">
              <i style={{ background: STATUS_COLORS[applicant.status] }} aria-hidden="true" />
              {stage.label}
            </span>
            <span className={`ar-wait ar-wait--${sla}`}><b>{days}</b> {days === 1 ? "day" : "days"} in stage</span>
          </div>
        </header>

        <div className="pk__body">
          <section className="pk__contact" aria-label="Contact">
            {email ? (
              <a href={`mailto:${email}`} className="pp-contact__link">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{email}</span>
              </a>
            ) : (
              <span className="ar-sub ar-warn">
                <MailWarning className="h-3.5 w-3.5" aria-hidden="true" /> No email on file
              </span>
            )}
            {applicant.phone && (
              <span className="pp-contact__item">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" /> {applicant.phone}
              </span>
            )}
            {applicant.location && <span className="pp-contact__item" dir="auto">{applicant.location}</span>}
          </section>

          <section aria-label="AI fit">
            <h3 className="pk__h">AI fit</h3>
            {ai ? (
              <>
                <div className="pk__fit">
                  <span className={`ar-fit ar-fit--${fitBand(ai.fitScore)}`} title={`AI fit score ${ai.fitScore} of 100`}>{ai.fitScore}</span>
                  <span className="pk__rec">{ai.recommendation}</span>
                </div>
                {ai.strengths?.length > 0 && (
                  <>
                    <p className="pk__sub">Strengths</p>
                    <ul className="pk__list">{ai.strengths.slice(0, 3).map((s, i) => <li key={i} dir="auto">{s}</li>)}</ul>
                  </>
                )}
                {ai.gaps?.length > 0 && (
                  <>
                    <p className="pk__sub">Gaps</p>
                    <ul className="pk__list">{ai.gaps.slice(0, 3).map((s, i) => <li key={i} dir="auto">{s}</li>)}</ul>
                  </>
                )}
              </>
            ) : (
              <p className="pk__muted">Not scored yet. Run the AI analysis from the full profile, or select candidates and score them together.</p>
            )}
          </section>

          <section aria-label="Files and profile" className="pk__links">
            {applicant.cvStoragePath && (
              <button type="button" className="dx-btn dx-btn--secondary" onClick={openCv} disabled={openingCv}>
                {openingCv ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileText aria-hidden="true" />}
                View CV
              </button>
            )}
            <Link to={profileHref} className="dx-btn dx-btn--secondary">
              <ArrowUpRight aria-hidden="true" />
              Full profile
            </Link>
          </section>

          <section aria-label="Notes">
            <h3 className="pk__h">
              Notes{applicant.notes.length > 0 ? ` · ${applicant.notes.length}` : ""}
            </h3>
            {applicant.notes.length > 0 && (
              <p className="pk__note" dir="auto">{applicant.notes[applicant.notes.length - 1]}</p>
            )}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void saveNote(); }}
              rows={2}
              dir="auto"
              aria-label="Add a note"
              placeholder="Add a note for the team"
              className="pk__input"
            />
            {note.trim() && (
              <button type="button" className="dx-btn dx-btn--secondary mt-2" onClick={saveNote} disabled={savingNote}>
                {savingNote && <Loader2 className="animate-spin" aria-hidden="true" />}
                Save note
              </button>
            )}
          </section>
        </div>

        {canDecide && (
          <footer className="pk__foot">
            {PEEK_DECISIONS.map((d) => (
              <button
                key={d.status}
                type="button"
                onClick={() => onDecide(d.status)}
                disabled={applicant.status === d.status}
                className={`dx-btn ${d.status === "shortlisted" ? "dx-btn--primary" : "dx-btn--secondary"}${d.status === "rejected" ? " pk__reject" : ""}`}
              >
                {d.label}
                <kbd className="pk__kbd" aria-hidden="true">{d.key.toUpperCase()}</kbd>
              </button>
            ))}
          </footer>
        )}
      </SheetContent>
    </Sheet>
  );
}
