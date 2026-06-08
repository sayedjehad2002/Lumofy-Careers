import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useSpring, useTransform } from "framer-motion";
import AnimatedCounter from "@/components/careers/AnimatedCounter";
import { hueClasses, type BrandHue } from "@/lib/deptColor";
import { brandEase, prefersReducedMotion } from "@/lib/motion";
import { SITE } from "@/data/site";

// A living "Workforce Intelligence" panel: each metric drifts continuously within a
// realistic band (mean-reverting, never random jumps), spring-animated bars + rolling
// numbers, soft glow pulse on change. All transform/opacity (GPU), paused offscreen,
// and fully static under prefers-reduced-motion. Numbers are an illustrative product
// signal, not company KPIs.
type Metric = { label: string; hue: BrandHue; min: number; max: number; base: number; period: number };

const METRICS: Metric[] = [
  { label: "Competency mapping", hue: "sirius", min: 90, max: 96, base: 93, period: 2200 },
  { label: "Performance signal", hue: "eclipse", min: 72, max: 79, base: 75, period: 2700 },
  { label: "Learning velocity", hue: "aurora", min: 84, max: 90, base: 87, period: 2500 },
  { label: "Engagement index", hue: "nova", min: 78, max: 85, base: 81, period: 3100 },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function SignalRow({ metric, reduced, active }: { metric: Metric; reduced: boolean; active: boolean }) {
  const c = hueClasses[metric.hue];
  const numRef = useRef<HTMLSpanElement>(null);
  // One spring drives both the bar (scaleX) and the rolling number — overdamped so it
  // glides to each target and never snaps or bounces.
  const value = useSpring(metric.base, { stiffness: 30, damping: 14, mass: 1 });
  const glow = useSpring(0, { stiffness: 60, damping: 18 });
  const scaleX = useTransform(value, (v) => clamp(v, 0, 100) / 100);
  const glowOpacity = useTransform(glow, [0, 1], [0, 0.5]);

  // Roll the displayed integer as the spring moves — DOM textContent only, no re-render.
  useMotionValueEvent(value, "change", (v) => {
    if (numRef.current) numRef.current.textContent = String(Math.round(v));
  });

  useEffect(() => {
    if (numRef.current) numRef.current.textContent = String(Math.round(metric.base));
    if (reduced || !active) return; // freeze when reduced-motion or scrolled away

    let prev = Math.round(value.get());
    let timer: number;
    const tick = () => {
      const cur = value.get();
      const pull = (metric.base - cur) * 0.35; // mean reversion → drifts, never wanders off
      const jitter = (Math.random() * 2 - 1) * 1.5; // small organic step
      let next = Math.round(clamp(cur + pull + jitter, metric.min, metric.max));
      if (next === prev) next = clamp(next + (Math.random() > 0.5 ? 1 : -1), metric.min, metric.max);
      glow.set(next >= prev ? 1 : 0.5); // brighter pulse on a rise, gentle on a fall
      prev = next;
      value.set(next);
      window.setTimeout(() => glow.set(0), 750);
      timer = window.setTimeout(tick, metric.period + (Math.random() * 500 - 250));
    };
    // staggered first tick so the four metrics never move in lockstep
    timer = window.setTimeout(tick, 500 + Math.random() * metric.period);
    return () => window.clearTimeout(timer);
  }, [reduced, active, value, glow, metric]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{metric.label}</span>
        <span className={`font-mono text-xs tabular-nums ${c.text}`}>
          <span ref={numRef}>{Math.round(metric.base)}</span>
          <span className="opacity-60">%</span>
        </span>
      </div>
      <div className="relative h-1.5">
        <div className="absolute inset-0 overflow-hidden rounded-full bg-muted">
          <motion.div className={`h-full w-full origin-left rounded-full ${c.bg}`} style={{ scaleX }} />
        </div>
        {/* glow halo — pulses on change, unclipped (GPU opacity) */}
        <motion.div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-full origin-left rounded-full ${c.bg} blur-[5px]`}
          style={{ scaleX, opacity: glowOpacity }}
        />
      </div>
    </div>
  );
}

const WorkforceSignal = ({ openCount }: { openCount: number }) => {
  const reduced = prefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  // Pause the drift loop while the panel is off-screen (perf).
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: brandEase }}
      className="glass-card relative overflow-hidden rounded-2xl p-6 sm:p-7"
    >
      {/* Occasional signal-refresh sweep (paused offscreen) */}
      {!reduced && active && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(105deg, transparent 42%, hsl(var(--primary) / 0.06) 50%, transparent 58%)" }}
          animate={{ x: ["-120%", "120%"] }}
          transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 9 }}
        />
      )}

      <div className="relative mb-5 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Workforce signal</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-primary">
          <span className="relative flex h-1.5 w-1.5">
            {!reduced && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Live
        </span>
      </div>

      <div className="relative space-y-4">
        {METRICS.map((m) => (
          <SignalRow key={m.label} metric={m} reduced={reduced} active={active} />
        ))}
      </div>

      <div className="relative mt-6 flex items-end justify-between border-t border-border/60 pt-5">
        <div>
          {openCount > 0 ? (
            <>
              <div className="text-4xl font-extrabold tabular-nums text-foreground">
                <AnimatedCounter value={openCount} duration={1.6} />
              </div>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Open roles</p>
            </>
          ) : (
            <>
              <div className="text-3xl font-extrabold text-foreground">Always</div>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Open to talent</p>
            </>
          )}
        </div>
        <p className="text-right font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {SITE.stats.employees} people
          <br />
          {SITE.stats.countries} countries
        </p>
      </div>
    </motion.div>
  );
};

export default WorkforceSignal;
