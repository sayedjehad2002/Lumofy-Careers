import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import SectionShell from "./SectionShell";
import { stakes } from "@/data/careers";
import { brandEase, prefersReducedMotion, revealViewport } from "@/lib/motion";
import lumofyMark from "@/assets/brand/lumofy-mark.svg";

// "The problem worth joining" — the brand thesis drawn as a LIVE SCHEMATIC:
// three raw workforce problems are wired through the Lumofy intelligence core
// and come out the other side as outcomes. The signal paths draw themselves on
// scroll, data pulses travel them continuously, the core breathes, and a slow
// spotlight cycles row by row (hover or focus any row to take control of it).
// All copy renders verbatim from `stakes`; the wiring is decorative
// (aria-hidden) — the real content is plain DOM text. Pulses, rings, and the
// cycle pause off-screen and disappear entirely under prefers-reduced-motion.
const ROW_Y = [110, 230, 350];
const STAGE_H = 400; // tight crop — no dead band under the last row
const CORE_Y = 230;
// Inbound wire, pass-under-the-core segment, outbound wire — one path per row
// so a single pulse can ride the entire journey (the core node hides the
// crossing in the middle).
const FLOW_PATHS = [
  "M345,110 C415,110 425,202 455,220 L545,220 C575,202 585,110 655,110",
  "M345,230 C390,230 610,230 655,230",
  "M345,350 C415,350 425,258 455,240 L545,240 C575,258 585,350 655,350",
];

const PULSE_SECONDS = 2.4;
const HANDOFF_MS = 220;

// Minimal rAF tween (easeInOut) — deterministic and dependency-free, so the
// pulse → handoff → loop chain can never silently stall.
const tween = (seconds: number, onUpdate: (p: number) => void, onComplete: () => void) => {
  let raf = 0;
  const t0 = performance.now();
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const step = (now: number) => {
    const p = Math.min((now - t0) / (seconds * 1000), 1);
    onUpdate(ease(p));
    if (p < 1) raf = requestAnimationFrame(step);
    else onComplete();
  };
  raf = requestAnimationFrame(step);
  return { stop: () => cancelAnimationFrame(raf) };
};

