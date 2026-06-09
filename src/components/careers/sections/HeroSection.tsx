import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AuroraEffect from "@/components/careers/AuroraEffect";
import WorkforceSignal from "@/components/careers/WorkforceSignal";
import { hero } from "@/data/careers";
import { fadeUp, staggerContainer } from "@/lib/motion";

const HeroSection = () => {
  return (
    <section className="relative flex min-h-[clamp(640px,88vh,800px)] items-center overflow-hidden px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
      <AuroraEffect className="opacity-70" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-gradient-to-b from-primary/[0.05] to-transparent" />

      <div className="relative z-10 mx-auto grid w-full max-w-[1536px] items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
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

        {/* Right — living workforce-intelligence panel */}
        <WorkforceSignal />
      </div>
    </section>
  );
};

export default HeroSection;
