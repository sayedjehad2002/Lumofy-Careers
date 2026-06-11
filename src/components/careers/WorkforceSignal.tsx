import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, UserCheck, Clock, Target, Globe, type LucideIcon } from "lucide-react";
import AnimatedCounter from "@/components/careers/AnimatedCounter";
import { prefersReducedMotion } from "@/lib/motion";

// The Lumofy Impact console — the careers stand-in for the main site's hero
// product shot: a LIGHT browser-chrome card (explicit white, since it sits on
// the dark hero canvas in both themes) showing the real platform impact the
// team has shipped. Big Sirius-blue numbers echo the main site's "Proven
// Impact" counters. Counters animate once on view; ambient motion is none —
// the card is calm by design, like a real product screenshot.
type Stat = { value: number; label: string; accent: string; icon: LucideIcon };

// Performance numbers lead — PM is the platform's core pillar (same hierarchy
// as the main site).
const STATS: Stat[] = [
  { value: 100, label: "Performance Reviews", accent: "223 83% 52%", icon: UserCheck },
  { value: 50, label: "Performance Goals Managed", accent: "264 70% 56%", icon: Target },
  { value: 113, label: "Courses Completed", accent: "149 64% 38%", icon: GraduationCap },
  { value: 76, label: "Learning Hours", accent: "336 68% 50%", icon: Clock },
];

const WorkforceSignal = () => {
  const reduced = prefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [, setActive] = useState(true);

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-2xl border border-white/10 bg-white text-[#141720] shadow-[0_30px_80px_-20px_rgba(4,5,9,0.55)]"
    >
      {/* browser chrome bar */}
      <div className="flex items-center justify-between border-b border-[#e5e9f2] bg-[#f6f8fc] px-5 py-3">
        <span className="chrome-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(226_15%_47%)]">
          Lumofy Impact
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(149_64%_38%/0.3)] bg-[hsl(149_64%_38%/0.08)] px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-[hsl(149_64%_29%)]">
          <span className="relative flex h-1.5 w-1.5">
            {!reduced && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(149_64%_38%)] opacity-60" />}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(149_64%_38%)]" />
          </span>
          Live
        </span>
      </div>

      {/* the numbers the team behind this page has shipped */}
      <ul className="grid grid-cols-2 divide-[#e5e9f2] lg:grid-cols-4 lg:divide-x" aria-label="Lumofy impact statistics">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.li
              key={s.label}
              className={`flex flex-col items-center gap-2.5 px-4 py-7 text-center ${i < 2 ? "border-b lg:border-b-0" : ""} ${i % 2 === 0 ? "" : "border-l lg:border-l-0"} border-[#e5e9f2]`}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.55 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: `hsl(${s.accent} / 0.1)` }}
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" style={{ color: `hsl(${s.accent})` }} />
              </span>
              <span className="font-display text-[2rem] font-extrabold leading-none tracking-tight text-[#215bea] tabular-nums sm:text-[2.3rem]">
                <AnimatedCounter value={s.value} suffix="K" duration={1.4} />+
              </span>
              <span className="max-w-[12rem] text-xs font-medium leading-tight text-[hsl(226_15%_47%)]">{s.label}</span>
            </motion.li>
          );
        })}
      </ul>

      <div className="flex items-center justify-center gap-2 border-t border-[#e5e9f2] bg-[#f6f8fc] px-4 py-3.5">
        <Globe className="h-3.5 w-3.5 flex-shrink-0 text-[#215bea]" aria-hidden="true" />
        <p className="text-xs font-medium tracking-wide text-[#4f5561]">
          Powering <span className="font-semibold text-[#141720]">Workforce Development</span> across MENA
        </p>
      </div>
    </div>
  );
};

export default WorkforceSignal;
