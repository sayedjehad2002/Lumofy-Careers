import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "@/components/careers/Navbar";
import Footer from "@/components/careers/Footer";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, Lightbulb, Users, Rocket, Shield, Sparkles, ArrowRight,
} from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

const benefits = [
  {
    icon: TrendingUp,
    title: "Growth & Development",
    description: "Support continuous learning, skill-building, and professional growth as Lumofy scales.",
  },
  {
    icon: Sparkles,
    title: "Career Progression",
    description: "Work in an environment where strong performance, ownership, and initiative are recognized.",
  },
  {
    icon: Lightbulb,
    title: "Meaningful Impact",
    description: "Contribute to products and ideas that shape how organizations manage talent and skills.",
  },
  {
    icon: Users,
    title: "Collaborative Culture",
    description: "Join a team that values trust, communication, and shared success across functions.",
  },
  {
    icon: Rocket,
    title: "Innovation-Driven Environment",
    description: "Work close to modern AI and HRTech solutions in a company focused on building what matters.",
  },
  {
    icon: Shield,
    title: "Ownership & Autonomy",
    description: "Take responsibility, contribute ideas, and help shape outcomes with real influence.",
  },
];

const BenefitsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── HERO ───────────────────────────────────────── */}
      <section className="relative px-4 pt-28 pb-14 sm:pb-16">
        {/* subtle brand wash, no animation */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] bg-gradient-to-b from-primary/[0.05] to-transparent" />

        <motion.div
          className="relative mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Benefits</span>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Benefits at <span className="text-primary">Lumofy</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Tangible advantages that support your career, wellbeing, and professional development — not just promises.
          </p>
        </motion.div>
      </section>

      {/* ── BENEFIT CARDS ──────────────────────────────── */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {benefits.map((benefit) => (
              <motion.div
                key={benefit.title}
                variants={fadeUp}
                className="rounded-2xl border border-border bg-card p-6 light-glow transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1.5 text-lg font-bold">{benefit.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/30 px-4 py-16 sm:py-20">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
        >
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to make an impact?</h2>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Explore our open positions and find where you can grow with us.
          </p>
          <div className="mt-8">
            <Button size="lg" className="group h-12 rounded-xl px-8 text-base" asChild>
              <Link to="/jobs">
                Explore Open Roles
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default BenefitsPage;
