import { Link } from "react-router-dom";
import { ArrowRight, Linkedin } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import AuroraEffect from "@/components/careers/AuroraEffect";
import { fadeUp, staggerContainer, revealViewport } from "@/lib/motion";

// The closing "decision moment": label + a two-line statement, three conviction pillars,
// and a clear choice (apply, or connect). Aurora atmosphere + one calm staggered reveal;
// MotionConfig keeps it reduced-motion safe. Tight padding — no dead space.
const PILLARS = [
  { title: "Meaningful Work", body: "Build products that help organizations invest in their people.", hue: "--brand-sirius" },
  { title: "Real Ownership", body: "Help shape the product, the company, and the way we work.", hue: "--brand-eclipse" },
  { title: "Continuous Growth", body: "Join a team that believes development should apply internally as much as externally.", hue: "--brand-aurora" },
];

const LINKEDIN_URL = "https://www.linkedin.com/company/lumofyinc/";

const ClosingSection = () => (
  <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
    <AuroraEffect />
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

    <motion.div
      className="relative z-10 mx-auto max-w-4xl text-center"
      variants={staggerContainer()}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
    >
      <motion.p variants={fadeUp} className="mb-5 font-mono text-xs uppercase tracking-[0.25em] text-primary">
        Careers at Lumofy
      </motion.p>

      <motion.h2 variants={fadeUp} className="text-4xl font-extrabold leading-[1.08] tracking-[-0.02em] sm:text-5xl lg:text-[3.5rem]">
        Some careers follow change.
        <br />
        <span className="text-aurora">Others create it.</span>
      </motion.h2>

      <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Join the team building the systems helping organizations understand, develop, and grow their people.
      </motion.p>

      {/* three conviction pillars — clean columns, not cards */}
      <motion.div variants={fadeUp} className="mx-auto mt-14 grid max-w-3xl gap-8 text-left sm:grid-cols-3 sm:gap-7">
        {PILLARS.map((p) => (
          <div key={p.title}>
            <div className="mb-3 h-0.5 w-9 rounded-full" style={{ background: `hsl(var(${p.hue}))` }} aria-hidden="true" />
            <h3 className="text-base font-bold text-foreground">{p.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </motion.div>

      {/* the decision */}
      <motion.div variants={fadeUp} className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-12 rounded-xl px-8 text-base btn-sheen">
          <Link to="/jobs">
            View Open Roles
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-7 text-base">
          <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
            <Linkedin className="mr-2 h-4 w-4" aria-hidden="true" />
            Connect on LinkedIn
          </a>
        </Button>
      </motion.div>
    </motion.div>
  </section>
);

export default ClosingSection;
