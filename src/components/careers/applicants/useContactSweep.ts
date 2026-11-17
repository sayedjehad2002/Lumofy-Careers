import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { contactPatch, readCvContacts, repairGluedName, type CvReading } from "@/lib/cvContacts";
import type { Applicant } from "@/types/careers";

export type ContactSweepProgress = { total: number; done: number; current: string | null };

export type ContactSweepResult = {
  /** How many fields of each kind were written. */
  emails: number;
  phones: number;
  linkedins: number;
  /** Names stored as one run ("Sarahshaikh") that the CV let us split. */
  names: number;
  /** Readable CVs that simply don't print an email (mostly LinkedIn PDF exports). */
  noEmailOnCv: number;
  /** Scans, photos, Word files or missing files: nothing to read without OCR. */
  unreadable: number;
  failed: number;
  cancelled: boolean;
  /** Applicants whose CV was actually read (or found unreadable), so a rerun can skip them. */
  checkedIds: string[];
};

type Fields = Partial<Pick<Applicant, "email" | "phone" | "linkedin" | "fullName">>;

/**
 * get-cv-url allows 30 calls a minute per IP and update-applicant 60. One CV per
 * ~2.2s keeps a long run under both without ever hitting a 429.
 */
const MIN_GAP_MS = 2200;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Read contact details off each applicant's CV in the browser — no AI — and
 * fill only the fields that are empty. Sequential and cancellable, like the bulk
 * analysis, and everything written stays written if the run is stopped.
 */
export function useContactSweep(
  sessionToken: string | null,
  saveFields: (applicantId: string, fields: Fields) => Promise<void>,
) {
  const [progress, setProgress] = useState<ContactSweepProgress | null>(null);
  const cancelRef = useRef(false);
  const cancel = useCallback(() => { cancelRef.current = true; }, []);

  const run = useCallback(async (items: Applicant[]): Promise<ContactSweepResult> => {
    cancelRef.current = false;
    const r: ContactSweepResult = {
      emails: 0, phones: 0, linkedins: 0, names: 0, noEmailOnCv: 0, unreadable: 0, failed: 0, cancelled: false,
      checkedIds: [],
    };
    const queue = [...items];
    setProgress({ total: queue.length, done: 0, current: null });

    for (let i = 0; i < queue.length; i++) {
      if (cancelRef.current) { r.cancelled = true; break; }
      const a = queue[i];
      setProgress({ total: queue.length, done: i, current: a.fullName?.trim() || "Unnamed candidate" });
      const started = Date.now();

      try {
        const reading = await readApplicantCv(a, sessionToken);
        if (!reading.readable) {
          r.unreadable++;
        } else {
          const patch: Fields = contactPatch(a, reading.contacts);
          const fixedName = repairGluedName(a.fullName ?? "", reading.text);
          if (fixedName) patch.fullName = fixedName;
          if (Object.keys(patch).length > 0) {
            await saveFields(a.id, patch);
            if (patch.fullName) r.names++;
            if (patch.email) r.emails++;
            if (patch.phone) r.phones++;
            if (patch.linkedin) r.linkedins++;
          }
          if (!reading.contacts.email && !a.email?.trim()) r.noEmailOnCv++;
        }
        r.checkedIds.push(a.id);
      } catch {
        r.failed++;
      }

      const wait = MIN_GAP_MS - (Date.now() - started);
      if (wait > 0 && i < queue.length - 1) await sleep(wait);
    }

    setProgress(null);
    return r;
  }, [sessionToken, saveFields]);

  return { progress, run, cancel };
}

/** Sign a short-lived URL for this applicant's own CV, then read it in the browser. */
export async function readApplicantCv(a: Applicant, sessionToken: string | null): Promise<CvReading> {
  if (!a.cvStoragePath) return { readable: false, reason: "download_failed" };
  const { data, error } = await supabase.functions.invoke("get-cv-url", {
    body: { applicantId: a.id, sessionToken },
  });
  if (error || !data?.url) {
    // 404 = the file is gone from storage: unreadable, not a transient failure.
    const status = (error as { context?: { status?: number } } | null)?.context?.status;
    if (status === 404) return { readable: false, reason: "download_failed" };
    throw error ?? new Error("No signed URL");
  }
  return readCvContacts(data.url, a.cvStoragePath);
}
