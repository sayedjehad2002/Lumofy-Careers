import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ApplicantStatus } from "@/types/careers";

export type ApplicantEvent = {
  id: string;
  kind: "stage_change" | "note";
  /** Lowercased email of the HR user who did it. Null = system, or before this was tracked. */
  actor_email: string | null;
  from_status: ApplicantStatus | null;
  to_status: ApplicantStatus | null;
  note: string | null;
  created_at: string;
};

/**
 * One candidate's history: who moved them between stages, and who wrote each note.
 *
 * Fetched per candidate rather than joined into the applicants payload — 367
 * candidates' worth of history on every dashboard load would be a large response
 * nobody reads.
 *
 * A failure here is deliberately non-fatal. The history is supporting context on
 * a profile that is perfectly usable without it, so it degrades to "couldn't be
 * loaded" rather than taking the page down.
 */
export function useApplicantEvents(applicantId: string | null, sessionToken: string | null) {
  const [events, setEvents] = useState<ApplicantEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!applicantId || !sessionToken) { setEvents([]); return; }
    setLoading(true);
    setFailed(false);
    try {
      const { data, error } = await supabase.functions.invoke("applicant-events", {
        body: { sessionToken, applicantId },
      });
      if (error || data?.error) throw new Error(data?.error ?? "failed");
      setEvents(Array.isArray(data?.events) ? data.events : []);
    } catch {
      setEvents([]);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [applicantId, sessionToken]);

  useEffect(() => { void load(); }, [load]);

  return { events, loading, failed, reload: load };
}
