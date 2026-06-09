import { motion } from "framer-motion";
import { Check } from "lucide-react";
import SectionShell from "./SectionShell";
import { stakes } from "@/data/careers";
import { fadeUp, staggerContainer, revealViewport, brandEase } from "@/lib/motion";
import lumofyLogo from "@/assets/lumofy-mark.png";

// "The problem worth joining" — a Transformation System: today's challenge -> the Lumofy
// intelligence layer -> what we're building. ONE calm, comprehension-led reveal on scroll
// (the shared fadeUp/stagger; MotionConfig makes it reduced-motion safe globally). NO
// continuous motion — the section stays still after it appears. The connector signal and
// the logo mark are decorative (aria-hidden).
const lineReveal = {
  hidden: { opacity: 0, scaleX: 0 },
  show: { opacity: 1, scaleX: 1, transition: { duration: 0.8, ease: brandEase } },
};

const WhyItMattersSection = () => (
  <SectionShell id="why" kicker={stakes.kicker} title={stakes.lead} sub={stakes.sub} headerClassName="max-w-3xl">
    <motion.div
      className="mt-12 sm:mt-14"
      variants={staggerContainer()}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
    >
      <div className="relative grid items-stretch gap-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-3">
        {/* the signal connecting the two sides — draws once (desktop) */}
        <motion.div
          aria-hidden="true"
          variants={lineReveal}
          className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-px origin-left -translate-y-1/2 lg:block"
          style={{ background: "linear-gradient(90deg, transparent, hsl(var(--muted-foreground) / 0.3) 15%, hsl(var(--primary) / 0.6) 50%, hsl(var(--brand-aurora) / 0.45) 85%, transparent)" }}
        />

        {/* LEFT — Today's challenge */}
        <motion.div variants={fadeUp} className="relative z-10 rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm sm:p-7">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Today's challenge</p>
          <ul className="space-y-3.5">
            {stakes.problems.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/50" />
                {p}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* CENTER — Lumofy intelligence layer */}
        <motion.div variants={fadeUp} className="relative z-20 flex items-center justify-center py-1 lg:px-6 lg:py-0">
          <div className="flex flex-col items-center gap-2.5">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 shadow-[0_0_26px_hsl(var(--primary)/0.3)]"
              style={{ background: "radial-gradient(120% 120% at 50% 0%, hsl(var(--primary) / 0.16), hsl(222 30% 9%))" }}
            >
              <img src={lumofyLogo} alt="" aria-hidden="true" className="h-7 w-7 object-contain" />
            </span>
            <span className="text-center font-mono text-[10px] uppercase leading-tight tracking-wider text-primary">
              Lumofy
              <br />
              intelligence layer
            </span>
          </div>
        </motion.div>

        {/* RIGHT — What we're building */}
        <motion.div variants={fadeUp} className="relative z-10 rounded-2xl border border-primary/20 bg-primary/[0.05] p-6 backdrop-blur-sm sm:p-7">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">What we're building</p>
          <ul className="space-y-3.5">
            {stakes.solutions.map((s) => (
              <li key={s} className="flex items-center gap-3 text-sm text-foreground">
                <Check aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-[hsl(var(--brand-aurora))]" />
                {s}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* proof */}
      <motion.p variants={fadeUp} className="mt-7 text-center text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{stakes.proof.lead}</span> {stakes.proof.rest}
      </motion.p>
    </motion.div>
  </SectionShell>
);

export default WhyItMattersSection;
