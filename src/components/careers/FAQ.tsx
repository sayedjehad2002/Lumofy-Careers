import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "How long does the hiring process take?", a: "Most processes wrap up in two to three weeks, and you'll hear back from us within five business days of applying." },
  { q: "Do you support remote work?", a: "Yes. We support flexible, hybrid working — many roles can be fully remote — with team members across 10+ countries and offices in Bahrain and Saudi Arabia." },
  { q: "What is your interview process like?", a: "A short intro call with our talent team, then interviews with the people you'll actually work with. We focus on real problems, not trick questions." },
  { q: "Do you sponsor visas or relocation?", a: "For some roles, yes. If relocation or sponsorship is relevant to a position, we'll discuss it transparently during the intro call." },
  { q: "What do you look for in candidates?", a: "Curiosity, ownership, and a genuine drive to build. We care more about how you think and what you've built than about a perfect CV." },
  { q: "I don't see a role that fits. Can I still apply?", a: "Absolutely. Browse our open roles and apply to the closest match, and tell us where you'd add the most value." },
];

const FAQ = () => (
  <section className="px-4 py-16 sm:py-20">
    <div className="mx-auto max-w-3xl">
      <motion.div
        className="mb-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Frequently asked questions</h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </div>
  </section>
);

export default FAQ;
