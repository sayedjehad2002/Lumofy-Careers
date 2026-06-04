import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Globe, HeartPulse, GraduationCap, Coins, Laptop, Plane } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

const perks = [
  { icon: Globe, title: "Remote-first flexibility", desc: "Work from anywhere across our 10+ countries, with hubs in Bahrain and Saudi Arabia." },
  { icon: Coins, title: "Competitive pay & equity", desc: "Compensation benchmarked to top regional tech, plus a real stake in what you build." },
  { icon: HeartPulse, title: "Health & wellbeing", desc: "Comprehensive medical cover for you and your family, and the time to recharge." },
  { icon: GraduationCap, title: "Learning budget", desc: "An annual budget for courses, conferences, and the tools to grow your craft." },
  { icon: Laptop, title: "Top-tier gear", desc: "The hardware and software you need to do the best work of your career." },
  { icon: Plane, title: "Generous time off", desc: "Paid leave, parental leave, and the trust to take the breaks you need." },
];

const Benefits = () => (
  <section className="px-4 py-16 sm:py-20">
    <div className="mx-auto max-w-6xl">
      <motion.div
        className="mx-auto mb-10 max-w-2xl text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Benefits that actually matter</h2>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">We invest in the people who build Lumofy.</p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
      >
        {perks.map((p) => (
          <motion.div key={p.title} variants={fadeUp} className="rounded-2xl border border-border bg-card p-6 light-glow">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <p.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mb-1.5 text-lg font-bold">{p.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-8 text-center">
        <Link to="/benefits" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-all hover:gap-2.5">
          See all benefits <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </section>
);

export default Benefits;
