import { motion, useMotionValue, useTransform } from "framer-motion";
import { Building2, Users, Target, Globe, Rocket, Sparkles, Compass } from "lucide-react";
import Footer from "@/components/careers/Footer";
import Navbar from "@/components/careers/Navbar";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  })
};

const cards = [
  {
    title: "Purpose",
    description: "To help people and organizations gain clarity on the skills needed for driving business impact, preparing for both future challenges and opportunities.",
    icon: Compass,
  },
  {
    title: "Vision",
    description: "We envision a world where skills are at the heart of every organization, enabling people with the right skills for the right opportunities to navigate change easily and drive continuous growth.",
    icon: Globe,
  },
  {
    title: "Mission",
    description: "To empower people in developing the skills they need to build the future they want, our AI-powered skills intelligence platform provides strategic insights for individuals and organizations to thrive in a dynamic world.",
    icon: Rocket,
  },
];

const milestones = [
  { year: "2020", title: "Founded During COVID-19", description: "A group of forward-thinking professionals came together with a shared vision to transform talent development in the region." },
  { year: "2021", title: "Platform Launch", description: "Launched the first version of Lumofy's AI-powered skills intelligence platform for organizations in Bahrain." },
  { year: "2022", title: "Regional Expansion", description: "Expanded operations across the GCC region, onboarding enterprise clients and government organizations." },
  { year: "2023", title: "AI Innovation", description: "Introduced advanced AI capabilities for competency mapping, skills gap analysis, and workforce planning." },
  { year: "2024", title: "Global Vision", description: "Scaling solutions globally, enabling organizations worldwide to align talent with strategic priorities." },
];

const GradientDivider = () => (
  <div className="max-w-4xl mx-auto px-4 py-2">
    <motion.div
      className="h-px w-full"
      style={{
        background: "linear-gradient(90deg, transparent, hsl(217 91% 60% / 0.3), transparent)",
      }}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    />
  </div>
);

const HoverCard = ({ item, i }: { item: typeof cards[0]; i: number }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [8, -8]);
  const rotateY = useTransform(x, [-100, 100], [-8, 8]);

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      className="rounded-2xl bg-card border border-border p-6 text-center relative overflow-hidden group cursor-pointer"
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      custom={i + 1}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Glow border on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ boxShadow: "inset 0 0 30px hsl(217 91% 60% / 0.15), 0 0 30px hsl(217 91% 60% / 0.1)" }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10" style={{ transform: "translateZ(30px)" }}>
        <motion.div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4"
          whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.5 }}
        >
          <item.icon className="w-7 h-7 text-primary" />
        </motion.div>
        <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
      </div>
    </motion.div>
  );
};

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />

      {/* Animated background accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px]"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-40 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/3 blur-[120px]"
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Floating decorative elements */}
        <motion.div
          className="absolute top-40 right-16 w-3 h-3 rounded-full bg-primary/20"
          animate={{ y: [0, -15, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[60%] left-12 w-2 h-2 rounded-full bg-primary/15"
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute top-[30%] right-[30%] w-4 h-4 rounded-full bg-primary/10"
          animate={{ y: [0, -10, 0], x: [0, 5, 0], opacity: [0.15, 0.4, 0.15] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary tracking-wider uppercase">Our Story</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              About <span className="text-gradient">Lumofy</span>
            </h1>
            <motion.p
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              A B2B SaaS platform built to help organizations understand, develop, and align workforce skills with business goals.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <GradientDivider />

      {/* Founding Story Timeline */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <Building2 className="w-5 h-5 text-primary" />
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-bold">Our Journey</h2>
          </div>
          <div className="rounded-2xl bg-card border border-border p-8 md:p-10 glow-blue-sm">
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Lumofy was founded in 2020 during the COVID-19 pandemic by a group of forward thinking professionals who shared a common vision — talent in the region deserves a more structured and empowering way to be recognized and developed.
              </p>
              <p>
                Lumofy was founded in Bahrain and it is a pioneering B2B SaaS HRTech and EdTech company dedicated to advancing learning and capability building for organizations worldwide.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Vertical Timeline */}
        <div className="relative ml-4 md:ml-8">
          {/* Timeline line */}
          <motion.div
            className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent"
            initial={{ scaleY: 0, transformOrigin: "top" }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />

          {milestones.map((m, i) => (
            <motion.div
              key={m.year}
              className="relative pl-12 pb-10 last:pb-0"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
            >
              {/* Timeline dot */}
              <motion.div
                className="absolute left-2 top-1 w-5 h-5 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, type: "spring", stiffness: 300 }}
              >
                <div className="w-2 h-2 rounded-full bg-primary" />
              </motion.div>

              <div className="rounded-xl bg-card border border-border p-5 hover:border-primary/20 transition-colors">
                <span className="text-xs font-mono text-primary font-bold tracking-wider">{m.year}</span>
                <h3 className="font-semibold mt-1 mb-1">{m.title}</h3>
                <p className="text-sm text-muted-foreground">{m.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <GradientDivider />

      {/* Who We Are */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <motion.div
          className="rounded-2xl bg-card border border-border p-8 md:p-10"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={1}
        >
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <Users className="w-5 h-5 text-primary" />
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-bold">Who We Are?</h2>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Lumofy is here to transform how organizations manage skilling and talent development. We are an AI-powered talent management platform that brings workforce skills into one unified solution, enabling companies to understand, develop, and optimize capabilities with clarity and confidence.
            </p>
            <p>
              By combining skills data, intelligent insights, and streamlined workflows, Lumofy helps leaders identify skill gaps, align development to business priorities, and make smarter workforce decisions.
            </p>
            <p>
              At our core, we focus on what growth truly means for each organization — by understanding its unique goals, challenges, and context, then translating that into actionable, measurable progress.
            </p>
          </div>
        </motion.div>
      </section>

      <GradientDivider />

      {/* Purpose, Vision & Mission */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-20">
        <motion.div
          className="text-center mb-10"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-medium text-primary tracking-wider uppercase">Core Values</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">Purpose, Vision & Mission</h2>
          <p className="text-muted-foreground mt-2">The principles that drive everything we do</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5" style={{ perspective: "1000px" }}>
          {cards.map((item, i) => (
            <HoverCard key={item.title} item={item} i={i} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
