import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import SectionShell from "./SectionShell";
import { stakes } from "@/data/careers";
import { staggerContainer, revealViewport, brandEase } from "@/lib/motion";
import lumofyLogo from "@/assets/brand/lumofy-mark.svg";

// "The problem worth joining" — an editorial transformation ledger built around
// a CENTER AXIS: problems converge (right-aligned) into an arrow node on a
// faint spine that runs down from the Lumofy chip, and outcomes flow out the
// other side. Typography, hairlines, and the axis carry the design — no panel,
// no grid, no glow. Motion is a choreographed one-time reveal per row
// (problem slides in → node pops → outcome slides out) plus a spine draw;
// hover warms a row and nudges its arrow. Reduced-motion safe via MotionConfig.
// Copy renders verbatim from `stakes`.
const fromLeft = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: brandEase } },
};
const fromRight = {
  hidden: { opacity: 0, x: 12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: brandEase, delay: 0.12 } },
};
const nodeIn = {
  hidden: { opacity: 0, scale: 0.5 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: brandEase, delay: 0.22 } },
};
const rowShell = { hidden: {}, show: {} };
const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: brandEase } },
};

const WhyItMattersSection = () => (
  <SectionShell id="why" kicker={stakes.kicker} title={stakes.lead} sub={stakes.sub} headerClassName="max-w-3xl">
    <motion.div
      className="mx-auto mt-14 max-w-3xl sm:mt-16"
      variants={staggerContainer(0.14)}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
    >
      {/* column headers — labels hug the center axis; the chip crowns the spine */}
      <motion.div variants={fadeIn} className="hidden grid-cols-[1fr_5.5rem_1fr] items-center gap-5 pb-6 lg:grid">
        <p className="text-right font-display text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Today's challenge</p>
        <div className="flex flex-col items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--lx-line))] dark:border-border bg-card shadow-md">
            <img src={lumofyLogo} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
          </span>
          <span className="whitespace-nowrap text-center font-display text-[9px] font-bold uppercase leading-tight tracking-wider text-muted-foreground">
            Lumofy
            <br />
            intelligence layer
          </span>
        </div>
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">What we're building</p>
      </motion.div>

      {/* mobile/tablet header — the same three pieces, compact */}
      <motion.div variants={fadeIn} className="flex items-center justify-between gap-3 pb-5 lg:hidden">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Today's challenge</p>
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--lx-line))] dark:border-border bg-card shadow-sm" title="Lumofy intelligence layer">
          <img src={lumofyLogo} alt="Lumofy intelligence layer" className="h-4 w-4 object-contain" />
        </span>
        <p className="text-right font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">What we're building</p>
      </motion.div>

      {/* the ledger — one row per transformation, threaded on the center spine */}
      <div className="relative border-t border-border/50">
        {/* spine: a faint axis running down from the chip through every arrow node */}
        <motion.div
          aria-hidden="true"
          className="absolute bottom-0 left-1/2 top-0 hidden w-px origin-top -translate-x-1/2 lg:block"
          style={{ background: "linear-gradient(to bottom, hsl(var(--primary) / 0.35), hsl(var(--primary) / 0.06))" }}
          initial={{ scaleY: 0, opacity: 0 }}
          whileInView={{ scaleY: 1, opacity: 1 }}
          viewport={revealViewport}
          transition={{ duration: 0.8, delay: 0.3, ease: brandEase }}
        />

        {stakes.problems.map((p, i) => (
          <motion.div
            key={p}
            variants={rowShell}
            className="group relative grid grid-cols-1 gap-2.5 border-b border-border/50 px-2 py-5 transition-colors duration-300 hover:bg-card/30 sm:px-4 lg:grid-cols-[1fr_5.5rem_1fr] lg:items-center lg:gap-5 lg:py-7"
          >
            {/* problem — converges toward the axis */}
            <motion.div variants={fromLeft} className="flex items-center gap-3.5 lg:justify-end lg:text-right">
              <span className="font-display text-[11px] font-bold tabular-nums text-muted-foreground transition-colors duration-300 group-hover:text-primary-readable">
                0{i + 1}
              </span>
              <span className="text-[15px] leading-relaxed text-muted-foreground">{p}</span>
            </motion.div>

            {/* arrow node — sits ON the spine, like a stop on the line */}
            <motion.span
              variants={nodeIn}
              aria-hidden="true"
              className="hidden h-8 w-8 items-center justify-center justify-self-center rounded-full border border-border/60 bg-card transition-all duration-300 group-hover:border-primary/40 lg:flex"
            >
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary-readable" />
            </motion.span>

            {/* outcome — flows out of the axis */}
            <motion.div variants={fromRight} className="flex items-center gap-3 pl-[34px] lg:pl-0">
              <Check aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-[hsl(var(--brand-aurora)/0.9)]" />
              <span className="text-[15px] font-medium leading-relaxed text-foreground">{stakes.solutions[i]}</span>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  </SectionShell>
);

export default WhyItMattersSection;
