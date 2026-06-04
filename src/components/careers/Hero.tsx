import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Sparkles, ArrowRight, Rocket, Brain, Sprout, MapPin, Users, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useRef } from "react";
import AnimatedCounter from "./AnimatedCounter";
import CommandPalette from "./CommandPalette";
import ParticleNetwork from "./ParticleNetwork";
import TypewriterText from "./TypewriterText";
import TextMarquee from "./TextMarquee";
import FloatingShapes from "./FloatingShapes";
import TiltCard from "./TiltCard";
import AuroraEffect from "./AuroraEffect";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const blurReveal = {
  hidden: { opacity: 0, filter: "blur(12px)", y: 20 },
  show: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const slideInRight = {
  hidden: { opacity: 0, x: 40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const Hero = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const whyRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const bgY = useTransform(heroScroll, [0, 1], ["0%", "40%"]);
  const heroOpacity = useTransform(heroScroll, [0, 0.7], [1, 0]);
  const heroScale = useTransform(heroScroll, [0, 0.7], [1, 0.92]);
  const smoothOpacity = useSpring(heroOpacity, { stiffness: 100, damping: 30 });
  const smoothScale = useSpring(heroScale, { stiffness: 100, damping: 30 });

  const { scrollYProgress: statsScroll } = useScroll({
    target: statsRef,
    offset: ["start end", "end start"],
  });
  const statsY = useTransform(statsScroll, [0, 1], [60, -20]);
  const smoothStatsY = useSpring(statsY, { stiffness: 80, damping: 25 });

  const { scrollYProgress: whyScroll } = useScroll({
    target: whyRef,
    offset: ["start end", "end start"],
  });
  const whyBgY = useTransform(whyScroll, [0, 1], [40, -40]);

  return (
    <>
      <CommandPalette />

      {/* ═══════════════════════════════════════════
          HERO — Particle network + typewriter
         ═══════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-[100vh] flex items-center justify-center px-4 overflow-hidden">
        {/* Particle network background */}
        <div className="absolute inset-0 z-0">
          <ParticleNetwork />
        </div>

        {/* Aurora effect */}
        <AuroraEffect className="z-[1]" />

        {/* Gradient orbs with parallax */}
        <motion.div className="absolute inset-0 pointer-events-none z-[1]" style={{ y: bgY }}>
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />

          <motion.div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[200px]"
            style={{ background: "radial-gradient(circle, hsl(217 91% 60% / 0.12), transparent 70%)" }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.div
            className="absolute top-1/3 right-[10%] w-[400px] h-[400px] rounded-full blur-[160px]"
            style={{ background: "hsl(270 80% 60% / 0.07)" }}
            animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.div
            className="absolute bottom-1/4 left-[15%] w-[500px] h-[400px] rounded-full blur-[180px] hidden dark:block"
            style={{ background: "hsl(185 90% 55% / 0.04)" }}
            animate={{ scale: [1, 1.2, 1], x: [0, -20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Floating geometric shapes */}
        <FloatingShapes className="z-[1]" />

        <motion.div
          className="max-w-5xl mx-auto text-center relative z-10 pt-24 pb-16"
          style={{ opacity: smoothOpacity, scale: smoothScale }}
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {/* Badge */}
          <motion.div variants={scaleIn}>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/8 border border-primary/15 mb-10 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary tracking-wider uppercase">
                AI-Powered Talent Platform
              </span>
            </div>
          </motion.div>

          {/* Headline with typewriter */}
          <motion.h1
            className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.05]"
            variants={blurReveal}
          >
            <motion.span
              className="block"
              variants={blurReveal}
            >
              Build Your Future
            </motion.span>
            <motion.span
              className="text-gradient relative dark:neon-text inline-block mt-2"
              variants={blurReveal}
            >
              <TypewriterText
                texts={["at Lumofy", "in HRTech", "with AI", "at Lumofy"]}
                typingSpeed={90}
                deletingSpeed={50}
                pauseDuration={2500}
              />
              <motion.span
                className="absolute -inset-4 -z-10 blur-[60px] rounded-full"
                style={{ background: "hsl(217 91% 60% / 0.25)" }}
                animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.span>
          </motion.h1>

          {/* Animated divider */}
          <motion.div className="w-24 h-[2px] mx-auto mb-8 rounded-full overflow-hidden" variants={fadeUp}>
            <motion.div
              className="w-full h-full"
              style={{ background: "linear-gradient(90deg, transparent, hsl(217 91% 60% / 0.6), hsl(270 80% 60% / 0.4), transparent)" }}
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          {/* Subheading */}
          <motion.p
            className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
            variants={fadeUp}
          >
            Join a fast-growing HRTech company where your work directly shapes how enterprises build, manage, and grow their workforce.
          </motion.p>

          {/* Buttons */}
          <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-4" variants={fadeUp}>
            <Button size="lg" className="px-10 h-13 text-base rounded-xl shadow-lg shadow-primary/25 group" asChild>
              <Link to="/jobs">
                <span className="flex items-center gap-2">
                  Browse Jobs
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                </span>
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8 h-13 text-base rounded-xl backdrop-blur-sm border-white/30 text-white hover:text-white bg-primary" asChild>
              <Link to="/about">Explore Lumofy</Link>
            </Button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="mt-16 flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Scroll</span>
            <motion.div
              className="w-5 h-8 rounded-full border border-muted-foreground/20 flex items-start justify-center p-1"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div
                className="w-1 h-2 rounded-full bg-primary/50"
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════
          TEXT MARQUEE
         ═══════════════════════════════════════════ */}
      <TextMarquee />

      {/* ═══════════════════════════════════════════
          STATS — Scroll-linked animated counters
         ═══════════════════════════════════════════ */}
      <section ref={statsRef} className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.02] via-foreground/[0.05] to-foreground/[0.02]" />
        <FloatingShapes className="opacity-50" />

        <motion.div className="max-w-6xl mx-auto relative z-10" style={{ y: smoothStatsY }}>
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs font-medium text-primary tracking-wider uppercase">Our Team</span>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {[
              { value: 52, suffix: "", label: "Active Employees", icon: Users, color: "from-violet-500/20 to-violet-600/5" },
              { value: 2, suffix: "", label: "Offices — Bahrain & Saudi", icon: Globe, color: "from-cyan-500/20 to-cyan-600/5" },
              { value: 2020, suffix: "", label: "Year Founded", icon: Rocket, color: "from-blue-500/20 to-blue-600/5" },
              { value: 10, suffix: "+", label: "Countries — Remote Team", icon: MapPin, color: "from-emerald-500/20 to-emerald-600/5" },
            ].map((stat) => (
              <motion.div key={stat.label} className="relative group" variants={fadeUp}>
                <TiltCard className="group">
                  <div className="relative rounded-2xl glass-card p-6 sm:p-8 text-center dark:premium-card overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />
                    <stat.icon className="w-6 h-6 text-primary mx-auto mb-3 relative z-10" />
                    <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground relative z-10 tabular-nums">
                      {stat.label === "Year Founded" ? (
                        <span>{stat.value}</span>
                      ) : (
                        <AnimatedCounter value={stat.value} suffix={stat.suffix} duration={2} />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 relative z-10">{stat.label}</p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════
          WHY JOIN — 3D tilt cards + staggered reveals
         ═══════════════════════════════════════════ */}
      <section ref={whyRef} className="relative py-24 px-4 overflow-hidden">
        <motion.div className="absolute inset-0 pointer-events-none" style={{ y: whyBgY }}>
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-[200px]"
            style={{ background: "hsl(217 91% 60% / 0.06)" }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <FloatingShapes className="opacity-40" />

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
              Why Join <span className="text-gradient dark:neon-text">Lumofy</span>?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base sm:text-lg">
              Be part of a team shaping the future of talent development.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {[
              { icon: Rocket, title: "Shape the Future of Talent", desc: "Work on products used by organizations across MENA to transform how they build talent.", accent: "Impact at Scale", variant: slideInLeft },
              { icon: Brain, title: "Build AI That Empowers", desc: "Be at the forefront of AI in HR technology, building intelligent systems that make real differences.", accent: "AI-First Culture", variant: fadeUp },
              { icon: Sprout, title: "Grow With a Driven Team", desc: "Join a fast-growing startup where your contributions directly shape the product, team, and company.", accent: "Rapid Growth", variant: slideInRight },
            ].map((item) => (
              <motion.div key={item.title} variants={item.variant}>
                <TiltCard className="group h-full">
                  <div className="rounded-2xl glass-card p-8 text-center dark:premium-card relative overflow-hidden h-full">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-primary/5 via-transparent to-transparent rounded-2xl" />
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300 relative z-10">
                      <item.icon className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-primary/70 font-semibold mb-3 relative z-10">{item.accent}</p>
                    <h3 className="font-semibold text-xl mb-3 relative z-10">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed relative z-10">{item.desc}</p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CINEMATIC STATEMENT — "Work That Matters"
         ═══════════════════════════════════════════ */}
      <section className="relative py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-foreground/[0.04] to-background" />

        <motion.div
          className="absolute top-1/2 left-0 w-full h-[1px] -translate-y-1/2"
          style={{ background: "linear-gradient(90deg, transparent, hsl(217 91% 60% / 0.1), transparent)" }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[200px]"
          style={{ background: "hsl(217 91% 60% / 0.08)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.h2
            className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 tracking-tight"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            Work That <span className="text-gradient dark:neon-text">Matters</span>.
          </motion.h2>

          <motion.div
            className="w-16 h-[2px] mx-auto mb-8 rounded-full overflow-hidden"
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              className="w-full h-full"
              style={{ background: "linear-gradient(90deg, hsl(217 91% 60% / 0.5), hsl(270 80% 60% / 0.3))" }}
            />
          </motion.div>

          <motion.p
            className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Every feature you ship reaches enterprise clients managing thousands of employees.
            Every model you train makes hiring and development smarter.
            Here, your contributions have measurable business impact.
          </motion.p>
        </div>
      </section>
    </>
  );
};

export default Hero;
