import { motion } from "framer-motion";
import { Play } from "lucide-react";
import SectionShell from "./SectionShell";
import { pillars } from "@/data/careers";
import { fadeUp, staggerContainer, revealViewport, brandEase, prefersReducedMotion } from "@/lib/motion";
import { hueClasses } from "@/lib/deptColor";
import bellCurve from "@/assets/brand/products/bell-curve.webp";
import enpsScore from "@/assets/brand/products/enps-score.webp";

// "The system you'll help build" — the platform hierarchy. Performance
// Management and eNPS carry the official product shots; Competency / Learning
// carry brand-built mockups of our own (their site images are being replaced,
// so we render stylized Lumofy-language interfaces instead of copies). Every
// visual shares ONE soft entrance — a quick fade-and-settle (0.45s, brand
// curve) — fast, smooth, no choreography. Copy renders verbatim from `pillars`.
const EYEBROWS = ["The core", "Defines", "Builds", "Sustains"];

// Quiet tinted mat (the official shots carry their own window chrome).
const Mat = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`overflow-hidden rounded-xl border border-[hsl(var(--lx-line))] dark:border-border bg-[hsl(var(--lx-surface-2))] p-3 sm:p-4 ${className}`}>
    {children}
  </div>
);

// The one shared visual entrance: fade + settle, fast and smooth.
const SoftReveal = ({ children }: { children: React.ReactNode }) => {
  const reduced = prefersReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={revealViewport}
      transition={{ duration: 0.45, ease: brandEase, delay: 0.1 }}
    >
      {children}
    </motion.div>
  );
};

const Shot = ({ src }: { src: string }) => (
  <img src={src} alt="" aria-hidden="true" loading="lazy" className="aspect-[16/10] w-full rounded-lg object-cover object-top" />
);

// Shared window shell for the brand-built mockups.
const MockWindow = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex aspect-[16/10] w-full flex-col overflow-hidden rounded-lg border border-[hsl(var(--lx-line))] bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-[hsl(var(--lx-line))] bg-[#fbfcfe] px-3 py-1.5">
      <span className="text-[9px] font-semibold text-[#3d4661]">{title}</span>
      <span className="chrome-dots scale-75" aria-hidden="true"><i /><i /><i /></span>
    </div>
    <div className="flex-1 p-3">{children}</div>
  </div>
);

// Competency Framework — three competency tiers mapping out into skill chips
// (static layout; the SoftReveal wrapper carries the motion).
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

const Tags = ({ tags, core = false }: { tags: string[]; core?: boolean }) => (
  <ul className={`flex flex-wrap gap-1.5 ${core ? "" : "justify-center"}`} aria-label="Capabilities">
    {tags.map((t) => (
      <li
        key={t}
        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
          core
            ? "bg-accent text-accent-foreground"
            : "border border-[hsl(var(--lx-line))] dark:border-border bg-[hsl(var(--lx-surface-2))] dark:bg-secondary text-[hsl(var(--lx-ink-2))] dark:text-secondary-foreground"
        }`}
      >
        {t}
      </li>
    ))}
  </ul>
);

const WhatWeBuildSection = () => {
  const [core, ...modules] = pillars;
  const coreHue = hueClasses[core.hue];
  const MODULE_VISUALS = [<CompetencyMock key="c" />, <LearningMock key="l" />, <Shot key="e" src={enpsScore} />];

  return (
    <SectionShell
      id="building"
      kicker="The system you'll help build"
      title="One platform connecting the systems behind workforce growth."
      sub="Lumofy brings performance, competencies, learning, and engagement into one intelligence layer so organizations can understand people clearly and help them grow."
      className="band-tint"
      headerClassName="max-w-3xl"
    >
      <motion.div
        className="mt-12"
        variants={staggerContainer(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
      >
        {/* ═══ The core — Performance Management System, featured wide ═══ */}
        <motion.div
          variants={fadeUp}
          className="lx-card relative grid items-center gap-7 !border-primary/35 p-6 shadow-[0_2px_4px_hsl(223_83%_52%/0.06),0_24px_56px_-16px_hsl(223_83%_52%/0.25)] sm:p-8 lg:grid-cols-[1fr_1.05fr] lg:gap-10"
        >
          <div>
            <span className={`inline-flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.16em] ${coreHue.textReadable}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${coreHue.bg}`} aria-hidden="true" />
              {EYEBROWS[0]}
            </span>
            <h3 className="mt-2.5 text-xl font-bold leading-tight text-foreground sm:text-2xl">{core.name}</h3>
            <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-[hsl(var(--lx-ink-2))] dark:text-muted-foreground">{core.line}</p>
            <div className="mt-4">
              <Tags tags={core.tags} core />
            </div>
          </div>
          <Mat>
            <SoftReveal>
              <Shot src={bellCurve} />
            </SoftReveal>
          </Mat>
        </motion.div>

        {/* connector tree: a drop from the core, a rail, and a drop into each module */}
        <div aria-hidden="true" className="relative hidden h-12 lg:block">
          <div className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-gradient-to-b from-primary/50 to-primary/25" />
          <div className="absolute inset-x-[16.666%] top-6 h-px bg-gradient-to-r from-[hsl(var(--brand-eclipse)/0.3)] via-primary/30 to-[hsl(var(--brand-nova)/0.3)]" />
          {["left-[16.666%]", "left-1/2", "left-[83.333%]"].map((pos, i) => (
            <div key={pos} className={`absolute ${pos} top-6 h-6 w-px -translate-x-1/2 bg-gradient-to-b from-primary/25 to-transparent`}>
              <span className={`absolute -top-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${hueClasses[modules[i].hue].bg}`} />
            </div>
          ))}
        </div>
        {/* mobile/tablet: one shared stub keeps the parent→children read */}
        <div aria-hidden="true" className="mx-auto h-9 w-px bg-gradient-to-b from-primary/40 to-primary/10 lg:hidden" />

        {/* ═══ The three modules that plug into the core ═══ */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {modules.map((p, i) => {
            const c = hueClasses[p.hue];
            return (
              <motion.div
                key={p.name}
                variants={fadeUp}
                className="lx-card group flex flex-col p-5 text-center transition-shadow duration-300 hover:shadow-[0_2px_4px_hsl(228_45%_8%/0.05),0_24px_48px_-12px_hsl(228_45%_8%/0.18)]"
              >
                <Mat className="mb-5">
                  <SoftReveal>{MODULE_VISUALS[i]}</SoftReveal>
                </Mat>
                <span className={`inline-flex items-center justify-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.16em] ${c.textReadable}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${c.bg}`} aria-hidden="true" />
                  {EYEBROWS[i + 1]}
                </span>
                <h3 className="mt-2 text-[1.05rem] font-bold leading-tight text-foreground">{p.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[hsl(var(--lx-ink-3))] dark:text-muted-foreground">{p.line}</p>
                <div className="mt-4">
                  <Tags tags={p.tags} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

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
