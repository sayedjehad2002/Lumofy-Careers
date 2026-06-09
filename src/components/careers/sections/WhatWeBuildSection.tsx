import { motion } from "framer-motion";
import { LayoutGrid, TrendingUp, GraduationCap, HeartPulse, type LucideIcon } from "lucide-react";
import SectionShell from "./SectionShell";
import { pillars } from "@/data/careers";
import { fadeUp, staggerContainer, revealViewport, brandEase } from "@/lib/motion";
import { hueClasses } from "@/lib/deptColor";
import lumofyLogo from "@/assets/lumofy-mark.png";

// "The system you'll help build" — a Connected System Map: a central Lumofy intelligence
// layer with the four product modules connected to it by drawn signal lines. ONE calm
// reveal on scroll (core + modules fade in, the connectors draw once); NO continuous
// motion. Connectors + logo are decorative (aria-hidden); MotionConfig keeps it
// reduced-motion safe globally. Collapses to core-on-top + stacked modules below lg.
const MODULE_ICONS: LucideIcon[] = [LayoutGrid, TrendingUp, GraduationCap, HeartPulse];

const lineDraw = {
  hidden: { pathLength: 0, opacity: 0 },
  show: { pathLength: 1, opacity: 1, transition: { duration: 0.8, ease: brandEase } },
};

// core (50,50) -> the four module quadrant anchors, as percent of the system box.
const LINKS = [
  [20, 25],
  [80, 25],
  [20, 75],
  [80, 75],
];

const WhatWeBuildSection = () => (
  <SectionShell
    id="building"
    kicker="The system you'll help build"
    title="One platform connecting the systems behind workforce growth."
    sub="Lumofy brings competencies, performance, learning, and engagement into one intelligence layer so organizations can understand people clearly and help them grow."
    headerClassName="max-w-3xl"
  >
    <motion.div
      className="mt-12 lg:mt-16"
      variants={staggerContainer()}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
    >
      {/* the system: central core + four connected modules */}
      <div className="relative">
        {/* connector lines from the core to each module (desktop) — draw once */}
        <svg
          className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
        >
          {LINKS.map(([x, y], i) => (
            <motion.line
              key={i}
              x1="50"
              y1="50"
              x2={x}
              y2={y}
              stroke="hsl(var(--primary))"
              strokeOpacity="0.3"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              variants={lineDraw}
            />
          ))}
        </svg>

        {/* central intelligence core — top on mobile, centered on desktop */}
        <motion.div
          variants={fadeUp}
          className="mx-auto mb-8 w-fit lg:absolute lg:left-1/2 lg:top-1/2 lg:z-20 lg:mb-0 lg:-translate-x-1/2 lg:-translate-y-1/2"
        >
          <div
            className="flex flex-col items-center gap-2.5 rounded-2xl border border-primary/30 px-6 py-4 shadow-[0_0_30px_hsl(var(--primary)/0.25)] backdrop-blur-sm"
            style={{ background: "radial-gradient(120% 120% at 50% 0%, hsl(var(--primary) / 0.16), hsl(222 30% 9%))" }}
          >
            <img src={lumofyLogo} alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
            <span className="text-center font-mono text-[10px] uppercase leading-tight tracking-wider text-primary">
              Workforce
              <br />
              intelligence layer
            </span>
          </div>
        </motion.div>

        {/* the four connected modules */}
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-x-44 lg:gap-y-6">
          {pillars.map((p, i) => {
            const c = hueClasses[p.hue];
            const Icon = MODULE_ICONS[i];
            return (
              <motion.div
                key={p.name}
                variants={fadeUp}
                className="group relative z-10 rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 sm:p-6"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${c.bgSoft}`}>
                    <Icon className={`h-5 w-5 ${c.text}`} aria-hidden="true" />
                  </span>
                  <h3 className="text-base font-bold text-foreground sm:text-lg">{p.name}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.line}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* closing line */}
      <motion.p variants={fadeUp} className="mt-8 text-center text-sm text-muted-foreground">
        Together, these systems turn workforce signals into <span className="font-semibold text-foreground">intelligent action</span>.
      </motion.p>
    </motion.div>
  </SectionShell>
);

export default WhatWeBuildSection;
