import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import SectionShell from "./SectionShell";
import { stakes } from "@/data/careers";
import { fadeUp, staggerContainer, revealViewport, brandEase, prefersReducedMotion } from "@/lib/motion";
import lumofyLogo from "@/assets/lumofy-mark.png";

// "The problem worth joining" — ONE cinematic transformation panel over an
// intelligence-map field (dotted grid + radial glow): Today's challenge →
// the Lumofy intelligence core → What we're building. The connector draws in
// and a signal pulse travels left → core → right (turning Sirius → Aurora as
// the problem becomes the outcome). Same motion language as WhatWeBuildSection:
// GPU-only (transform/opacity/SVG), pulses pause when the panel is off-screen,
// and everything is reduced-motion safe. Connector/field/logo art is decorative
// (aria-hidden). Copy comes verbatim from `stakes` — never edited here.
const WhyItMattersSection = () => {
  const reduced = prefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const live = !reduced && active;

  return (
    <SectionShell id="why" kicker={stakes.kicker} title={stakes.lead} sub={stakes.sub} headerClassName="max-w-3xl">
      <motion.div
        ref={ref}
        className="relative mt-12 overflow-hidden rounded-2xl border border-border bg-card/40 p-5 backdrop-blur-sm sm:mt-14 sm:p-7 lg:p-9"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={revealViewport}
        transition={{ duration: 0.6, ease: brandEase }}
      >
        {/* intelligence-map field */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(50% 60% at 50% 50%, hsl(var(--primary) / 0.10), transparent 70%)" }} />
        </div>

        <motion.div
          className="relative grid items-stretch gap-0 lg:grid-cols-[1fr_auto_1fr]"
          variants={staggerContainer(0.12)}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
        >
          {/* LEFT — Today's challenge. Hover lift goes through framer (whileHover) —
              a CSS hover:-translate would be overridden by framer's inline transform
              after the entry animation settles. CSS transitions stay color-only so
              they never fight framer's per-frame transform/opacity writes. */}
          <motion.div
            variants={fadeUp}
            whileHover={{ y: -2 }}
            className="group relative z-10 rounded-xl border border-border/60 bg-card/70 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-primary/30 hover:bg-card/80 sm:p-7"
          >
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Today's challenge</p>
            <ul className="space-y-3.5">
              {stakes.problems.map((p) => (
                <li key={p} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/50 transition-colors duration-300 group-hover:bg-muted-foreground" />
                  {p}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* vertical connector stub (mobile/tablet) — animates with its OWN props so
              it doesn't consume a stagger slot while display:none on desktop */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={revealViewport}
            transition={{ duration: 0.4, delay: 0.15, ease: brandEase }}
            className="mx-auto h-9 w-px bg-gradient-to-b from-border via-primary/50 to-primary/30 lg:hidden"
          />

          {/* CENTER — the Lumofy intelligence core + connector */}
          <motion.div variants={fadeUp} className="relative z-10 flex w-full items-center justify-center py-1 lg:w-64 lg:py-0">
            {/* desktop connector: draws in, then carries the signal pulse through the core */}
            <svg
              className="absolute inset-0 hidden h-full w-full lg:block"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden="true"
            >
              <motion.line
                x1="0" y1="50" x2="35" y2="50"
                stroke="hsl(var(--primary))" strokeOpacity="0.45" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
                initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={revealViewport}
                transition={{ duration: 0.7, delay: 0.35, ease: brandEase }}
              />
              <motion.line
                x1="65" y1="50" x2="100" y2="50"
                stroke="hsl(var(--brand-aurora))" strokeOpacity="0.45" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
                initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={revealViewport}
                transition={{ duration: 0.7, delay: 0.55, ease: brandEase }}
              />
              <circle cx="1.5" cy="50" r="1.2" fill="hsl(var(--primary))" />
              <circle cx="98.5" cy="50" r="1.2" fill="hsl(var(--brand-aurora))" />
              {live && (
                /* Literal HSL values (dark-theme Sirius → Aurora) so framer can
                   genuinely interpolate the fill — hsl(var(--token)) keyframes
                   degrade to a discrete swap. The color change happens while the
                   pulse pauses under the core (cx 50, times 0.45–0.55). */
                <motion.circle
                  r="1.4"
                  initial={{ cx: 0, cy: 50, opacity: 0 }}
                  animate={{
                    cx: [0, 50, 50, 100],
                    opacity: [0, 1, 1, 0],
                    fill: ["hsl(223 83% 52%)", "hsl(223 83% 52%)", "hsl(149 65% 45%)", "hsl(149 65% 45%)"],
                  }}
                  transition={{ duration: 3, times: [0, 0.45, 0.55, 1], ease: "easeInOut", repeat: Infinity, repeatDelay: 2.4 }}
                />
              )}
            </svg>

            <div className="group relative flex flex-col items-center gap-2.5 lg:px-6">
              {/* soft halo — breathes gently while on screen */}
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.16), transparent 70%)" }}
                animate={live ? { opacity: [0.6, 1, 0.6] } : { opacity: 0.8 }}
                transition={live ? { duration: 4, ease: "easeInOut", repeat: Infinity } : undefined}
              />
              <span className="node-core-bg relative flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/40 shadow-[0_0_44px_hsl(var(--primary)/0.3)] transition-shadow duration-300 group-hover:shadow-[0_0_60px_hsl(var(--primary)/0.45)]">
                <img src={lumofyLogo} alt="" aria-hidden="true" className="h-10 w-10 object-contain" />
              </span>
              {/* On lg the label is absolutely positioned below the node so the
                  centering box is the 80px node alone — that puts the node's center
                  exactly on the connector line (y = 50% of the stretched row).
                  In-flow on mobile, where there is no horizontal connector. */}
              <span className="relative whitespace-nowrap text-center font-mono text-[10px] uppercase leading-tight tracking-wider text-primary-readable lg:absolute lg:left-1/2 lg:top-full lg:mt-2.5 lg:-translate-x-1/2">
                Lumofy
                <br />
                intelligence layer
              </span>
            </div>
          </motion.div>

          {/* vertical connector stub (mobile/tablet) — own props; see note above */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={revealViewport}
            transition={{ duration: 0.4, delay: 0.3, ease: brandEase }}
            className="mx-auto h-9 w-px bg-gradient-to-b from-primary/30 via-[hsl(var(--brand-aurora)/0.5)] to-border lg:hidden"
          />

          {/* RIGHT — What we're building (same framer-owned hover lift as the left card) */}
          <motion.div
            variants={fadeUp}
            whileHover={{ y: -2 }}
            className="group relative z-10 rounded-xl border border-primary/20 bg-primary/5 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-primary/40 sm:p-7"
          >
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-primary-readable">What we're building</p>
            <ul className="space-y-3.5">
              {stakes.solutions.map((s) => (
                <li key={s} className="flex items-center gap-3 text-sm text-foreground">
                  <Check
                    aria-hidden="true"
                    className="h-4 w-4 flex-shrink-0 text-[hsl(var(--brand-aurora))] transition-[filter] duration-300 group-hover:drop-shadow-[0_0_6px_hsl(var(--brand-aurora)/0.6)]"
                  />
                  {s}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        {/* proof — integrated as the panel's footer line */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={revealViewport}
          transition={{ duration: 0.5, delay: 0.45, ease: brandEase }}
          className="relative mt-7 border-t border-border/40 pt-5 text-center text-sm text-muted-foreground"
        >
          <span className="font-semibold text-foreground">{stakes.proof.lead}</span> {stakes.proof.rest}
        </motion.p>
      </motion.div>
    </SectionShell>
  );
};

export default WhyItMattersSection;
