import Navbar from "@/components/careers/Navbar";
import Footer from "@/components/careers/Footer";
import { motion } from "framer-motion";
import {
  Quote, ChevronLeft, ChevronRight, Star,
  Globe, BookOpen, Palmtree, Users, TrendingUp,
  Lightbulb, Target, Briefcase, MapPin as MapPinIcon, Heart } from
"lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import CulturePerkCard from "@/components/careers/CulturePerkCard";
import { SITE } from "@/data/site";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } }
};

const cultureHighlights = [
{ icon: Globe, title: "Flexible & Hybrid", desc: "Work from our office or remotely, we support flexible, hybrid arrangements across the MENA region." },
{ icon: BookOpen, title: "Learning Budget", desc: "Annual stipend for courses, conferences, and professional certifications." },
{ icon: Palmtree, title: "Flexible Time Off", desc: "We trust you to manage your time and recharge when you need it." },
{ icon: Users, title: "Flat Culture", desc: "Your ideas matter from day one, no red tape, just impact." },
{ icon: TrendingUp, title: "Career Growth", desc: "Clear paths for advancement with mentorship from senior leaders." },
{ icon: Lightbulb, title: "Innovation Days", desc: "Dedicated time each month to explore new ideas and build prototypes." },
{ icon: Target, title: "Impactful Work", desc: "Build products used by organizations transforming talent across the region." }];


const teamMembers = [
{ name: "Ahmed Faraj", role: "Founder & CEO", department: "Leadership", location: "Bahrain", avatar: "AF", photo: "/lovable-uploads/ecf0ce79-94a1-485b-8b6b-3bb501b26321.jpg", bio: "15+ years in EdTech and HRTech. Drives Lumofy's vision to reshape how the region develops talent." },
{ name: "Mahmood Malik", role: "Cofounder & COO", department: "Leadership", location: "Bahrain", avatar: "MM", photo: "/lovable-uploads/a881206e-7d4e-443b-9591-07fbd427a0be.jpg", bio: "Operational strategist scaling Lumofy's processes, partnerships, and go-to-market across MENA." },
{ name: "Suzan Alkhriesat", role: "Senior Finance Manager", department: "Finance", location: "Bahrain", avatar: "SA", photo: "/lovable-uploads/0aa8eb0b-531f-4d4c-b360-7e6d1bf82d31.jpg", bio: "Keeps the financial engine running, from budgeting and forecasting to ensuring sustainable growth." },
{ name: "Hasan Alhashimi", role: "Employee Engagement & HR Ops Lead", department: "People & Culture", location: "Bahrain", avatar: "HA", photo: "/lovable-uploads/a82f5de3-82d3-4b03-9f19-85a62252e6d8.jpg", bio: "Champions employee wellbeing and streamlines HR operations to keep the team thriving." },
{ name: "Mahmoud Elrweny", role: "Customer Success & Professional Service Director", department: "Customer Success", location: "Bahrain", avatar: "ME", photo: "/lovable-uploads/a4a73021-bfc4-4bde-8bb2-1338418a13e2.jpg", bio: "Ensures every client achieves measurable talent outcomes with hands-on strategic support." },
{ name: "Shehab Beram", role: "Senior Product Manager", department: "Product", location: "Remote", avatar: "SB", photo: "/lovable-uploads/72097222-3975-48f3-b226-c02d3e10ad53.jpg", bio: "Translates customer needs into product roadmaps that ship fast and delight users." },
{ name: "Husain Alsayyad", role: "Acting Revenue Director", department: "Revenue", location: "Bahrain", avatar: "HA", photo: "/lovable-uploads/43c6c44e-9e97-4d4d-b00f-74541f108978.jpg", bio: "Drives revenue growth and commercial strategy across enterprise and mid-market segments." },
{ name: "Safa AlFulaij", role: "Tech Lead", department: "Engineering", location: "Bahrain", avatar: "TM", photo: "/lovable-uploads/94c2428a-fa7d-41b7-a57e-2b8c3b2c5ac1.jpg", bio: "Architects scalable systems and leads the engineering team building Lumofy's core platform." }];


const testimonials = [
{ name: "Suzan Alkhriesat", role: "Senior Finance Manager", photo: "/lovable-uploads/0aa8eb0b-531f-4d4c-b360-7e6d1bf82d31.jpg", quote: "What sets Lumofy apart is the trust. From day one, I had ownership of real decisions, not busywork. That's rare.", rating: 5, tenure: "2 years" },
{ name: "Hasan Alhashimi", role: "Employee Engagement & HR Ops Lead", photo: "/lovable-uploads/a82f5de3-82d3-4b03-9f19-85a62252e6d8.jpg", quote: "I get to practice what we preach, building an employee experience that actually works. The culture here isn't a poster on a wall.", rating: 5, tenure: "1.5 years" },
{ name: "Mahmoud Elrweny", role: "CS & Professional Service Director", photo: "/lovable-uploads/a4a73021-bfc4-4bde-8bb2-1338418a13e2.jpg", quote: "Our clients don't just use the platform, they see real results. Being part of those transformations keeps me motivated every day.", rating: 5, tenure: "3 years" },
{ name: "Shehab Beram", role: "Senior Product Manager", photo: "/lovable-uploads/72097222-3975-48f3-b226-c02d3e10ad53.jpg", quote: "The speed here is unreal. We ideate, ship, and iterate faster than teams three times our size. And the team actually listens.", rating: 5, tenure: "1 year" }];


