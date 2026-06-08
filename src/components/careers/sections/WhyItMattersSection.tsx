import { motion } from "framer-motion";
import SectionShell from "./SectionShell";
import { stakes } from "@/data/careers";
import { fadeUp, staggerContainer, revealViewport } from "@/lib/motion";
import { hueClasses, type BrandHue } from "@/lib/deptColor";

// The stakes: why workforce intelligence matters now. Editorial lead statement
// (left-aligned for confidence) + three scroll-revealed stake points (spec §8 §2).
const hues: BrandHue[] = ["sirius", "eclipse", "aurora"];

const WhyItMattersSection = () => (
  <SectionShell
    id="why"
    kicker="Why this matters"
    title={stakes.lead}
    headerClassName="max-w-4xl text-left mx-0"
  >
    <motion.div
      className="mt-14 grid gap-6 md:grid-cols-3"
      variants={staggerContainer()}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
    >
      {stakes.points.map((p, i) => {
        const c = hueClasses[hues[i % hues.length]];
        return (
          <motion.div
            key={p.title}
            variants={fadeUp}
            className="relative overflow-hidden rounded-2xl border border-border bg-card/50 p-6"
          >
            <div className={`absolute inset-x-0 top-0 h-[2px] ${c.bg}`} />
            <span className={`font-mono text-sm ${c.text}`}>{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-3 text-lg font-bold leading-snug text-foreground">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
          </motion.div>
        );
      })}
    </motion.div>
  </SectionShell>
);

export default WhyItMattersSection;