const WhyItMattersSection = () => {
  const reduced = prefersReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const dotRef = useRef<SVGCircleElement>(null);
  const heldRef = useRef<number | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const runRef = useRef<(i: number) => void>();
  const [inView, setInView] = useState(true);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!stageRef.current || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 });
    obs.observe(stageRef.current);
    return () => obs.disconnect();
  }, []);

  const live = !reduced && inView;

  // ONE rAF-driven loop owns the whole show: the pulse leaves the chip, rides
  // the wire to the END of its outcome, then the spotlight hands off to the
  // next row — identical rules for all three, looping forever. (No SMIL, no
  // intervals — the dot and the spotlight can never drift apart.)
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    let timer: number | undefined;

    const run = (idx: number) => {
      if (cancelled) return;
      setActive(idx);
      const path = pathRefs.current[idx];
      const dot = dotRef.current;
      // On mobile the desktop stage is display:none — keep the loop cycling the
      // cards' spotlight even if the geometry isn't measurable.
      let len = 0;
      try { len = path?.getTotalLength() ?? 0; } catch { len = 0; }
      controlsRef.current = tween(
        PULSE_SECONDS,
        (p) => {
          if (!path || !dot || len === 0) return;
          const pt = path.getPointAtLength(p * len);
          dot.setAttribute("cx", String(pt.x));
          dot.setAttribute("cy", String(pt.y));
          // fade in at the chip, fade out as it docks into the outcome
          const edge = Math.min(p / 0.05, (1 - p) / 0.05, 1);
          dot.setAttribute("opacity", String(Math.max(0, edge)));
        },
        () => {
          if (cancelled) return;
          const next = heldRef.current ?? (idx + 1) % stakes.problems.length;
          timer = window.setTimeout(() => run(next), HANDOFF_MS);
        },
      );
    };

    runRef.current = run;
    run(0);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      controlsRef.current?.stop();
    };
  }, [live]);

  // Hover/focus takes the spotlight immediately; releasing lets the loop roam on.
  const hold = (i: number) => {
    heldRef.current = i;
    if (live && i !== active) {
      controlsRef.current?.stop();
      runRef.current?.(i);
    } else if (!live) {
      setActive(i);
    }
  };
  const release = () => { heldRef.current = null; };

  return (
    <SectionShell id="why" kicker={stakes.kicker} title={stakes.lead} sub={stakes.sub} headerClassName="max-w-3xl" className="relative overflow-hidden">
      <div className="grid-lines-light" aria-hidden="true" />

      {/* ═══════════ Desktop — the wired schematic ═══════════ */}
      <div ref={stageRef} className="relative mx-auto mt-10 hidden max-w-5xl lg:block 3xl:max-w-6xl">
        <div className="relative aspect-[1000/400]">
          {/* column captions */}
          <p className="absolute left-[19%] top-0 -translate-x-1/2 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Today's challenge
          </p>
          <p className="absolute left-[81%] top-0 -translate-x-1/2 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            What we're building
          </p>

          {/* the wiring */}
          <svg viewBox={`0 0 1000 ${STAGE_H}`} className="absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="none">
            <defs>
              {/* userSpaceOnUse: an objectBoundingBox gradient is undefined for
                  the middle wire (a straight line has a zero-height bbox), which
                  left row 2 colorless. Stage coordinates work for all three. */}
              <linearGradient id="wire-active" gradientUnits="userSpaceOnUse" x1="345" y1="0" x2="655" y2="0">
                <stop offset="0%" stopColor="hsl(226 15% 70%)" />
                <stop offset="45%" stopColor="hsl(223 83% 52%)" />
                <stop offset="100%" stopColor="hsl(149 64% 38%)" />
              </linearGradient>
            </defs>
            {FLOW_PATHS.map((d, i) => (
              <g key={d}>
                {/* base wire — draws itself on first reveal */}
                <motion.path
                  d={d}
                  fill="none"
                  stroke="hsl(var(--lx-line))"
                  strokeWidth="1.5"
                  initial={reduced ? false : { pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={revealViewport}
                  transition={{ duration: 1.1, delay: 0.25 + i * 0.18, ease: brandEase }}
                />
                {/* spotlight overlay (also the measuring path for the pulse) */}
                <motion.path
                  ref={(el) => { pathRefs.current[i] = el; }}
                  d={d}
                  fill="none"
                  stroke="url(#wire-active)"
                  strokeWidth="2"
                  animate={{ opacity: active === i ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: brandEase }}
                />
              </g>
            ))}
            {/* the single pulse — position driven imperatively by the loop above */}
            {live && <circle ref={dotRef} r="4" cx="-20" cy="-20" opacity="0" fill="hsl(223 83% 52%)" />}
          </svg>

          {/* problems — raw signals entering the layer */}
          {stakes.problems.map((p, i) => (
            <div key={p} className="absolute left-0 flex w-[34%] justify-end" style={{ top: `${(ROW_Y[i] / STAGE_H) * 100}%`, transform: "translateY(-50%)" }}>
              <motion.div
                tabIndex={0}
                onMouseEnter={() => hold(i)}
                onMouseLeave={release}
                onFocus={() => hold(i)}
                onBlur={release}
                className="flex cursor-default items-center gap-3 rounded-full border bg-card py-2.5 pl-4 pr-5 outline-none"
                animate={{
                  borderColor: active === i ? "hsl(223 83% 52% / 0.45)" : "hsl(222 33% 92%)",
                  boxShadow: active === i ? "0 10px 28px -10px hsl(223 83% 52% / 0.3)" : "0 1px 2px hsl(228 45% 8% / 0.04)",
                  scale: active === i ? 1.03 : 1,
                }}
                transition={{ duration: 0.4, ease: brandEase }}
              >
                <span className={`font-display text-[11px] font-bold tabular-nums transition-colors duration-300 ${active === i ? "text-primary-readable" : "text-muted-foreground"}`}>
                  0{i + 1}
                </span>
                <span className="whitespace-nowrap text-[15px] text-[hsl(var(--lx-ink-2))] dark:text-muted-foreground">{p}</span>
              </motion.div>
            </div>
          ))}

          {/* the intelligence core — anchored to the wire crossing, no stray rings */}
          <div className="absolute left-1/2 z-10 -translate-x-1/2 -translate-y-[44px]" style={{ top: `${(CORE_Y / STAGE_H) * 100}%` }}>
            <div className="relative flex flex-col items-center">
              <span className="relative flex h-[88px] w-[88px] items-center justify-center rounded-full border border-[hsl(var(--lx-line))] bg-white shadow-[0_18px_44px_-12px_hsl(223_83%_52%/0.35)]">
                <img src={lumofyMark} alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
              </span>
              <span className="mt-3 whitespace-nowrap text-center font-display text-[10px] font-bold uppercase leading-tight tracking-[0.16em] text-[hsl(var(--lx-ink-3))] dark:text-muted-foreground">
                Lumofy
                <br />
                intelligence layer
              </span>
            </div>
          </div>

          {/* outcomes — clarity leaving the layer */}
          {stakes.solutions.map((s, i) => (
            <div key={s} className="absolute left-[66%] flex w-[34%] justify-start" style={{ top: `${(ROW_Y[i] / STAGE_H) * 100}%`, transform: "translateY(-50%)" }}>
              <motion.div
                tabIndex={0}
                onMouseEnter={() => hold(i)}
                onMouseLeave={release}
                onFocus={() => hold(i)}
                onBlur={release}
                className="flex cursor-default items-center gap-2.5 rounded-2xl border bg-card px-5 py-3 outline-none"
                animate={{
                  borderColor: active === i ? "hsl(149 64% 38% / 0.5)" : "hsl(222 33% 92%)",
                  boxShadow: active === i ? "0 12px 32px -10px hsl(149 64% 38% / 0.3)" : "0 1px 2px hsl(228 45% 8% / 0.04)",
                  x: active === i ? 4 : 0,
                }}
                transition={{ duration: 0.4, ease: brandEase }}
              >
                <motion.span
                  aria-hidden="true"
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--brand-aurora)/0.12)]"
                  animate={{ scale: active === i ? [1, 1.25, 1] : 1 }}
                  transition={{ duration: 0.5, ease: brandEase }}
                >
                  <Check className="h-3.5 w-3.5 text-[hsl(var(--brand-aurora-readable))]" />
                </motion.span>
                <span className="whitespace-nowrap text-[15px] font-semibold text-foreground">{s}</span>
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ Mobile / tablet — the same journey, stacked ═══════════ */}
      <div className="relative mx-auto mt-12 max-w-md space-y-4 lg:hidden">
        <div className="flex flex-col items-center gap-2.5 pb-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--lx-line))] dark:border-border bg-white shadow-md">
            <img src={lumofyMark} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
          </span>
          <span className="text-center font-display text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--lx-ink-3))] dark:text-muted-foreground">
            Lumofy intelligence layer
          </span>
        </div>
        {stakes.problems.map((p, i) => (
          <motion.div
            key={p}
            className="rounded-2xl border bg-card p-5"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={revealViewport}
            animate={{ borderColor: active === i ? "hsl(223 83% 52% / 0.4)" : "hsl(222 33% 92%)" }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: brandEase }}
          >
            <div className="flex items-center gap-3">
              <span className="font-display text-[11px] font-bold tabular-nums text-muted-foreground">0{i + 1}</span>
              <span className="text-[15px] text-[hsl(var(--lx-ink-2))] dark:text-muted-foreground">{p}</span>
            </div>
            <div className="relative my-3 ml-[5px] h-7 w-px bg-gradient-to-b from-[hsl(var(--lx-line))] via-primary/50 to-[hsl(var(--brand-aurora)/0.5)]" aria-hidden="true">
              {live && active === i && (
                <motion.span
                  className="absolute -left-[2.5px] h-[6px] w-[6px] rounded-full bg-primary"
                  animate={{ top: ["0%", "85%"], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
                />
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--brand-aurora)/0.12)]">
                <Check className="h-3.5 w-3.5 text-[hsl(var(--brand-aurora-readable))]" />
              </span>
              <span className="text-[15px] font-semibold text-foreground">{stakes.solutions[i]}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
};

export default WhyItMattersSection;
