import { motion } from "framer-motion";
import AnimatedCounter from "@/components/careers/AnimatedCounter";
import { brandEase, prefersReducedMotion } from "@/lib/motion";

// The Lumofy Impact panel — "Cosmic Ledger": four REAL impact KPIs rendered as bold
// count-up numbers, each tagged with one brand accent (Eclipse / Nova / Aurora /
// Stellar) and linked by a single thin Sirius thread, under a LIVE pulse. Replaces the
// old animated "workforce signal" demo bars. On-brand (DESIGN.md), GPU-only motion,
// reduced-motion safe; numbers count up once on view, then hold.
type Stat = { value: number; suffix: string; label: string; accent: string };

const STATS: Stat[] = [
  { value: 113, suffix: "K+", label: "Courses Completed", accent: "var(--brand-eclipse)" },
  { value: 100, suffix: "K+", label: "Performance Reviews", accent: "var(--brand-nova)" },
  { value: 76, suffix: "K+", label: "Learning Hours", accent: "var(--brand-aurora)" },
  { value: 50, suffix: "K+", label: "Performance Goals Managed", accent: "var(--brand-stellar)" },
];

const WorkforceSignal = () => {
  const reduced = prefersReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: brandEase }}
      className="glass-card relative overflow-hidden rounded-2xl p-6 sm:p-7"
    >
      {/* Header */}
      <div className="relative mb-6 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Lumofy Impact</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground" aria-label="Live data">
          <span className="relative flex h-1.5 w-1.5">
            {!reduced && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "hsl(var(--brand-aurora))" }} />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "hsl(var(--brand-aurora))" }} />
          </span>
          Live
        </span>
      </div>

      {/* Stat ledger — accent stars linked by a Sirius thread */}
      <div className="relative">
        {/* Sirius thread connecting the dots (draws downward on entry) */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-[6px] top-3 bottom-3 w-px origin-top"
          style={{ background: "linear-gradient(to bottom, hsl(var(--primary) / 0.7), hsl(var(--primary) / 0.15))" }}
          initial={reduced ? false : { scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35, ease: brandEase }}
        />
        <motion.ul
          className="relative space-y-[1.15rem]"
          aria-label="Lumofy impact statistics"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } } }}
        >
          {STATS.map((s) => (
            <motion.li
              key={s.label}
              className="flex items-center gap-4"
              variants={{
                hidden: { opacity: 0, x: reduced ? 0 : -8 },
                show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: brandEase } },
              }}
            >
              {/* accent star */}
              <span className="relative flex h-3 w-3 flex-shrink-0 items-center justify-center" aria-hidden="true">
                <span className="absolute h-3 w-3 rounded-full opacity-70 blur-[4px]" style={{ background: `hsl(${s.accent})` }} />
                <span className="relative h-2.5 w-2.5 rounded-full ring-2 ring-background" style={{ background: `hsl(${s.accent})` }} />
              </span>
              {/* number + label */}
              <span className="inline-flex min-w-[5rem] items-baseline text-[1.75rem] font-extrabold leading-none tracking-tight tabular-nums text-foreground sm:min-w-[5.5rem] sm:text-3xl">
                <AnimatedCounter value={s.value} suffix="K" duration={1.4} />
                <span style={{ color: `hsl(${s.accent})` }}>+</span>
              </span>
              <span className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
                {s.label}
              </span>
            </motion.li>
          ))}
        </motion.ul>
      </div>

      {/* Divider + footer */}
      <div className="relative mt-6 border-t border-border/60 pt-5 text-center">
        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          Powering <span className="font-semibold text-foreground">Workforce Development</span> across MENA
        </p>
      </div>
    </motion.div>
  );
};

export default WorkforceSignal;
