import { Link } from "react-router-dom";
import { ArrowRight, Linkedin } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { fadeUp, staggerContainer, revealViewport } from "@/lib/motion";

// The closing "decision moment" in the main site's ctacard language: a big
// dark rounded canvas (grid + Sirius aurora) floating on the light page,
// carrying the statement, three conviction pillars, and the pill CTAs.
const PILLARS = [
  { title: "Meaningful Work", body: "Build products that help organizations invest in their people.", hue: "--brand-sirius" },
  { title: "Real Ownership", body: "Help shape the product, the company, and the way we work.", hue: "--brand-eclipse" },
  { title: "Continuous Growth", body: "Join a team that believes development should apply internally as much as externally.", hue: "--brand-aurora" },
];

const LINKEDIN_URL = "https://www.linkedin.com/company/lumofyinc/";

const ClosingSection = () => (
  <section className="px-4 py-[clamp(4rem,7vw,6.5rem)] sm:px-6 lg:px-8">
    <motion.div
      className="dark-canvas relative mx-auto max-w-6xl rounded-[clamp(20px,2.4vw,32px)] px-6 py-14 text-center shadow-[0_40px_80px_-24px_rgba(11,16,32,0.4)] sm:px-10 sm:py-16 lg:py-20 3xl:max-w-7xl 3xl:py-24 4xl:max-w-[88rem]"
      variants={staggerContainer()}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
    >
      <div className="grid-lines" aria-hidden="true" />
      <div className="lx-aurora !opacity-40" aria-hidden="true" />

      <div className="relative z-10">
        <motion.p variants={fadeUp}>
          <span className="eyebrow-pill">Careers at Lumofy</span>
        </motion.p>

        <motion.h2 variants={fadeUp} className="sec-title mt-6 text-white">
          Some careers follow change.
          <br />
          <span className="text-[hsl(var(--lx-blue-soft))]">Others create it.</span>
        </motion.h2>

        <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[hsl(var(--lx-on-dark-2))]">
          Join the team building the systems helping organizations understand, develop, and grow their people.
        </motion.p>

        {/* three conviction pillars — clean columns inside the card */}
        <motion.div variants={fadeUp} className="mx-auto mt-12 grid max-w-3xl gap-8 text-left sm:grid-cols-3 sm:gap-7">
          {PILLARS.map((p) => (
            <div key={p.title}>
              <div className="mb-3 h-0.5 w-9 rounded-full" style={{ background: `hsl(var(${p.hue}))` }} aria-hidden="true" />
              <h3 className="text-base font-bold text-white">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--lx-on-dark-2))]">{p.body}</p>
            </div>
          ))}
        </motion.div>

        {/* the decision */}
        <motion.div variants={fadeUp} className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-[52px] rounded-full px-8 text-[17px] font-semibold btn-sheen shadow-sirius">
            <Link to="/jobs">
              View Open Roles
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-[52px] rounded-full border-white/25 bg-transparent px-8 text-[17px] font-semibold text-[hsl(var(--lx-on-dark))] hover:bg-white/10 hover:text-white"
          >
            <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
              <Linkedin className="mr-2 h-4 w-4" aria-hidden="true" />
              Connect on LinkedIn
              <span className="sr-only">(opens in new tab)</span>
            </a>
          </Button>
        </motion.div>
      </div>
    </motion.div>
  </section>
);

export default ClosingSection;
