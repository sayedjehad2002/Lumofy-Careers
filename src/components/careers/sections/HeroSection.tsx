import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AuroraEffect from "@/components/careers/AuroraEffect";
import AnimatedCounter from "@/components/careers/AnimatedCounter";
import { useCareers } from "@/contexts/CareersContext";
import { hero } from "@/data/careers";
import { SITE } from "@/data/site";
import { fadeUp, staggerContainer, brandEase } from "@/lib/motion";
import { hueClasses } from "@/lib/deptColor";

// A stylized representation of the product's "workforce signal" — illustrative,
// not company KPIs. Reinforces that Lumofy measures capability (spec §8 §1).
const signals = [
  { label: "Competency mapping", hue: "sirius", level: 0.92 },
  { label: "Performance signal", hue: "eclipse", level: 0.74 },
  { label: "Learning velocity", hue: "aurora", level: 0.86 },
  { label: "Engagement index", hue: "nova", level: 0.81 },
] as const;

const HeroSection = () => {
  const { jobs } = useCareers();
  const openCount = jobs.filter((j) => j.status === "open").length;

  return (
    <section className="relative flex min-h-[88vh] items-center overflow-hidden px-4 pt-24 pb-16 sm:pt-28">
      <AuroraEffect className="opacity-70" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-gradient-to-b from-primary/[0.05] to-transparent" />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        {/* Left — the thesis */}
        <motion.div variants={staggerContainer()} initial="hidden" animate="show">
          <motion.p variants={fadeUp} className="mb-5 font-mono text-xs uppercase tracking-[0.25em] text-primary">
            {hero.kicker}
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="font-extrabold leading-[1.04] tracking-[-0.03em] text-foreground"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
          >
            {hero.headline}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            {hero.subdeck}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="group h-12 rounded-xl px-7 text-base btn-sheen">
              <Link to={hero.ctaPrimary.to}>
                {hero.ctaPrimary.label}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-7 text-base">
              <a href={hero.ctaSecondary.to}>{hero.ctaSecondary.label}</a>
            </Button>
          </motion.div>
        </motion.div>

        {/* Right — live system panel (data, not decoration) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: brandEase }}
          className="glass-card relative rounded-2xl p-6 sm:p-7"
        >
          <div className="mb-5 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Workforce signal
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Live
            </span>
          </div>

          <div className="space-y-4">
            {signals.map((s, i) => (
              <div key={s.label}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{s.label}</span>
                  <span className={`font-mono text-xs ${hueClasses[s.hue].text}`}>{Math.round(s.level * 100)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className={`h-full rounded-full ${hueClasses[s.hue].bg}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: s.level }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.12, ease: brandEase }}
                    style={{ transformOrigin: "left" }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-end justify-between border-t border-border/60 pt-5">
            <div>
              {openCount > 0 ? (
                <>
                  <div className="text-4xl font-extrabold tabular-nums text-foreground">
                    <AnimatedCounter value={openCount} duration={1.6} />
                  </div>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Open roles
                  </p>
                </>
              ) : (
                <>
                  <div className="text-3xl font-extrabold text-foreground">Always</div>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Open to talent
                  </p>
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
      </div>
    </section>
  );
};

export default HeroSection;
