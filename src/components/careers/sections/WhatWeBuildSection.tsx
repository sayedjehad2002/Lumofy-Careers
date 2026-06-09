import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, TrendingUp, GraduationCap, HeartPulse, type LucideIcon } from "lucide-react";
import SectionShell from "./SectionShell";
import { pillars } from "@/data/careers";
import { revealViewport, brandEase, prefersReducedMotion } from "@/lib/motion";
import { hueClasses } from "@/lib/deptColor";
import lumofyLogo from "@/assets/lumofy-mark.png";

// "The system you'll help build" — an integrated Connected Platform panel: the Lumofy
// Workforce Intelligence Layer at the center, the four product modules as compact nodes
// connected to it by clean signal lines, over an intelligence-map field (dotted grid +
// radial glow). One large premium panel — NOT a card grid. Desktop = orbital hub (core
// centered in its own space, modules in the four corners, no overlap); below lg = a clean
// vertical flow (core on top, modules stacked). Motion is light + GPU + reduced-motion
// safe; the signal pulses pause off-screen. Connectors/logo are decorative (aria-hidden).
const ICONS: LucideIcon[] = [LayoutGrid, TrendingUp, GraduationCap, HeartPulse];

// connector endpoints (percent) for the desktop hub: core(50,50) -> each module's inner corner
const NODES = [
  { x: 33, y: 22 },
  { x: 67, y: 22 },
  { x: 33, y: 78 },
  { x: 67, y: 78 },
];

function ModuleNode({ index, side = "right" }: { index: number; side?: "left" | "right" }) {
  const p = pillars[index];
  const c = hueClasses[p.hue];
  const Icon = ICONS[index];
  return (
    <div
      className={`group flex items-start gap-3 rounded-xl border border-border/70 bg-card/70 p-3.5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 ${
        side === "left" ? "lg:flex-row-reverse lg:text-right" : ""
      }`}
    >
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${c.bgSoft}`}>
        <Icon className={`h-5 w-5 ${c.text}`} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-bold leading-tight text-foreground">{p.name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.line}</p>
      </div>
    </div>
  );
}

function Core() {
  return (
    <div
      className="relative flex flex-col items-center gap-2 rounded-2xl border border-primary/40 px-5 py-4 text-center shadow-[0_0_44px_hsl(var(--primary)/0.3)] backdrop-blur-sm"
      style={{ background: "radial-gradient(130% 130% at 50% 0%, hsl(var(--primary) / 0.22), hsl(222 32% 8%))" }}
    >
      <img src={lumofyLogo} alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
      <span className="font-mono text-[10px] uppercase leading-tight tracking-wider text-primary">
        Workforce
        <br />
        intelligence layer
      </span>
    </div>
  );
}

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
        className="relative mt-10 overflow-hidden rounded-3xl border border-border bg-card/30 p-6 backdrop-blur-sm sm:p-8 lg:p-10"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={revealViewport}
        transition={{ duration: 0.6, ease: brandEase }}
      >
        {/* intelligence-map field */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(45% 45% at 50% 50%, hsl(var(--primary) / 0.10), transparent 70%)" }} />
        </div>

        {/* ===== Desktop orbital hub ===== */}
        <div className="relative mx-auto hidden h-[24rem] w-full max-w-3xl lg:block">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" aria-hidden="true">
            {NODES.map((n, i) => (
              <motion.line
                key={i}
                x1="50" y1="50" x2={n.x} y2={n.y}
                stroke="hsl(var(--primary))" strokeOpacity="0.35" strokeWidth="1.25" vectorEffect="non-scaling-stroke"
                initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={revealViewport}
                transition={{ duration: 0.7, delay: 0.3 + i * 0.08, ease: brandEase }}
              />
            ))}
            {NODES.map((n, i) => (
              <circle key={`p${i}`} cx={n.x} cy={n.y} r="1.1" fill="hsl(var(--primary))" />
            ))}
            {live &&
              NODES.map((n, i) => (
                <motion.circle
                  key={`s${i}`}
                  r="0.9"
                  fill="hsl(var(--brand-aurora))"
                  initial={{ cx: 50, cy: 50, opacity: 0 }}
                  animate={{ cx: [50, n.x], cy: [50, n.y], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.8, delay: i * 0.6 }}
                />
              ))}
          </svg>

          {/* core — centered in its own space */}
          <div className="absolute left-1/2 top-1/2 z-20 w-[32%] max-w-[12rem] -translate-x-1/2 -translate-y-1/2">
            <Core />
          </div>

          {/* four modules in the corners — never overlap the core */}
          <div className="absolute left-0 top-0 z-10 w-[34%]"><ModuleNode index={0} side="left" /></div>
          <div className="absolute right-0 top-0 z-10 w-[34%]"><ModuleNode index={1} side="right" /></div>
          <div className="absolute bottom-0 left-0 z-10 w-[34%]"><ModuleNode index={2} side="left" /></div>
          <div className="absolute bottom-0 right-0 z-10 w-[34%]"><ModuleNode index={3} side="right" /></div>
        </div>

        {/* ===== Mobile / tablet vertical flow ===== */}
        <div className="relative lg:hidden">
          <div className="mx-auto mb-7 w-fit"><Core /></div>
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
