import { motion } from "framer-motion";
import { GraduationCap, UserCheck, Clock, Target, Globe, type LucideIcon } from "lucide-react";
import AnimatedCounter from "@/components/careers/AnimatedCounter";
import { prefersReducedMotion } from "@/lib/motion";

// The Lumofy Impact console — the careers stand-in for the main site's hero
// product shot. Art-directed DARK so it flows out of the dark hero canvas
// instead of sitting on it as a flat white box: a deep-navy glass panel with a
// Sirius glow rising from beneath, a faint data-grid texture, bright on-brand
// counters, and per-metric hue icons. Counters animate once on view; the panel
// itself is calm by design, like a real product console.
type Stat = { value: number; label: string; accent: string; icon: LucideIcon };

// Performance numbers lead — PM is the platform's core pillar (same hierarchy
// as the main site). Accents are the vivid dark-mode brand hues (legible on navy).
const STATS: Stat[] = [
  { value: 100, label: "Performance Reviews", accent: "223 90% 68%", icon: UserCheck },
  { value: 50, label: "Performance Goals Managed", accent: "264 95% 76%", icon: Target },
  { value: 113, label: "Courses Completed", accent: "149 72% 60%", icon: GraduationCap },
  { value: 76, label: "Learning Hours", accent: "336 80% 70%", icon: Clock },
];

const WorkforceSignal = () => {
  const reduced = prefersReducedMotion();

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 text-white shadow-[0_30px_80px_-24px_rgba(2,4,12,0.75),inset_0_1px_0_hsl(0_0%_100%/0.06)]"
      style={{ background: "linear-gradient(180deg, hsl(222 42% 12%) 0%, hsl(228 42% 7%) 100%)" }}
    >
      {/* depth field: a faint data-grid + a Sirius glow rising from the base,
          echoing the hero's glow bed so the panel reads as part of the canvas */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(hsl(0 0% 100%) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-2/3"
          style={{ background: "radial-gradient(75% 100% at 50% 130%, hsl(223 83% 56% / 0.28), transparent 70%)" }}
        />
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.18), transparent)" }} />
      </div>

      {/* browser chrome bar */}
      <div className="relative flex items-center justify-between border-b border-white/[0.07] bg-white/[0.03] px-5 py-3">
        {/* live signal bars (replacing the generic window traffic-lights) —
            three Sirius bars pulsing like an equalizer to echo the LIVE badge */}
        <span className="flex h-3.5 items-end gap-[3px]" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-full w-[3px] origin-bottom rounded-full bg-[hsl(var(--lx-blue-soft))]"
              animate={reduced ? { scaleY: [0.55, 1, 0.75][i] } : { scaleY: [0.35, 1, 0.5, 0.9, 0.35] }}
              transition={reduced ? undefined : { duration: 1.2, ease: "easeInOut", repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </span>
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--lx-on-dark-3))]">
          Lumofy Impact
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(149_72%_60%/0.35)] bg-[hsl(149_72%_60%/0.12)] px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-[hsl(149_72%_72%)]">
          <span className="relative flex h-1.5 w-1.5">
            {!reduced && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(149_72%_62%)] opacity-70" />}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(149_72%_62%)]" />
          </span>
          Live
        </span>
      </div>

      {/* the numbers the team behind this page has shipped */}
      <ul className="relative grid grid-cols-2 lg:grid-cols-4" aria-label="Lumofy impact statistics">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.li
              key={s.label}
              className={`flex flex-col items-center gap-2.5 px-4 py-7 text-center ${i < 2 ? "border-b lg:border-b-0" : ""} ${i % 2 === 0 ? "" : "border-l"} ${i > 0 ? "lg:border-l" : ""} border-white/[0.07]`}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.55 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl border"
                style={{ background: `hsl(${s.accent} / 0.14)`, borderColor: `hsl(${s.accent} / 0.3)` }}
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" style={{ color: `hsl(${s.accent})` }} />
              </span>
              <span
                className="font-display text-[2rem] font-extrabold leading-none tracking-tight tabular-nums sm:text-[2.3rem]"
                style={{ color: `hsl(${s.accent})` }}
              >
                <AnimatedCounter value={s.value} suffix="K" duration={1.4} />+
              </span>
              <span className="max-w-[12rem] text-xs font-medium leading-tight text-[hsl(var(--lx-on-dark-2))]">{s.label}</span>
            </motion.li>
          );
        })}
      </ul>

      <div className="relative flex items-center justify-center gap-2 border-t border-white/[0.07] bg-white/[0.03] px-4 py-3.5">
        <Globe className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--lx-blue-soft))]" aria-hidden="true" />
        <p className="text-xs font-medium tracking-wide text-[hsl(var(--lx-on-dark-2))]">
          Powering <span className="font-semibold text-white">Workforce Development</span> across MENA
        </p>
      </div>
    </div>
  );
};

export default WorkforceSignal;
