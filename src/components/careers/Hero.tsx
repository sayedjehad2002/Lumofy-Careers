import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Rocket, Brain, Sprout, MapPin, Users, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AnimatedCounter from "./AnimatedCounter";
import CommandPalette from "./CommandPalette";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const Hero = () => {
  return (
    <>
      <CommandPalette />

      {/* ── HERO ───────────────────────────────────────── */}
      <section className="relative px-4 pt-24 pb-14 sm:pt-28 sm:pb-20">
        {/* subtle brand wash, no animation */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] bg-gradient-to-b from-primary/[0.05] to-transparent" />

        <motion.div
          className="relative mx-auto max-w-4xl text-center"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Talent Platform
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-7 text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
          >
            Build your future
            <br />
            <span className="text-primary">at Lumofy</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            Join a fast-growing HRTech company where your work directly shapes how
            enterprises build, manage, and grow their workforce.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="group h-12 rounded-xl px-8 text-base" asChild>
              <Link to="/jobs">
                Browse open roles
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 rounded-xl px-8 text-base" asChild>
              <Link to="/about">Explore Lumofy</Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS ──────────────────────────────────────── */}
      <section className="px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <motion.div
            className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {[
              { value: 52, suffix: "", label: "Active Employees", icon: Users },
              { value: 2, suffix: "", label: "Offices — Bahrain & Saudi", icon: Globe },
              { value: 2020, suffix: "", label: "Year Founded", icon: Rocket, raw: true },
              { value: 10, suffix: "+", label: "Countries — Remote Team", icon: MapPin },
            ].map((stat) => (
              <motion.div key={stat.label} variants={fadeUp}>
                <div className="rounded-2xl border border-border bg-card p-5 text-center light-glow sm:p-6">
                  <stat.icon className="mx-auto mb-2.5 h-6 w-6 text-primary" />
                  <div className="text-3xl font-extrabold tabular-nums text-foreground sm:text-4xl">
                    {stat.raw ? (
                      <span>{stat.value}</span>
                    ) : (
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} duration={2} />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── WHY JOIN ───────────────────────────────────── */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mx-auto mb-10 max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Why join <span className="text-primary">Lumofy</span>?
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Be part of a team shaping the future of talent development.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {[
              { icon: Rocket, title: "Shape the future of talent", desc: "Work on products used by organizations across MENA to transform how they build talent.", accent: "Impact at Scale" },
              { icon: Brain, title: "Build AI that empowers", desc: "Be at the forefront of AI in HR technology, building intelligent systems that make real differences.", accent: "AI-First Culture" },
              { icon: Sprout, title: "Grow with a driven team", desc: "Join a fast-growing startup where your contributions directly shape the product, team, and company.", accent: "Rapid Growth" },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp}>
                <div className="group h-full rounded-2xl border border-border bg-card p-6 text-center light-glow transition-transform duration-300 hover:-translate-y-1 sm:p-7">
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/15">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/70">{item.accent}</p>
                  <h3 className="mb-3 text-xl font-bold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

    </>
  );
};

export default Hero;
