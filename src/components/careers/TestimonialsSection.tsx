import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowRight, Zap, BarChart3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useRef } from "react";
import TiltCard from "./TiltCard";
import FloatingShapes from "./FloatingShapes";

const differentiators = [
  {
    icon: Zap,
    title: "AI-Native Stack",
    desc: "Work with cutting-edge AI models that power real workforce decisions for enterprise clients.",
    gradient: "from-amber-500/10 to-orange-500/5",
  },
  {
    icon: BarChart3,
    title: "Data-Driven Impact",
    desc: "Every feature you ship is measured by how it accelerates talent outcomes across the region.",
    gradient: "from-blue-500/10 to-indigo-500/5",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Trust",
    desc: "Trusted by leading government and enterprise organizations across MENA to manage critical talent data.",
    gradient: "from-emerald-500/10 to-teal-500/5",
  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const TestimonialsSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const smoothBgY = useSpring(bgY, { stiffness: 80, damping: 25 });

  return (
    <section ref={sectionRef} className="relative py-24 px-4 overflow-hidden">
      <motion.div className="absolute inset-0 pointer-events-none" style={{ y: smoothBgY }}>
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.02] via-foreground/[0.05] to-foreground/[0.02]" />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] rounded-full blur-[200px] pointer-events-none"
          style={{ background: "hsl(223 83% 60% / 0.06)" }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <FloatingShapes className="opacity-30" />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
            What Sets Us <span className="text-gradient dark:neon-text">Apart</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-base sm:text-lg">
            We're not just another SaaS company — we're building the infrastructure for how the region grows its talent.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {differentiators.map((item) => (
            <motion.div key={item.title} variants={fadeUp}>
              <TiltCard className="group h-full">
                <div className="rounded-2xl glass-card p-8 text-center dark:premium-card relative overflow-hidden h-full">
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300 relative z-10">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl mb-3 relative z-10">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed relative z-10">{item.desc}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Button size="lg" className="px-10 h-13 rounded-xl gap-2 group shadow-lg shadow-primary/20" asChild>
            <Link to="/life">
              Discover Life at Lumofy
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
