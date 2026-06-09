import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, UserCheck, Clock, Target, Globe, type LucideIcon } from "lucide-react";
import AnimatedCounter from "@/components/careers/AnimatedCounter";
import { brandEase, prefersReducedMotion } from "@/lib/motion";

// The Lumofy Impact panel — "Impact Intelligence Console": four REAL impact KPIs as
// glowing icon nodes (Eclipse / Nova / Aurora / Stellar) threaded by a Sirius signal
// line, over a layered field (breathing spotlight, faint data-grid, a drawn data-wave,
// an Eclipse base wash), under a LIVE pulse. On-brand (DESIGN.md); the glass-card surface
// supplies the gradient border + hover glow. All motion is transform/opacity (GPU),
// PAUSED off-screen (IntersectionObserver) and fully OFF under prefers-reduced-motion;
// numbers count up once on view, then hold. Icons are decorative (labels carry meaning).
type Stat = { value: number; label: string; accent: string; icon: LucideIcon };

const STATS: Stat[] = [
  { value: 113, label: "Courses Completed", accent: "var(--brand-eclipse)", icon: GraduationCap },
  { value: 100, label: "Performance Reviews", accent: "var(--brand-nova)", icon: UserCheck },
  { value: 76, label: "Learning Hours", accent: "var(--brand-aurora)", icon: Clock },
  { value: 50, label: "Performance Goals Managed", accent: "var(--brand-stellar)", icon: Target },
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
      transition={{ duration: 0.6, delay: 0.2, ease: brandEase }}
      whileHover={reduced ? undefined : { y: -3 }}
      className="glass-card relative overflow-hidden rounded-2xl p-6 sm:p-7"
    >
      {/* ===== Depth field: spotlight + data-grid + data-wave + base wash + top edge ===== */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute inset-0"
          style={{ background: "radial-gradient(120% 85% at 50% -12%, hsl(var(--primary) / 0.16), transparent 55%)" }}
          animate={live ? { opacity: [0.6, 1, 0.6], scale: [1, 1.05, 1] } : undefined}
          transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />
        <motion.svg
          className="absolute inset-x-0 bottom-0 h-2/5 w-full"
          viewBox="0 0 400 120"
          preserveAspectRatio="none"
          fill="none"
          animate={live ? { x: [0, -14, 0] } : undefined}
          transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
        >
          <motion.path
            d="M0,82 C70,44 140,104 220,72 C300,42 360,92 400,60"
            stroke="hsl(var(--primary))" strokeOpacity="0.16" strokeWidth="1.5" strokeLinecap="round"
            initial={reduced ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.1, delay: 0.5, ease: brandEase }}
          />
          <motion.path
            d="M0,98 C90,72 150,116 240,86 C320,60 372,102 400,82"
            stroke="hsl(var(--brand-eclipse))" strokeOpacity="0.1" strokeWidth="1" strokeLinecap="round"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.3, delay: 0.7, ease: brandEase }}
          />
        </motion.svg>
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
          transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity, repeatDelay: 8 }}
        />
      )}

      {/* ===== Header ===== */}
      <div className="relative mb-5 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Lumofy Impact</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--brand-aurora)/0.25)] bg-[hsl(var(--brand-aurora)/0.08)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--brand-aurora))]" aria-label="Live data">
          <span className="relative flex h-1.5 w-1.5">
            {!reduced && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "hsl(var(--brand-aurora))" }} />}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "hsl(var(--brand-aurora))" }} />
          </span>
          Live
        </span>
      </div>

      {/* ===== Stat console — glowing icon nodes on a Sirius signal thread ===== */}
      <div className="relative">
        {/* signal thread behind the nodes (draws on entry; shows in the gaps between nodes) */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-6 top-6 bottom-6 w-px origin-top"
          style={{ background: "linear-gradient(to bottom, hsl(var(--primary) / 0.55), hsl(var(--primary) / 0.1))" }}
          initial={reduced ? false : { scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4, ease: brandEase }}
        />

        <motion.ul
          className="relative space-y-4"
          aria-label="Lumofy impact statistics"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } }}
        >
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.li
                key={s.label}
                className="relative flex items-center gap-4"
                variants={{
                  hidden: { opacity: 0, x: reduced ? 0 : -8 },
                  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: brandEase } },
                }}
              >
                {/* glowing icon node */}
                <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center" aria-hidden="true">
                  <motion.span
                    className="absolute h-12 w-12 rounded-full blur-[10px]"
                    style={{ background: `hsl(${s.accent})` }}
                    animate={live ? { opacity: [0.22, 0.42, 0.22], scale: [1, 1.15, 1] } : { opacity: 0.3 }}
                    transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, delay: i * 0.55 }}
                  />
                  <span
                    className="relative flex h-12 w-12 items-center justify-center rounded-full border"
                    style={{
                      background: `radial-gradient(125% 125% at 50% 0%, hsl(${s.accent} / 0.22), hsl(222 30% 9%))`,
                      borderColor: `hsl(${s.accent} / 0.5)`,
                      boxShadow: `0 0 18px hsl(${s.accent} / 0.22), inset 0 1px 0 hsl(0 0% 100% / 0.08)`,
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: `hsl(${s.accent})` }} aria-hidden="true" />
                  </span>
                </span>
                {/* number + label (stacked) */}
                <div className="min-w-0">
                  <div className="text-2xl font-extrabold leading-none tracking-tight tabular-nums text-foreground sm:text-[1.7rem]">
                    <AnimatedCounter value={s.value} suffix="K" duration={1.4} />
                    <span style={{ color: `hsl(${s.accent})` }}>+</span>
                  </div>
                  <div className="mt-1.5 text-xs font-medium leading-tight text-muted-foreground">{s.label}</div>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>

      {/* ===== Footer (reveals last) ===== */}
      <motion.div
        className="relative mt-6 flex items-center justify-center gap-2 border-t border-border/60 pt-5"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1, ease: brandEase }}
      >
        <Globe className="h-3.5 w-3.5 flex-shrink-0 text-primary/70" aria-hidden="true" />
        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          Powering <span className="font-semibold text-foreground">Workforce Development</span> across MENA
        </p>
      </motion.div>
    </motion.div>
  );
};

export default WorkforceSignal;
