import { motion } from "framer-motion";
import { Building2, Users, Globe, Rocket, Sparkles, Compass } from "lucide-react";
import Footer from "@/components/careers/Footer";
import Navbar from "@/components/careers/Navbar";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

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

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── HERO ───────────────────────────────────────── */}
      <section className="relative px-4 pt-32 pb-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] bg-gradient-to-b from-primary/[0.05] to-transparent" />
        <motion.div
          className="relative mx-auto max-w-3xl text-center"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Building2 className="h-3.5 w-3.5" />
              Our Story
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="mt-7 text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            About <span className="text-primary">Lumofy</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground"
          >
            A B2B SaaS platform built to help organizations understand, develop, and align workforce skills with business goals.
          </motion.p>
        </motion.div>
      </section>

      {/* ── OUR JOURNEY ────────────────────────────────── */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="mb-10"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Our Journey</h2>
            </div>
            <div className="rounded-2xl border border-border bg-card p-8 light-glow md:p-10">
              <div className="space-y-4 leading-relaxed text-muted-foreground">
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
            <div className="absolute bottom-0 left-4 top-0 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
            >
              {milestones.map((m) => (
                <motion.div
                  key={m.year}
                  className="relative pb-10 pl-12 last:pb-0"
                  variants={fadeUp}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-2 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary bg-primary/20">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>

                  <div className="rounded-xl border border-border bg-card p-5 light-glow transition-transform duration-300 hover:-translate-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">{m.year}</span>
                    <h3 className="mb-1 mt-1 text-base font-bold">{m.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{m.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── WHO WE ARE ─────────────────────────────────── */}
      <section className="border-y border-border bg-muted/30 px-4 py-16 sm:py-20">
        <motion.div
          className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 light-glow md:p-10"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Who We Are?</h2>
          </div>
          <div className="space-y-4 leading-relaxed text-muted-foreground">
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

      {/* ── PURPOSE, VISION & MISSION ──────────────────── */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mx-auto mb-10 max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" />
              Core Values
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Purpose, Vision &amp; Mission</h2>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">The principles that drive everything we do</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 gap-6 md:grid-cols-3"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {cards.map((item) => (
              <motion.div key={item.title} variants={fadeUp}>
                <div className="group h-full rounded-2xl border border-border bg-card p-6 text-center light-glow transition-transform duration-300 hover:-translate-y-1">
                  <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/15">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="mb-3 text-lg font-bold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
