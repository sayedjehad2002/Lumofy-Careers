import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play } from "lucide-react";
import SectionShell from "./SectionShell";
import { pillars } from "@/data/careers";
import { revealViewport, brandEase, prefersReducedMotion } from "@/lib/motion";
import { hueClasses } from "@/lib/deptColor";
import bellCurve from "@/assets/brand/products/bell-curve.webp";
import enpsScore from "@/assets/brand/products/enps-score.webp";
import lumofyMark from "@/assets/brand/lumofy-mark.svg";

// "The system you'll help build" — reimagined as a LIVE intelligence-layer
// showcase. The four systems sit on one connected board: a segmented control
// with a sliding hue indicator selects (or auto-cycles through) a system,
// crossfading a large product panel, while a "Workforce intelligence layer"
// bar lights the dot of whatever's active — so the section reads as ONE
// platform connecting the systems, not four separate cards. Performance
// Management leads as THE CORE (default tab). Soft motion only (slide + spring
// + crossfade); auto-advance pauses on hover/focus and off-screen, and is off
// entirely under prefers-reduced-motion. Copy renders verbatim from `pillars`.
const SHORT = ["Performance", "Competency", "Learning", "Engagement"];
const EYEBROWS = ["The core", "Defines", "Builds", "Sustains"];
const AUTO_MS = 4200;

// Quiet tinted mat (the official shots carry their own window chrome).
const Mat = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`overflow-hidden rounded-xl border border-[hsl(var(--lx-line))] dark:border-border bg-[hsl(var(--lx-surface-2))] p-3 sm:p-4 ${className}`}>
    {children}
  </div>
);

const Shot = ({ src }: { src: string }) => (
  <img
    src={src}
    alt=""
    aria-hidden="true"
    loading="lazy"
    className="aspect-[16/10] w-full rounded-lg object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
  />
);

// Shared window shell for the brand-built mockups.
const MockWindow = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex aspect-[16/10] w-full flex-col overflow-hidden rounded-lg border border-[hsl(var(--lx-line))] bg-white shadow-sm transition-transform duration-500 ease-out group-hover:scale-[1.03]">
    <div className="flex items-center justify-between border-b border-[hsl(var(--lx-line))] bg-[#fbfcfe] px-3 py-1.5">
      <span className="text-[9px] font-semibold text-[#3d4661]">{title}</span>
      <span className="chrome-dots scale-75" aria-hidden="true"><i /><i /><i /></span>
    </div>
    <div className="flex-1 p-3">{children}</div>
  </div>
);

// Competency Framework — three competency tiers mapping out into skill chips.
const CompetencyMock = () => {
  const tiers = [
    { hue: "bg-brand-sirius", chips: ["w-14", "w-9"] },
    { hue: "bg-brand-eclipse", chips: ["w-10", "w-14"] },
    { hue: "bg-brand-aurora", chips: ["w-12", "w-8"] },
  ];
  return (
    <MockWindow title="Competency Framework">
      <div className="flex h-full flex-col justify-around">
        {tiers.map((t) => (
          <div key={t.hue} className="flex items-center gap-2">
            <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ${t.hue}/15`}>
              <span className={`h-2.5 w-2.5 rounded-sm ${t.hue}`} />
            </span>
            <span className="h-1.5 w-12 rounded-full bg-[#dde0e5]" />
            <span className="h-px flex-1 bg-gradient-to-r from-[#dde0e5] to-transparent" />
            {t.chips.map((w, j) => (
              <span key={j} className={`h-4 ${w} rounded-full border border-[#e5e9f2] bg-[#f6f8fc]`} />
            ))}
          </div>
        ))}
      </div>
    </MockWindow>
  );
};

