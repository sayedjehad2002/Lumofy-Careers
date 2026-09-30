// Section scrolling for the careers homepage (nav offset, reduced motion, focus follows).

/** Where a section's top lands: just under the nav bar. Measures the bar, not the whole header, because an open phone
 *  menu (closed by the same tap, but not yet re-rendered) would otherwise push the section ~280px down. */
export function sectionOffset() {
  const bar = document.querySelector<HTMLElement>(".cx-nav__in");
  return (bar ? bar.offsetHeight + 1 : 75) + 12; // +1 = the header's bottom border
}

/** Smooth-scroll to a section below the sticky nav (instant under reduced motion) and move focus to it. */
export function scrollToSection(id: string, instant = false) {
  const target = document.getElementById(id);
  if (!target) return false;
  const top = id === "top" ? 0 : target.getBoundingClientRect().top + window.scrollY - sectionOffset();
  const reduce = instant || document.documentElement.dataset.motion !== "full";
  // "instant", not "auto": index.css sets scroll-behavior: smooth globally, and "auto" defers to it
  window.scrollTo({ top, behavior: reduce ? "instant" : "smooth" });
  const focusEl = (id === "top" ? document.getElementById("hero-title") : target) as HTMLElement | null;
  if (focusEl) {
    if (!focusEl.hasAttribute("tabindex")) focusEl.setAttribute("tabindex", "-1");
    focusEl.focus({ preventScroll: true });
  }
  return true;
}

// Back/Forward to the homepage should land where the visitor left it (usually the role they opened). The browser can't:
// it restores while the much shorter job page is still on screen, so the position gets clamped. The position is stored
// on the history entry itself (just before a link leaves it), so only a return to that same entry uses it.
type EntryState = Record<string, unknown> | null;
export function rememberHomeY() {
  try { window.history.replaceState({ ...(window.history.state as EntryState), cxY: Math.round(window.scrollY) }, ""); } catch { /* ignore */ }
}
export function savedHomeY(): number | null {
  const y = (window.history.state as EntryState)?.cxY;
  return typeof y === "number" ? y : null;
}
export function forgetHomeY() {
  const state = window.history.state as EntryState;
  if (!state || !("cxY" in state)) return;
  const rest = { ...state };
  delete rest.cxY;
  try { window.history.replaceState(rest, ""); } catch { /* ignore */ }
}
