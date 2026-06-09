import { motion } from "framer-motion";
import SectionShell from "./SectionShell";
import { growth } from "@/data/careers";
import { fadeUp, staggerContainer, revealViewport, brandEase } from "@/lib/motion";
import { BRAND_HUES, hueClasses } from "@/lib/deptColor";

// "Growth experience" reframed as a TRAJECTORY: the six growth areas as connected nodes
// on a single drawn path, not an isolated card grid. ONE calm reveal on scroll (the path
// draws top-to-bottom, milestones fade in in sequence); NO continuous motion. The path +
// glow are decorative (aria-hidden); MotionConfig keeps it reduced-motion safe.
const spineDraw = {
  hidden: { scaleY: 0, opacity: 0 },
  show: { scaleY: 1, opacity: 1, transition: { duration: 1, ease: brandEase } },
};

const GrowthExperienceSection = () => (
  <SectionShell
    id="growth"
    kicker="Growth experience"
    title="Designed for the person you're becoming."
    sub="We build workforce growth systems for organizations. Inside Lumofy, we design the same kind of clarity, trust, and momentum for our own team."
    headerClassName="max-w-3xl"
  >
    <div className="relative mx-auto mt-12 max-w-2xl">
      {/* soft depth glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0"
        style={{ background: "radial-gradient(55% 45% at 18% 0%, hsl(var(--primary) / 0.07), transparent 70%)" }}
      />

      {/* trajectory: a drawn path through six growth milestones */}
      <div className="relative">
        <motion.div
          aria-hidden="true"
          variants={spineDraw}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
          className="pointer-events-none absolute left-[22px] top-6 bottom-6 w-px origin-top sm:left-[26px]"
          style={{ background: "linear-gradient(to bottom, hsl(var(--primary) / 0.7), hsl(var(--brand-eclipse) / 0.45) 50%, hsl(var(--brand-aurora) / 0.4))" }}
        />

        <motion.ul
          className="relative space-y-7 sm:space-y-8"
          variants={staggerContainer()}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
        >
          {growth.map((g, i) => {
            const hue = BRAND_HUES[i % BRAND_HUES.length];
            const c = hueClasses[hue];
            return (
              <motion.li key={g.title} variants={fadeUp} className="relative flex gap-5 sm:gap-6">
                {/* milestone node */}
                <span
                  className="relative z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border sm:h-[3.25rem] sm:w-[3.25rem]"
                  style={{
                    background: "hsl(222 30% 9%)",
                    borderColor: `hsl(var(--brand-${hue}) / 0.45)`,
                    boxShadow: `0 0 16px hsl(var(--brand-${hue}) / 0.18)`,
                  }}
                >
                  <span className={`font-mono text-sm font-bold ${c.text}`}>{String(i + 1).padStart(2, "0")}</span>
                </span>
                {/* milestone content */}
                <div className="min-w-0 pt-1 sm:pt-1.5">
                  <h3 className="text-base font-bold text-foreground sm:text-lg">{g.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{g.body}</p>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>

      {/* closing */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={revealViewport}
        transition={{ duration: 0.5, delay: 0.25, ease: brandEase }}
        className="mt-10 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground"
      >
        Growth at Lumofy is not a side benefit. It's part of <span className="font-semibold text-foreground">how the company works</span>.
      </motion.p>
    </div>
  </SectionShell>
);

export default GrowthExperienceSection;
