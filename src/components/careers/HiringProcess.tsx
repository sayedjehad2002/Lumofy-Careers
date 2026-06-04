import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const steps = [
  { n: "01", title: "Apply", desc: "Send your application in a few minutes. No endless forms." },
  { n: "02", title: "Intro call", desc: "A friendly conversation with our talent team to get to know you." },
  { n: "03", title: "Meet the team", desc: "Interviews with the people you'll actually work alongside." },
  { n: "04", title: "Offer", desc: "We move fast, keep you informed, and welcome you aboard." },
];

const HiringProcess = () => (
  <section className="px-4 py-16 sm:py-20">
    <div className="mx-auto max-w-6xl">
      <motion.div
        className="mx-auto mb-10 max-w-2xl text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">What to expect</h2>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          A clear, respectful process, usually wrapped up in two to three weeks.
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
      >
        {steps.map((s) => (
          <motion.div key={s.n} variants={fadeUp} className="rounded-2xl border border-border bg-card p-6 light-glow">
            <span className="font-['Urbanist'] text-3xl font-extrabold text-primary/30">{s.n}</span>
            <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        We respond to every application within <span className="font-semibold text-foreground">5 business days</span>.
      </p>
    </div>
  </section>
);

export default HiringProcess;
