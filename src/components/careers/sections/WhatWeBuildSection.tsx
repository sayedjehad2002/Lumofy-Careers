import { motion } from "framer-motion";
import SectionShell from "./SectionShell";
import { pillars } from "@/data/careers";
import { scaleIn, staggerContainer, revealViewport } from "@/lib/motion";
import { hueClasses } from "@/lib/deptColor";

// Disciplined product showcase: four platform pillars that assemble on scroll,
// each in its semantic hue. Show, don't tell (spec §8 §3).
const WhatWeBuildSection = () => (
  <SectionShell
    id="building"
    kicker="What we're building"
    title={
      <>
        One platform for <span className="text-aurora">workforce intelligence</span>
      </>
    }
    sub="Four connected systems that help organizations see, grow, and keep their people."
  >
    <motion.div
      className="mt-8 grid gap-5 sm:grid-cols-2"
      variants={staggerContainer()}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
    >
      {pillars.map((p, i) => {
        const c = hueClasses[p.hue];
        return (
          <motion.div key={p.name} variants={scaleIn} className="glass-card group relative overflow-hidden rounded-2xl p-7">
            <div className="mb-5 flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bgSoft}`}>
                <span className={`h-3 w-3 rounded-[3px] ${c.bg}`} />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {String(i + 1).padStart(2, "0")} / Pillar
              </span>
            </div>
            <h3 className="text-xl font-bold text-foreground">{p.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.line}</p>
          </motion.div>
        );
      })}
    </motion.div>
  </SectionShell>
);

export default WhatWeBuildSection;
