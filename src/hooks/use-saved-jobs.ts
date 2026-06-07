import { useCallback, useEffect, useState } from "react";

/**
 * Candidate-facing "saved / bookmarked jobs", persisted in localStorage.
 * Pure client-side — no backend, no auth, zero PII. Syncs across components
 * (same tab via a custom event) and across tabs (the native `storage` event).
 */

const KEY = "lumofy:saved-jobs";
const CHANGE_EVENT = "lumofy:saved-jobs-changed";

function readSaved(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeSaved(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota / unavailable storage (e.g. private mode) */
  }
  // The native `storage` event only fires in *other* tabs — notify this tab too.
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function useSavedJobs() {
  const [savedIds, setSavedIds] = useState<string[]>(readSaved);

  useEffect(() => {
    const sync = () => setSavedIds(readSaved());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = readSaved();
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    writeSaved(next);
    setSavedIds(next);
  }, []);

  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);

  return { savedIds, isSaved, toggle, count: savedIds.length };
}
