import { useEffect, useRef } from "react";

/**
 * Drives a "live" view: calls `onRefresh` on an interval while the document is
 * visible, and immediately when the tab becomes visible or the window regains
 * focus. Pauses entirely while the tab is hidden so we never poll in the
 * background. Mount/unmount the host component to start/stop it.
 *
 * `onRefresh` is held in a ref, so passing a fresh closure each render does NOT
 * restart the interval — only `intervalMs` / `enabled` do.
 */
export function useLiveRefresh(onRefresh: () => void, intervalMs: number, enabled = true) {
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;

    let timer: number | undefined;
    const fire = () => { if (!document.hidden) cb.current(); };
    const stop = () => { if (timer !== undefined) { window.clearInterval(timer); timer = undefined; } };
    const start = () => { stop(); timer = window.setInterval(fire, intervalMs); };

    const onVisibility = () => {
      if (document.hidden) { stop(); }
      else { cb.current(); start(); } // returned to the tab: refresh now, resume polling
    };
    const onFocus = () => { if (!document.hidden) cb.current(); };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [intervalMs, enabled]);
}
