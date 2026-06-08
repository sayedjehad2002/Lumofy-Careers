import { Link } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import AuroraEffect from "@/components/careers/AuroraEffect";
import { faqs, recruiter } from "@/data/careers";
import { useCareers } from "@/contexts/CareersContext";

// Quiet FAQ + the horizon close: aurora #2, mission restatement, live count, one
// decisive CTA, and a human recruiter handoff (spec §8 §8).
const ClosingSection = () => {
  const { jobs } = useCareers();
  const openCount = jobs.filter((j) => j.status === "open").length;

  return (
    <>
      {/* FAQ — quiet */}
      <section id="faq" className="scroll-mt-24 px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="mb-8 text-center font-mono text-xs uppercase tracking-[0.2em] text-primary">Questions</p>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Horizon close */}
      <section className="relative overflow-hidden px-4 py-28 sm:py-36">
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

          {/* Recruiter handoff — a real person */}
          <div className="mx-auto mt-14 flex max-w-md items-center gap-4 rounded-2xl border border-border bg-card/70 p-4 text-left backdrop-blur">
            <img
              src={recruiter.photo}
              alt={recruiter.name}
              loading="lazy"
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{recruiter.name}</p>
              <p className="truncate font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {recruiter.title}
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="ml-auto shrink-0 rounded-lg">
              <a href={`mailto:${recruiter.email}`}>
                <Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Say hi
              </a>
            </Button>
          </div>
        </motion.div>
      </section>
    </>
  );
};

export default ClosingSection;
