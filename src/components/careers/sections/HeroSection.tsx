import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import WorkforceSignal from "@/components/careers/WorkforceSignal";
import AwardsMarquee from "@/components/careers/AwardsMarquee";
import { hero } from "@/data/careers";
import { fadeUp, staggerContainer } from "@/lib/motion";

// The lumofy.ai hero, careers edition: a dark canvas with the brand's faint
// 72px grid + drifting Sirius aurora, a centered display headline with the
// main site's blue-soft highlight treatment, pill CTAs, and — where the main
// site shows a product shot — a light "impact console" card showing what the
// team you're joining has shipped. Copy renders verbatim from data/careers.
// "manage performance" carries the main site's hero highlight (its h1 paints
// "Performance Management" in this same blue).
const HIGHLIGHTS = ["transforming", "manage performance"];

// Presentation-only: wrap the highlighted phrases in the main site's .hl color.
const renderHighlighted = (text: string) => {
  let parts: (string | JSX.Element)[] = [text];
  HIGHLIGHTS.forEach((phrase, pi) => {
    parts = parts.flatMap((part) => {
      if (typeof part !== "string" || !part.includes(phrase)) return [part];
      const [before, ...rest] = part.split(phrase);
      return [
        before,
        <span key={`hl-${pi}`} className="text-[hsl(var(--lx-blue-soft))]">{phrase}</span>,
        rest.join(phrase),
      ];
    });
  });
  return parts;
};

const HeroSection = () => {
  return (
    <section className="dark-canvas">
      <div className="grid-lines" aria-hidden="true" />
      <div className="lx-aurora" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 pt-32 pb-14 sm:px-6 sm:pt-36 lg:px-8">
        <motion.div
          className="mx-auto max-w-4xl text-center"
          variants={staggerContainer()}
          initial="hidden"
          animate="show"
        >
          <motion.p variants={fadeUp}>
            <span className="eyebrow-pill">{hero.kicker}</span>
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="mt-6 font-extrabold leading-[1.05] tracking-[-0.028em] text-white"
            style={{ fontSize: "clamp(2.5rem, 5.6vw, 4.25rem)" }}
          >
            {renderHighlighted(hero.headline)}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[hsl(var(--lx-on-dark-2))] sm:text-[1.35rem] sm:leading-normal"
          >
            {hero.subdeck}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="group h-[52px] rounded-full px-8 text-[17px] font-semibold btn-sheen shadow-sirius">
              <Link to={hero.ctaPrimary.to}>
                {hero.ctaPrimary.label}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-[52px] rounded-full border-white/25 bg-transparent px-8 text-[17px] font-semibold text-[hsl(var(--lx-on-dark))] hover:bg-white/10 hover:text-white"
            >
              <a href={hero.ctaSecondary.to}>{hero.ctaSecondary.label}</a>
            </Button>
          </motion.div>
        </motion.div>

        {/* The "product shot" slot from the main site's hero — here it's the
            impact console: real platform numbers the team behind this page shipped. */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-14 max-w-4xl sm:mt-16"
        >
          {/* blue glow bed under the card, like the demo's hero shot */}
          <div
            aria-hidden="true"
            className="absolute -inset-x-8 -bottom-10 top-1/3 -z-10"
            style={{ background: "radial-gradient(60% 70% at 50% 60%, hsl(223 83% 52% / 0.28), transparent 70%)", filter: "blur(30px)" }}
          />
          <WorkforceSignal />
        </motion.div>
      </div>

      {/* Award strip — the team you'd join is an awarded one (logos from lumofy.ai). */}
      <AwardsMarquee />
    </section>
  );
};

export default HeroSection;
