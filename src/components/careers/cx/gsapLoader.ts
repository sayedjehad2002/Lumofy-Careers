// GSAP is loaded on demand, in its own chunk, only by the careers pages that animate.
// Everything on those pages works before (or without) it; motion is layered on when it arrives.
import type { gsap as GsapCore } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import type { Flip as FlipType } from "gsap/Flip";

export interface GsapBundle {
  gsap: typeof GsapCore;
  ScrollTrigger: typeof ScrollTriggerType;
  Flip: typeof FlipType;
}

let bundle: GsapBundle | null = null;
let pending: Promise<GsapBundle | null> | null = null;

export function loadGsap(): Promise<GsapBundle | null> {
  if (bundle) return Promise.resolve(bundle);
  if (!pending) {
    pending = Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("gsap/DrawSVGPlugin"), import("gsap/Flip")])
      .then(([core, st, draw, flip]) => {
        const g = core.gsap;
        g.registerPlugin(st.ScrollTrigger, draw.DrawSVGPlugin, flip.Flip);
        st.ScrollTrigger.config({ ignoreMobileResize: true });
        bundle = { gsap: g, ScrollTrigger: st.ScrollTrigger, Flip: flip.Flip };
        return bundle;
      })
      .catch(() => null); // no engine: the finished page stays as it is
  }
  return pending;
}

/** The bundle if it has already loaded, else null (never triggers a load). */
export const getGsap = () => bundle;