// Learning & Development — a course library with a development plan filled in.
const LearningMock = () => {
  const tiles = ["from-brand-sirius/25 to-brand-sirius/5", "from-brand-eclipse/25 to-brand-eclipse/5", "from-brand-aurora/25 to-brand-aurora/5", "from-brand-stellar/25 to-brand-stellar/5"];
  return (
    <MockWindow title="Learning Library">
      <div className="flex h-full flex-col gap-2.5">
        <div className="grid flex-1 grid-cols-2 gap-2">
          {tiles.map((g) => (
            <div key={g} className={`relative flex items-center justify-center rounded-md bg-gradient-to-br ${g}`}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 shadow-sm">
                <Play className="ml-px h-2 w-2 fill-[#215bea] text-[#215bea]" aria-hidden="true" />
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-9 rounded-full bg-[#dde0e5]" />
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eef2ff]">
            <div className="h-full w-[72%] rounded-full bg-[#215bea]" />
          </div>
        </div>
      </div>
    </MockWindow>
  );
};

const Tags = ({ tags }: { tags: string[] }) => (
  <ul className="flex flex-wrap gap-1.5" aria-label="Capabilities">
    {tags.map((t) => (
      <li key={t} className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
        {t}
      </li>
    ))}
  </ul>
);

const WhatWeBuildSection = () => {
  const reduced = prefersReducedMotion();
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const pausedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const VISUALS = [<Shot key="pm" src={bellCurve} />, <CompetencyMock key="cf" />, <LearningMock key="ld" />, <Shot key="en" src={enpsScore} />];

  // Only auto-cycle while the board is on-screen (perf + UX).
  useEffect(() => {
    if (!rootRef.current || typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    obs.observe(rootRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !inView) return;
    const t = setInterval(() => {
      if (!pausedRef.current) setActive((a) => (a + 1) % pillars.length);
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [reduced, inView]);

  const p = pillars[active];
  const c = hueClasses[p.hue];
  const hueVar = `--brand-${p.hue}`;
  const pause = () => { pausedRef.current = true; };
  const resume = () => { pausedRef.current = false; };
  const move = (next: number) => setActive((next + pillars.length) % pillars.length);

  return (
    <SectionShell
      id="building"
      kicker="The system you'll help build"
      title="One platform connecting the systems behind workforce growth."
      sub="Lumofy brings performance, competencies, learning, and engagement into one intelligence layer so organizations can understand people clearly and help them grow."
      className="band-tint"
      headerClassName="max-w-3xl"
    >
      <div ref={rootRef} className="mt-12" onMouseEnter={pause} onMouseLeave={resume}>
        {/* ═══ segmented control — selects a system; the hue pill slides ═══ */}
        <div
          role="tablist"
          aria-label="Platform systems"
          className="mx-auto flex max-w-2xl gap-1 rounded-full border border-[hsl(var(--lx-line))] dark:border-border bg-card p-1 shadow-sm"
        >
          {pillars.map((pl, i) => {
            const hc = hueClasses[pl.hue];
            const sel = active === i;
            return (
              <button
                key={pl.name}
                role="tab"
                id={`build-tab-${i}`}
                aria-selected={sel}
                aria-controls="build-panel"
                tabIndex={sel ? 0 : -1}
                onClick={() => setActive(i)}
                onFocus={() => { pause(); setActive(i); }}
                onBlur={resume}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") { e.preventDefault(); move(active + 1); }
                  if (e.key === "ArrowLeft") { e.preventDefault(); move(active - 1); }
                }}
                className={`relative flex-1 rounded-full px-2 py-2 text-center text-[11px] font-semibold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary sm:text-sm ${
                  sel ? hc.textReadable : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {sel && (
                  <motion.span
                    layoutId="build-tab-bg"
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full"
                    style={{ background: `hsl(var(${hueVar}) / 0.14)`, boxShadow: `inset 0 0 0 1px hsl(var(${hueVar}) / 0.25)` }}
                    transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
                  <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${hc.bg}`} aria-hidden="true" />
                  <span className="truncate">{SHORT[i]}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* ═══ showcase panel — crossfades to the active system ═══ */}
        <motion.div
          id="build-panel"
          role="tabpanel"
          aria-labelledby={`build-tab-${active}`}
          className="lx-card group relative mt-6 overflow-hidden p-6 transition-[border-color] duration-300 sm:p-8 lg:p-10"
          style={{ borderColor: `hsl(var(${hueVar}) / 0.32)` }}
          initial={reduced ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={revealViewport}
          transition={{ duration: 0.5, ease: brandEase }}
        >
          {/* hue glow wash — repaints to the active system's color */}
          <motion.div
            key={`glow-${active}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: `radial-gradient(55% 70% at 88% 0%, hsl(var(${hueVar}) / 0.1), transparent 70%)` }}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: brandEase }}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={reduced ? false : { opacity: 0, x: 22 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: -22 }}
              transition={{ duration: 0.32, ease: brandEase }}
              className="relative grid items-center gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10"
            >
              <div>
                <span className={`inline-flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.16em] ${c.textReadable}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${c.bg}`} aria-hidden="true" />
                  {EYEBROWS[active]}
                </span>
                <h3 className="mt-2.5 text-xl font-bold leading-tight text-foreground sm:text-2xl">{p.name}</h3>
                <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-[hsl(var(--lx-ink-2))] dark:text-muted-foreground">{p.line}</p>
                <div className="mt-4">
                  <Tags tags={p.tags} />
                </div>
              </div>
              <Mat>{VISUALS[active]}</Mat>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ═══ the intelligence layer — every system plugs into it ═══ */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={revealViewport}
          transition={{ duration: 0.5, delay: 0.15, ease: brandEase }}
          className="mx-auto mt-6 flex max-w-xl items-center justify-center gap-3 rounded-full border border-[hsl(var(--lx-line))] dark:border-border bg-card px-5 py-3 shadow-sm"
        >
          <img src={lumofyMark} alt="" aria-hidden="true" className="h-6 w-6 object-contain" />
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--lx-ink-2))] dark:text-muted-foreground">
            Workforce intelligence layer
          </span>
          <span className="ml-1 flex items-center gap-1.5" aria-hidden="true">
            {pillars.map((pl, i) => (
              <span
                key={pl.name}
                className={`h-1.5 w-1.5 rounded-full ${hueClasses[pl.hue].bg} transition-all duration-300 ${active === i ? "scale-150" : "opacity-30"}`}
              />
            ))}
          </span>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={revealViewport}
        transition={{ duration: 0.5, delay: 0.3, ease: brandEase }}
        className="mt-8 text-center text-sm text-[hsl(var(--lx-ink-3))] dark:text-muted-foreground"
      >
        Together, these systems turn workforce signals into <span className="font-semibold text-foreground">intelligent action</span>.
      </motion.p>
    </SectionShell>
  );
};

export default WhatWeBuildSection;
