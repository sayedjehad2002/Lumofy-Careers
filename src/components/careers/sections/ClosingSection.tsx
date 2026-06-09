import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import AuroraEffect from "@/components/careers/AuroraEffect";
import { useCareers } from "@/contexts/CareersContext";

// Quiet FAQ + the horizon close: aurora #2, mission restatement, live count, one
// decisive CTA, and a human recruiter handoff (spec §8 §8).
const ClosingSection = () => {
  const { jobs } = useCareers();
  const openCount = jobs.filter((j) => j.status === "open").length;

  return (
    <>
      {/* Horizon close */}
      <section className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-36">
        <AuroraEffect />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <motion.div
          className="relative z-10 mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.02em] sm:text-5xl lg:text-6xl">
            Build what the future
            <br />
            <span className="text-aurora">of work runs on.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            {openCount > 0
              ? `${openCount} open ${openCount === 1 ? "role" : "roles"} and counting. `
              : "We hire continuously. "}
            Your work will reach enterprises shaping how the region grows its people.
          </p>
          <div className="mt-9 flex justify-center">
            <Button asChild size="lg" className="h-12 rounded-xl px-8 text-base btn-sheen">
              <Link to="/jobs">
                View open roles
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </>
  );
};

export default ClosingSection;