const stats = [
{ icon: Users, value: SITE.stats.employees, label: "Team Members" },
{ icon: MapPinIcon, value: SITE.stats.countries, label: "Countries" },
{ icon: Briefcase, value: "100+", label: "Clients Served" },
{ icon: Heart, value: "4.8/5", label: "Employee Satisfaction" }];


const LifeAtLumofy = () => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const goTestimonial = (dir: number) => {
    setDirection(dir);
    setActiveTestimonial((prev) => (prev + dir + testimonials.length) % testimonials.length);
  };

  const t = testimonials[activeTestimonial];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main id="main">
      {/* ── HERO ───────────────────────────────────────── */}
      <section className="relative px-4 pt-36 pb-16 sm:pb-20">
        {/* subtle brand wash, no animation */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] bg-gradient-to-b from-primary/[0.05] to-transparent" />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.span
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
          >
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            Life at Lumofy
          </motion.span>

          <motion.h1
            className="mt-7 text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease }}
          >
            Life at <span className="text-primary">Lumofy</span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
          >
            We're a team of builders, dreamers, and operators united by one goal, transforming how the MENA region grows its talent.
          </motion.p>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────── */}
      <section className="px-4 pb-4">
        <div className="mx-auto max-w-5xl">
          <motion.div
            className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {stats.map((s) => (
              <motion.div key={s.label} variants={fadeUp} className="h-full">
                <div className="h-full flex flex-col justify-center rounded-2xl border border-border bg-card p-5 text-center light-glow sm:p-6">
                  <s.icon className="mx-auto mb-2.5 h-6 w-6 text-primary" aria-hidden="true" />
                  <div className="text-3xl font-extrabold tabular-nums text-foreground sm:text-4xl">{s.value}</div>
                  <p className="mt-2 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CULTURE & PERKS ────────────────────────────── */}
      <section className="border-y border-border bg-muted/30 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mx-auto mb-10 max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Culture & Perks</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              What makes Lumofy <span className="text-primary">special</span>
            </h2>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              The everyday things that make working here genuinely different.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-wrap justify-center gap-4"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {cultureHighlights.map((item) =>
            <CulturePerkCard key={item.title} icon={item.icon} title={item.title} desc={item.desc} className="w-[calc(50%-0.5rem)] md:w-[calc(25%-0.75rem)]" />
            )}
          </motion.div>
        </div>
      </section>

      {/* ── MEET THE TEAM (calm static grid) ───────────── */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mx-auto mb-10 max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Our Team</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Meet the <span className="text-primary">people</span>
            </h2>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              The people behind the platform, united by a shared mission.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {teamMembers.map((member) => (
              <motion.div key={member.name} variants={fadeUp}>
                <div className="h-full rounded-2xl border border-border bg-card p-6 text-center light-glow transition-transform duration-300 hover:-translate-y-1">
                  <div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full border border-border">
                    <img
                      src={member.photo}
                      alt={`${member.name}, ${member.role}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <h3 className="mb-0.5 text-base font-bold text-foreground">{member.name}</h3>
                  <p className="mb-2 text-xs font-medium text-primary">{member.role}</p>
                  <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{member.bio}</p>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <MapPinIcon className="h-3 w-3" aria-hidden="true" />
                    <span className="text-[11px]">{member.location}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────── */}
      <section className="border-y border-border bg-muted/30 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <motion.div
            className="mx-auto mb-10 max-w-md text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Team Stories</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Hear from our <span className="text-primary">team</span>
            </h2>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              Real stories from the people building the future of talent.
            </p>
          </motion.div>

          <motion.div
            key={activeTestimonial}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease }}
            className="relative rounded-2xl border border-border bg-card p-8 text-center light-glow sm:p-10"
          >
            <Quote className="mx-auto mb-4 h-8 w-8 text-primary/30" aria-hidden="true" />
            <p className="mb-6 text-lg leading-relaxed text-foreground sm:text-xl">
              "{t.quote}"
            </p>
            <div className="mb-4 flex items-center justify-center gap-1" role="img" aria-label={`Rated ${t.rating} out of 5`}>
              {Array.from({ length: t.rating }).map((_, i) =>
              <Star key={i} className="h-4 w-4 fill-primary text-primary" aria-hidden="true" />
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="h-11 w-11 overflow-hidden rounded-full border border-border">
                <img src={t.photo} alt={t.name} className="h-full w-full object-cover" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role} · {t.tenure}</p>
              </div>
            </div>
          </motion.div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={() => goTestimonial(-1)} aria-label="Previous testimonial">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <div className="flex gap-2">
              {testimonials.map((_, i) =>
              <button
                key={i}
                onClick={() => {setDirection(i > activeTestimonial ? 1 : -1);setActiveTestimonial(i);}}
                aria-label={`Go to testimonial ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${i === activeTestimonial ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`} />

              )}
            </div>
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={() => goTestimonial(1)} aria-label="Next testimonial">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>);

};

export default LifeAtLumofy;
