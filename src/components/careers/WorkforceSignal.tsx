import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import AnimatedCounter from "@/components/careers/AnimatedCounter";
import { brandEase, prefersReducedMotion } from "@/lib/motion";

// The Lumofy Impact panel — "Ambient Intelligence": a cinematic, layered data panel.
// Four REAL impact KPIs as bold count-up numbers, each tagged with one brand accent
// (Eclipse / Nova / Aurora / Stellar) and linked by a Sirius "signal" thread that a
// light pulse travels down — under a breathing spotlight, a faint cosmic dot-grid, a
// slow light sweep, and a LIVE pulse. On-brand (DESIGN.md). All motion is transform/
// opacity (GPU), PAUSED off-screen (IntersectionObserver) and fully OFF under
// prefers-reduced-motion; numbers count up once on view, then hold.
type Stat = { value: number; label: string; accent: string };

const STATS: Stat[] = [
  { value: 113, label: "Courses Completed", accent: "var(--brand-eclipse)" },
  { value: 100, label: "Performance Reviews", accent: "var(--brand-nova)" },
  { value: 76, label: "Learning Hours", accent: "var(--brand-aurora)" },
  { value: 50, label: "Performance Goals Managed", accent: "var(--brand-stellar)" },
];

const WorkforceSignal = () => {
  const reduced = prefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  // Pause every continuous loop while the panel is off-screen (perf).
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const live = !reduced && active; // gate for ambient/continuous animation

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: brandEase }}
      whileHover={reduced ? undefined : { y: -3 }}
      className="group glass-card relative overflow-hidden rounded-2xl p-6 shadow-[0_24px_70px_-24px_hsl(var(--primary)/0.28)] transition-shadow duration-500 hover:shadow-[0_34px_90px_-22px_hsl(var(--primary)/0.45)] sm:p-7"
    >
      {/* ===== Depth: breathing spotlight + faint cosmic grid + accent wash + top edge ===== */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute inset-0"
          style={{ background: "radial-gradient(120% 85% at 50% -12%, hsl(var(--primary) / 0.16), transparent 55%)" }}
          animate={live ? { opacity: [0.6, 1, 0.6], scale: [1, 1.05, 1] } : undefined}
          transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />
        <div
          className="absolute inset-x-0 bottom-[-25%] h-2/3"
          style={{ background: "radial-gradient(70% 100% at 50% 100%, hsl(var(--brand-eclipse) / 0.10), transparent 62%)" }}
        />
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.18), transparent)" }} />
      </div>

      {/* ===== Low-frequency light sweep ===== */}
      {live && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(105deg, transparent 42%, hsl(var(--primary) / 0.07) 50%, transparent 58%)" }}
          animate={{ x: ["-130%", "130%"] }}
          transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity, repeatDelay: 7 }}
        />
      )}

      {/* ===== Header ===== */}
      <div className="relative mb-6 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Lumofy Impact</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground" aria-label="Live data">
          <span className="relative flex h-1.5 w-1.5">
            {!reduced && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "hsl(var(--brand-aurora))" }} />}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "hsl(var(--brand-aurora))" }} />
          </span>
          Live
        </span>
      </div>

      {/* ===== Stat ledger — accent stars linked by a Sirius signal thread ===== */}
      <div className="relative">
        {/* thread (draws on entry) */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-[6px] top-3 bottom-3 w-px origin-top"
          style={{ background: "linear-gradient(to bottom, hsl(var(--primary) / 0.7), hsl(var(--primary) / 0.12))" }}
          initial={reduced ? false : { scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35, ease: brandEase }}
        />
        {/* signal pulse travelling the thread */}
        {live && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute left-[6px] h-5 w-px -translate-x-1/2 rounded-full"
            style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--primary)), transparent)" }}
            initial={{ top: "4%", opacity: 0 }}
            animate={{ top: ["4%", "92%"], opacity: [0, 0.9, 0.9, 0] }}
            transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.8 }}
          />
        )}

        <motion.ul
          className="relative space-y-[1.15rem]"
          aria-label="Lumofy impact statistics"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.3 } } }}
        >
          {STATS.map((s, i) => (
            <motion.li
              key={s.label}
              className="flex items-center gap-4"
              variants={{
                hidden: { opacity: 0, x: reduced ? 0 : -8 },
                show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: brandEase } },
              }}
            >
              {/* accent star with a slow breathing glow */}
              <span className="relative flex h-3 w-3 flex-shrink-0 items-center justify-center" aria-hidden="true">
                <motion.span
                  className="absolute h-3 w-3 rounded-full blur-[4px]"
                  style={{ background: `hsl(${s.accent})` }}
                  animate={live ? { opacity: [0.45, 0.85, 0.45], scale: [1, 1.3, 1] } : { opacity: 0.7 }}
                  transition={{ duration: 3.6, ease: "easeInOut", repeat: Infinity, delay: i * 0.5 }}
                />
                <span className="relative h-2.5 w-2.5 rounded-full ring-2 ring-background" style={{ background: `hsl(${s.accent})` }} />
              </span>
              {/* number + label */}
              <span className="inline-flex min-w-[5.25rem] items-baseline text-3xl font-extrabold leading-none tracking-tight tabular-nums text-foreground sm:min-w-[5.75rem] sm:text-[2rem]">
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

      {/* ===== Divider + footer (reveals last) ===== */}
      <motion.div
        className="relative mt-6 border-t border-border/60 pt-5 text-center"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.95, ease: brandEase }}
      >
        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          Powering <span className="font-semibold text-foreground">Workforce Development</span> across MENA
        </p>
      </motion.div>
    </motion.div>
  );
};

export default WorkforceSignal;
