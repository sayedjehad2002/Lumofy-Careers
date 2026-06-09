import { motion } from "framer-motion";
import SectionShell from "./SectionShell";
import { growth } from "@/data/careers";
import { fadeUp, staggerContainer, revealViewport } from "@/lib/motion";
import { BRAND_HUES, hueClasses } from "@/lib/deptColor";

// Benefits reframed as the candidate's trajectory, not company perks (spec §8 §5).
const GrowthExperienceSection = () => (
  <SectionShell
    id="growth"
    kicker="Growth experience"
    title="Your trajectory"
    sub="We don't list perks. We design for the person you're becoming."
  >
    <motion.div
      className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      variants={staggerContainer()}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
    >
      {growth.map((g, i) => {
        const c = hueClasses[BRAND_HUES[i % BRAND_HUES.length]];
        return (
          <motion.div key={g.title} variants={fadeUp} className="h-full">
            <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 light-glow transition-transform duration-300 hover:-translate-y-1">
              <span className={`font-mono text-[11px] uppercase tracking-[0.18em] ${c.text}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-lg font-bold text-foreground">{g.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.body}</p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  </SectionShell>
);

export default GrowthExperienceSection;
