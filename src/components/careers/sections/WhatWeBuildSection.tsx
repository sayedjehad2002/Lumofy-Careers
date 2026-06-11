import { motion } from "framer-motion";
import { LayoutGrid, TrendingUp, GraduationCap, HeartPulse, type LucideIcon } from "lucide-react";
import SectionShell from "./SectionShell";
import { pillars } from "@/data/careers";
import { fadeUp, staggerContainer, revealViewport, brandEase } from "@/lib/motion";
import { hueClasses } from "@/lib/deptColor";
import lumofyMark from "@/assets/brand/lumofy-mark.svg";

// "The system you'll help build" — the main site's offer-card pattern: a tint
// band carrying four white cards with the EXACT eyebrow vocabulary lumofy.ai
// uses ("The core" / Defines / Builds / Sustains), an icon tile, and the
// product line. Performance Management leads as the core pillar of the
// platform — same hierarchy as the main site's offerings row — and its card
// carries a primary ring so the hierarchy reads at a glance.
// Pillar copy renders verbatim from `pillars`.
const ICONS: LucideIcon[] = [TrendingUp, LayoutGrid, GraduationCap, HeartPulse];
// Main-site card eyebrows, same order as the main site's offerings row.
const VERBS = ["The core", "Defines", "Builds", "Sustains"];

const WhatWeBuildSection = () => (
  <SectionShell
    id="building"
    kicker="The system you'll help build"
    title="One platform connecting the systems behind workforce growth."
    sub="Lumofy brings performance, competencies, learning, and engagement into one intelligence layer so organizations can understand people clearly and help them grow."
    className="band-tint"
    headerClassName="max-w-3xl"
  >
    <motion.div
      className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      variants={staggerContainer(0.08)}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
    >
      {pillars.map((p, i) => {
        const c = hueClasses[p.hue];
        const Icon = ICONS[i];
        const isCore = i === 0; // Performance Management — the platform's core pillar
        return (
          <motion.div
            key={p.name}
            variants={fadeUp}
            className={`lx-card group flex flex-col items-center px-6 py-8 text-center transition-shadow duration-300 hover:shadow-[0_2px_4px_hsl(228_45%_8%/0.05),0_24px_48px_-12px_hsl(228_45%_8%/0.18)] ${
              isCore ? "!border-primary/35 shadow-[0_2px_4px_hsl(223_83%_52%/0.06),0_18px_44px_-12px_hsl(223_83%_52%/0.22)]" : ""
            }`}
          >
            <span className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${c.bgSoft} transition-shadow duration-300 ${c.glow}`}>
              <Icon className={`h-6 w-6 ${c.text}`} aria-hidden="true" />
            </span>
            <span className={`inline-flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.16em] ${c.textReadable}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${c.bg}`} aria-hidden="true" />
              {VERBS[i]}
            </span>
            <h3 className="mt-2.5 text-[1.05rem] font-bold leading-tight text-foreground">{p.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--lx-ink-3))] dark:text-muted-foreground">{p.line}</p>
          </motion.div>
        );
      })}
    </motion.div>

    {/* the four modules are one system — the layer a new hire actually builds on */}
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={revealViewport}
      transition={{ duration: 0.5, delay: 0.2, ease: brandEase }}
      className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-3 rounded-full border border-[hsl(var(--lx-line))] dark:border-border bg-card px-6 py-3.5 shadow-sm"
    >
      <img src={lumofyMark} alt="" aria-hidden="true" className="h-6 w-6 object-contain" />
      <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--lx-ink-2))] dark:text-muted-foreground">
        Workforce intelligence layer
      </span>
    </motion.div>

    <motion.p
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={revealViewport}
      transition={{ duration: 0.5, delay: 0.3, ease: brandEase }}
      className="mt-5 text-center text-sm text-[hsl(var(--lx-ink-3))] dark:text-muted-foreground"
    >
      Together, these systems turn workforce signals into <span className="font-semibold text-foreground">intelligent action</span>.
    </motion.p>
  </SectionShell>
);

export default WhatWeBuildSection;
