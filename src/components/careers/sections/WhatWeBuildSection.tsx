import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, TrendingUp, GraduationCap, HeartPulse, type LucideIcon } from "lucide-react";
import SectionShell from "./SectionShell";
import { pillars } from "@/data/careers";
import { fadeUp, staggerContainer, revealViewport, brandEase, prefersReducedMotion } from "@/lib/motion";
import { hueClasses } from "@/lib/deptColor";
import lumofyLogo from "@/assets/lumofy-mark.png";

// "The system you'll help build" — an architecture-stack moment that draws the
// claim literally: the four product modules sit in a row ON TOP of one luminous
// WORKFORCE INTELLIGENCE LAYER, each dropping a thin connector into it. Pure
// CSS geometry (no SVG) keeps the motion smooth by construction; the only
// ambient animation is a slow light sweep across the layer bar (the same
// signature sweep as the hero Impact panel), gated off-screen and under
// prefers-reduced-motion. Hovers are glow-only — no lifts, no scaling.
// Connector/field art is decorative (aria-hidden). Copy renders verbatim.
const ICONS: LucideIcon[] = [LayoutGrid, TrendingUp, GraduationCap, HeartPulse];

const WhatWeBuildSection = () => {
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
    <SectionShell
      id="building"
      kicker="The system you'll help build"
      title="One platform connecting the systems behind workforce growth."
      sub="Lumofy brings competencies, performance, learning, and engagement into one intelligence layer so organizations can understand people clearly and help them grow."
      headerClassName="max-w-3xl"
    >
      <motion.div
        ref={ref}
        className="relative mt-10 overflow-hidden rounded-2xl border border-border bg-card/40 p-6 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)] backdrop-blur-sm sm:p-8 lg:p-10"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={revealViewport}
        transition={{ duration: 0.6, ease: brandEase }}
      >
        {/* intelligence field: dot grid + a glow rising from the layer bar */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: "radial-gradient(60% 80% at 50% 100%, hsl(var(--primary) / 0.12), transparent 70%)" }} />
        </div>

        <motion.div
          className="relative mx-auto max-w-4xl"
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
        >
          {/* ===== The four product modules — each one's role, in its own hue ===== */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {pillars.map((p, i) => {
              const c = hueClasses[p.hue];
              const Icon = ICONS[i];
              return (
                <motion.div key={p.name} variants={fadeUp} className="group flex flex-col">
                  <div className="flex-1 rounded-xl border border-border/60 bg-card/70 p-4 backdrop-blur-sm transition-colors duration-300 group-hover:border-primary/30 group-hover:bg-card/80 sm:p-5">
                    <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition-shadow duration-300 ${c.bgSoft} ${c.glow}`}>
                      <Icon className={`h-5 w-5 ${c.text}`} aria-hidden="true" />
                    </span>
                    <h3 className="text-sm font-bold leading-tight text-foreground">{p.name}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{p.line}</p>
                  </div>
                  {/* connector drop into the layer (desktop only — in stacked layouts
                      a single shared stub below the grid carries the connection) */}
                  <div aria-hidden="true" className="hidden flex-col items-center lg:flex">
                    <div className="h-9 w-px bg-gradient-to-b from-border via-primary/40 to-primary/70 transition-opacity duration-300 opacity-80 group-hover:opacity-100" />
                    <span className={`-mt-0.5 block h-2 w-2 rounded-full ${c.bg} opacity-70 transition-all duration-300 group-hover:opacity-100 group-hover:shadow-[0_0_10px_hsl(var(--primary)/0.6)]`} />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* shared stub for mobile/tablet stacks */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={revealViewport}
            transition={{ duration: 0.4, delay: 0.25, ease: brandEase }}
            className="mx-auto h-8 w-px bg-gradient-to-b from-border via-primary/40 to-primary/70 lg:hidden"
          />

          {/* ===== The Workforce Intelligence Layer — the foundation everything plugs into ===== */}
          <motion.div variants={fadeUp} className="relative lg:-mt-0.5">
            <div className="node-core-bg relative mt-4 flex items-center justify-center gap-3.5 overflow-hidden rounded-xl border border-primary/40 px-6 py-5 [box-shadow:var(--core-glow)] lg:mt-0">
              {/* slow signature light sweep — intelligence moving through the layer */}
              {live && (
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{ background: "linear-gradient(105deg, transparent 42%, hsl(var(--primary) / 0.10) 50%, transparent 58%)" }}
                  animate={{ x: ["-130%", "130%"] }}
                  transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 7 }}
                />
              )}
              <img src={lumofyLogo} alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
              <span className="relative font-mono text-[11px] uppercase tracking-[0.2em] text-primary-readable">
                Workforce intelligence layer
              </span>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* closing line */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={revealViewport}
        transition={{ duration: 0.5, delay: 0.3, ease: brandEase }}
        className="mt-6 text-center text-sm text-muted-foreground"
      >
        Together, these systems turn workforce signals into <span className="font-semibold text-foreground">intelligent action</span>.
      </motion.p>
    </SectionShell>
  );
};

export default WhatWeBuildSection;
