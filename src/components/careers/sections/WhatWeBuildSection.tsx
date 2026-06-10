import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, TrendingUp, GraduationCap, HeartPulse, type LucideIcon } from "lucide-react";
import SectionShell from "./SectionShell";
import { pillars } from "@/data/careers";
import { revealViewport, brandEase, prefersReducedMotion } from "@/lib/motion";
import { hueClasses } from "@/lib/deptColor";
import lumofyLogo from "@/assets/lumofy-mark.png";

// "The system you'll help build" — a connected product-ecosystem moment: the
// Workforce Intelligence Layer as the hero core, four product modules wired to
// it by an ENGINEERED elbow-connector system (orthogonal paths, glow underlay,
// per-hue signal pulses travelling core → module), over a layered intelligence
// field (dual dot grids + center glow + edge vignette). Hovering a module
// brightens its connector and makes the core respond. Desktop = orbital hub;
// below lg = vertical flow (core → stub → 2-col modules). Motion is GPU-only,
// pauses off-screen, and is reduced-motion safe. Art is aria-hidden.
const ICONS: LucideIcon[] = [LayoutGrid, TrendingUp, GraduationCap, HeartPulse];

// Engineered elbow connectors (viewBox %): horizontal run from the core's
// mid-height, then a vertical turn into the module's inner corner. The first
// segment is hidden behind the core; the endpoint tucks under the card.
const ELBOWS = [
  { hx: 33, vy: 24 }, // top-left
  { hx: 67, vy: 24 }, // top-right
  { hx: 33, vy: 76 }, // bottom-left
  { hx: 67, vy: 76 }, // bottom-right
];
const elbowPath = ({ hx, vy }: { hx: number; vy: number }) => `M 50 50 H ${hx} V ${vy}`;

function ModuleNode({ index, side = "right", onHover }: { index: number; side?: "left" | "right"; onHover?: (i: number | null) => void }) {
  const p = pillars[index];
  const c = hueClasses[p.hue];
  const Icon = ICONS[index];
  return (
    <div
      onMouseEnter={() => onHover?.(index)}
      onMouseLeave={() => onHover?.(null)}
      className={`group flex items-start gap-3 rounded-xl border border-border/60 bg-card/70 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_24px_hsl(var(--primary)/0.10)] ${
        side === "left" ? "lg:flex-row-reverse lg:text-right" : ""
      }`}
    >
      <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg transition-shadow duration-300 ${c.bgSoft} ${c.glow}`}>
        <Icon className={`h-5 w-5 ${c.text}`} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-bold leading-tight text-foreground">{p.name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.line}</p>
      </div>
    </div>
  );
}

function Core({ boost }: { boost: boolean }) {
  return (
    <div className="relative">
      {/* soft halo behind the core */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-300 ${boost ? "opacity-100" : "opacity-70"}`}
        style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.18), transparent 70%)" }}
      />
      <div
        className={`node-core-bg relative flex flex-col items-center gap-2.5 rounded-2xl border px-6 py-5 text-center backdrop-blur-sm transition-all duration-300 ${
          boost
            ? "border-primary/60 shadow-[0_0_64px_hsl(var(--primary)/0.45)]"
            : "border-primary/40 shadow-[0_0_44px_hsl(var(--primary)/0.3)]"
        }`}
      >
        <img src={lumofyLogo} alt="" aria-hidden="true" className="h-11 w-11 object-contain" />
        <span className="font-mono text-[10px] uppercase leading-tight tracking-wider text-primary-readable">
          Workforce
          <br />
          intelligence layer
        </span>
      </div>
    </div>
  );
}

const WhatWeBuildSection = () => {
  const reduced = prefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);
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
        initial={{ opacity: 0, y: 20, scale: 0.99 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={revealViewport}
        transition={{ duration: 0.6, ease: brandEase }}
      >
        {/* layered intelligence field: dual dot grids + center glow + edge vignette */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(hsl(var(--primary)) 1.5px, transparent 1.5px)", backgroundSize: "96px 96px", backgroundPosition: "12px 12px" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(45% 45% at 50% 50%, hsl(var(--primary) / 0.12), transparent 70%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(80% 80% at 50% 50%, transparent 55%, hsl(var(--background) / 0.5) 100%)" }} />
        </div>

        {/* ===== Desktop orbital hub ===== */}
        <div className="relative mx-auto hidden h-[26rem] w-full max-w-4xl lg:block">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" aria-hidden="true">
            {/* glow underlay — a soft wide stroke beneath each connector */}
            {ELBOWS.map((e, i) => (
              <path key={`g${i}`} d={elbowPath(e)} stroke="hsl(var(--primary))" strokeOpacity="0.06" strokeWidth="5" vectorEffect="non-scaling-stroke" />
            ))}
            {/* engineered elbows — draw in, brighten when their module is hovered */}
            {ELBOWS.map((e, i) => (
              <motion.path
                key={i}
                d={elbowPath(e)}
                stroke="hsl(var(--primary))"
                strokeOpacity={hovered === i ? 0.85 : 0.45}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                style={{ transition: "stroke-opacity 0.3s ease" }}
                initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={revealViewport}
                transition={{ duration: 0.7, delay: 0.3 + i * 0.08, ease: brandEase }}
              />
            ))}
            {/* connection points at the module corners */}
            {ELBOWS.map((e, i) => (
              <circle
                key={`p${i}`}
                cx={e.hx}
                cy={e.vy}
                r={hovered === i ? 1.6 : 1.2}
                fill={`hsl(var(--brand-${pillars[i].hue}))`}
                style={{ transition: "r 0.3s ease" }}
              />
            ))}
            {/* per-hue signal pulses: core → along the elbow → module */}
            {live &&
              ELBOWS.map((e, i) => (
                <motion.circle
                  key={`s${i}`}
                  r="1.1"
                  fill={`hsl(var(--brand-${pillars[i].hue}))`}
                  initial={{ cx: 50, cy: 50, opacity: 0 }}
                  animate={{ cx: [50, e.hx, e.hx], cy: [50, 50, e.vy], opacity: [0, 1, 0] }}
                  transition={{ duration: 2.2, times: [0, 0.55, 1], ease: "easeInOut", repeat: Infinity, repeatDelay: 2.6, delay: i * 0.65 }}
                />
              ))}
          </svg>

          {/* core — the hero of the system */}
          <div className="absolute left-1/2 top-1/2 z-20 w-[30%] max-w-[13.5rem] -translate-x-1/2 -translate-y-1/2">
            <Core boost={hovered !== null} />
          </div>

          {/* four modules in the corners — never overlap the core */}
          <div className="absolute left-0 top-0 z-10 w-[34%]"><ModuleNode index={0} side="left" onHover={setHovered} /></div>
          <div className="absolute right-0 top-0 z-10 w-[34%]"><ModuleNode index={1} side="right" onHover={setHovered} /></div>
          <div className="absolute bottom-0 left-0 z-10 w-[34%]"><ModuleNode index={2} side="left" onHover={setHovered} /></div>
          <div className="absolute bottom-0 right-0 z-10 w-[34%]"><ModuleNode index={3} side="right" onHover={setHovered} /></div>
        </div>

        {/* ===== Mobile / tablet vertical flow ===== */}
        <div className="relative lg:hidden">
          <div className="mx-auto w-fit"><Core boost={false} /></div>
          <div aria-hidden="true" className="mx-auto my-4 h-8 w-px bg-gradient-to-b from-primary/40 to-border" />
          <div className="grid gap-3 sm:grid-cols-2">
            {pillars.map((p, i) => (
              <ModuleNode key={p.name} index={i} />
            ))}
          </div>
        </div>
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
