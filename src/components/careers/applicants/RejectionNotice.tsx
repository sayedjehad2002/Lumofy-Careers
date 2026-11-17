import { useEffect, useMemo, useState } from "react";
import { Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { bccMailto, bulkRejectionDraft } from "@/lib/rejectionDraft";

/** Who was just rejected, captured at the moment of the move. */
export type RejectionAudience = {
  emails: string[];
  /** Rejected candidates with no address on file: they cannot be told by email. */
  withoutEmail: number;
  jobTitles: string[];
};

/**
 * Shown after a bulk rejection, so nobody is left without an answer.
 *
 * Nothing is sent from here. It drafts one message, puts every address in BCC so
 * candidates never see each other, and hands it to HR's own mail app.
 */
export default function RejectionNotice({
  audience, onClose,
}: { audience: RejectionAudience | null; onClose: () => void }) {
  const draft = useMemo(() => bulkRejectionDraft(audience?.jobTitles ?? []), [audience]);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  useEffect(() => { setSubject(draft.subject); setBody(draft.body); }, [draft]);

  if (!audience) return null;
  const { emails, withoutEmail } = audience;
  const mailto = bccMailto(emails, subject, body);
  const people = (n: number) => `${n} candidate${n === 1 ? "" : "s"}`;

  const copy = (text: string, what: string) =>
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${what} copied`))
      .catch(() => toast.error("Couldn't copy to the clipboard"));

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Let them know</DialogTitle>
          <DialogDescription>
            {emails.length > 0
              ? `${people(emails.length)} can be emailed. Every address goes in BCC, so nobody sees the others.`
              : "None of the rejected candidates has an email address on file."}
            {withoutEmail > 0 && emails.length > 0 && ` ${people(withoutEmail)} ${withoutEmail === 1 ? "has" : "have"} no email on file and will not get this.`}
          </DialogDescription>
        </DialogHeader>

        {emails.length > 0 && (
          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <span className="pk__h">Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="pk__input" dir="auto" />
            </label>
            <label className="grid gap-1.5">
              <span className="pk__h">Message</span>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={11} className="pk__input" dir="auto" />
            </label>
            {!mailto && (
              <p className="pk__muted">
                Too many addresses to open in a mail app in one go. Copy the addresses into BCC and the message into a new email.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <button type="button" className="dx-btn dx-btn--secondary" onClick={onClose}>
            {emails.length > 0 ? "Not now" : "Close"}
          </button>
          {emails.length > 0 && (
            <>
              <button type="button" className="dx-btn dx-btn--secondary" onClick={() => copy(emails.join(", "), "Addresses")}>
                <Copy aria-hidden="true" /> Copy addresses
              </button>
              <button type="button" className="dx-btn dx-btn--secondary" onClick={() => copy(`Subject: ${subject}\n\n${body}`, "Message")}>
                <Copy aria-hidden="true" /> Copy message
              </button>
              {mailto && (
                <a className="dx-btn dx-btn--primary" href={mailto} onClick={onClose}>
                  <Mail aria-hidden="true" /> Open in email
                </a>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
