import { motion } from "framer-motion";
import { Check } from "lucide-react";
import SectionShell from "./SectionShell";
import { stakes } from "@/data/careers";
import { fadeUp, staggerContainer, revealViewport, brandEase } from "@/lib/motion";
import lumofyLogo from "@/assets/lumofy-mark.png";

// "The problem worth joining" — a Transformation System: today's challenge -> the Lumofy
// intelligence layer -> what we're building. ONE calm, comprehension-led reveal on scroll
// (the shared fadeUp/stagger; MotionConfig makes it reduced-motion safe globally). NO
// continuous motion — the section stays still after it appears. The connector signal and
// the logo mark are decorative (aria-hidden).
const lineReveal = {
  hidden: { opacity: 0, scaleX: 0 },
  show: { opacity: 1, scaleX: 1, transition: { duration: 0.8, ease: brandEase } },
};

const WhyItMattersSection = () => (
  <SectionShell id="why" kicker={stakes.kicker} title={stakes.lead} sub={stakes.sub} headerClassName="max-w-3xl">
    <motion.div
      className="mt-12 sm:mt-14"
      variants={staggerContainer()}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
    >
      <div className="relative grid items-stretch gap-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-3">
        {/* the signal connecting the two sides — draws once (desktop) */}
        <motion.div
          aria-hidden="true"
          variants={lineReveal}
          className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-px origin-left -translate-y-1/2 lg:block"
          style={{ background: "linear-gradient(90deg, transparent, hsl(var(--muted-foreground) / 0.3) 15%, hsl(var(--primary) / 0.6) 50%, hsl(var(--brand-aurora) / 0.45) 85%, transparent)" }}
        />

        {/* LEFT — Today's challenge */}
        <motion.div variants={fadeUp} className="relative z-10 rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-sm sm:p-7">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Today's challenge</p>
          <ul className="space-y-3.5">
            {stakes.problems.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/50" />
                {p}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* CENTER — Lumofy intelligence layer (the system's heart: halo + node treatment
            matched to the WhatWeBuild Core so the mark reads identically across sections) */}
        <motion.div variants={fadeUp} className="relative z-20 flex items-center justify-center py-1 lg:px-6 lg:py-0">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.14), transparent 70%)" }}
          />
          <div className="relative flex flex-col items-center gap-2.5">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 shadow-[0_0_36px_hsl(var(--primary)/0.35)]"
              style={{ background: "radial-gradient(130% 130% at 50% 0%, hsl(var(--primary) / 0.22), hsl(222 30% 9%))" }}
            >
              <img src={lumofyLogo} alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
            </span>
            <span className="text-center font-mono text-[10px] uppercase leading-tight tracking-wider text-primary-readable">
              Lumofy
              <br />
              intelligence layer
            </span>
          </div>
        </motion.div>

        {/* RIGHT — What we're building */}
        <motion.div variants={fadeUp} className="relative z-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 backdrop-blur-sm sm:p-7">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-primary-readable">What we're building</p>
          <ul className="space-y-3.5">
            {stakes.solutions.map((s) => (
              <li key={s} className="flex items-center gap-3 text-sm text-foreground">
                <Check aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-[hsl(var(--brand-aurora))]" />
                {s}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* proof */}
      <motion.p variants={fadeUp} className="mt-7 text-center text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{stakes.proof.lead}</span> {stakes.proof.rest}
      </motion.p>
    </motion.div>
  </SectionShell>
);

export default WhyItMattersSection;
