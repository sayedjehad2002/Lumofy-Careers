import Navbar from "@/components/careers/Navbar";
import Footer from "@/components/careers/Footer";
import { motion } from "framer-motion";
import {
  Quote, ChevronLeft, ChevronRight, Star,
  Globe, BookOpen, Palmtree, Users, TrendingUp,
  Lightbulb, Target, HeartPulse, Briefcase, MapPin as MapPinIcon, Heart } from
"lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import TeamMarquee from "@/components/careers/TeamMarquee";
import CulturePerkCard from "@/components/careers/CulturePerkCard";
import TeamPhoto from "@/components/careers/TeamPhoto";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const cultureHighlights = [
{ icon: Globe, title: "Remote-First", desc: "Work from anywhere across the MENA region with flexible arrangements." },
{ icon: BookOpen, title: "Learning Budget", desc: "Annual stipend for courses, conferences, and professional certifications." },
{ icon: Palmtree, title: "Flexible Time Off", desc: "We trust you to manage your time and recharge when you need it." },
{ icon: Users, title: "Flat Culture", desc: "Your ideas matter from day one — no red tape, just impact." },
{ icon: TrendingUp, title: "Career Growth", desc: "Clear paths for advancement with mentorship from senior leaders." },
{ icon: Lightbulb, title: "Innovation Days", desc: "Dedicated time each month to explore new ideas and build prototypes." },
{ icon: Target, title: "Impactful Work", desc: "Build products used by organizations transforming talent across the region." },
{ icon: HeartPulse, title: "Health & Wellness", desc: "Comprehensive health insurance and wellness programs for every team member." }];


const teamMembers = [
{ name: "Ahmed Faraj", role: "Founder & CEO", department: "Leadership", location: "Bahrain", avatar: "AF", photo: "/lovable-uploads/ecf0ce79-94a1-485b-8b6b-3bb501b26321.jpg", bio: "15+ years in EdTech and HRTech. Drives Lumofy's vision to reshape how the region develops talent." },
{ name: "Mahmood Malik", role: "Cofounder & COO", department: "Leadership", location: "Bahrain", avatar: "MM", photo: "/lovable-uploads/a881206e-7d4e-443b-9591-07fbd427a0be.jpg", bio: "Operational strategist scaling Lumofy's processes, partnerships, and go-to-market across MENA." },
{ name: "Suzan Alkhriesat", role: "Senior Finance Manager", department: "Finance", location: "Bahrain", avatar: "SA", photo: "/lovable-uploads/0aa8eb0b-531f-4d4c-b360-7e6d1bf82d31.jpg", bio: "Keeps the financial engine running — from budgeting and forecasting to ensuring sustainable growth." },
{ name: "Hasan Alhashimi", role: "Employee Engagement & HR Ops Lead", department: "People & Culture", location: "Bahrain", avatar: "HA", photo: "/lovable-uploads/a82f5de3-82d3-4b03-9f19-85a62252e6d8.jpg", bio: "Champions employee wellbeing and streamlines HR operations to keep the team thriving." },
{ name: "Mahmoud Elrweny", role: "Customer Success & Professional Service Director", department: "Customer Success", location: "Bahrain", avatar: "ME", photo: "/lovable-uploads/a4a73021-bfc4-4bde-8bb2-1338418a13e2.jpg", bio: "Ensures every client achieves measurable talent outcomes with hands-on strategic support." },
{ name: "Shehab Beram", role: "Senior Product Manager", department: "Product", location: "Remote", avatar: "SB", photo: "/lovable-uploads/72097222-3975-48f3-b226-c02d3e10ad53.jpg", bio: "Translates customer needs into product roadmaps that ship fast and delight users." },
{ name: "Husain Alsayyad", role: "Acting Revenue Director", department: "Revenue", location: "Bahrain", avatar: "HA", photo: "/lovable-uploads/43c6c44e-9e97-4d4d-b00f-74541f108978.jpg", bio: "Drives revenue growth and commercial strategy across enterprise and mid-market segments." },
{ name: "Safa AlFulaij", role: "Tech Lead", department: "Engineering", location: "Bahrain", avatar: "TM", photo: "/lovable-uploads/94c2428a-fa7d-41b7-a57e-2b8c3b2c5ac1.jpg", bio: "Architects scalable systems and leads the engineering team building Lumofy's core platform." }];


const testimonials = [
{ name: "Suzan Alkhriesat", role: "Senior Finance Manager", photo: "/lovable-uploads/0aa8eb0b-531f-4d4c-b360-7e6d1bf82d31.jpg", quote: "What sets Lumofy apart is the trust. From day one, I had ownership of real decisions — not busywork. That's rare.", rating: 5, tenure: "2 years" },
{ name: "Hasan Alhashimi", role: "Employee Engagement & HR Ops Lead", photo: "/lovable-uploads/a82f5de3-82d3-4b03-9f19-85a62252e6d8.jpg", quote: "I get to practice what we preach — building an employee experience that actually works. The culture here isn't a poster on a wall.", rating: 5, tenure: "1.5 years" },
{ name: "Mahmoud Elrweny", role: "CS & Professional Service Director", photo: "/lovable-uploads/a4a73021-bfc4-4bde-8bb2-1338418a13e2.jpg", quote: "Our clients don't just use the platform — they see real results. Being part of those transformations keeps me motivated every day.", rating: 5, tenure: "3 years" },
{ name: "Shehab Beram", role: "Senior Product Manager", photo: "/lovable-uploads/72097222-3975-48f3-b226-c02d3e10ad53.jpg", quote: "The speed here is unreal. We ideate, ship, and iterate faster than teams three times our size. And the team actually listens.", rating: 5, tenure: "1 year" }];


const stats = [
{ icon: Users, value: "30+", label: "Team Members" },
{ icon: MapPinIcon, value: "5+", label: "Countries" },
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

      {/* Hero */}
      <section className="relative pt-36 pb-20 px-4 overflow-hidden dark:particles-bg">
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[160px] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(217 91% 60% / 0.1), transparent 70%)" }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 leading-[1.1]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}>
            
            Life at <span className="text-gradient dark:neon-text">Lumofy</span>
          </motion.h1>
          <motion.div
            className="w-16 h-[2px] mx-auto mb-6 rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, hsl(217 91% 60% / 0.5), transparent)" }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }} />
          
          <motion.p
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}>
            
            We're a team of builders, dreamers, and operators united by one goal — transforming how the MENA region grows its talent.
          </motion.p>
        </div>
      </section>

      {/* Culture Perks */}
      <section className="py-16 px-4 border-y border-border/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}>
            
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              Our <span className="text-gradient dark:neon-text">Culture & Perks</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              What makes working at Lumofy truly special.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}>
            
            {cultureHighlights.map((item) =>
            <CulturePerkCard key={item.title} icon={item.icon} title={item.title} desc={item.desc} />
            )}
          </motion.div>
        </div>
      </section>

      {/* Team Photo */}
      <TeamPhoto />

      {/* Meet the Team — Marquee (no duplicate heading) */}
      <section className="pb-20 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 mb-6">
          <p className="text-center text-sm text-muted-foreground">
            Hover to pause · Scroll to explore
          </p>
        </div>
        <TeamMarquee members={teamMembers} />
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.03] via-foreground/[0.05] to-foreground/[0.03]" />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full blur-[180px] pointer-events-none"
          style={{ background: "hsl(217 91% 60% / 0.06)" }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
        

        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}>
            
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              Hear From Our <span className="text-gradient dark:neon-text">Team</span>
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Real stories from the people building the future of talent.
            </p>
          </motion.div>

          <motion.div
            key={activeTestimonial}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="glass-card dark:premium-card rounded-2xl p-8 sm:p-10 text-center relative">
            
            <Quote className="w-8 h-8 text-primary/20 mx-auto mb-4" />
            <p className="text-lg sm:text-xl text-foreground leading-relaxed mb-6 italic">
              "{t.quote}"
            </p>
            <div className="flex items-center justify-center gap-1 mb-4">
              {Array.from({ length: t.rating }).map((_, i) =>
              <Star key={i} className="w-4 h-4 fill-primary text-primary" />
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden border border-primary/20">
                <img src={t.photo} alt={t.name} className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role} · {t.tenure}</p>
              </div>
            </div>
          </motion.div>

          <div className="flex items-center justify-center gap-4 mt-6">
            <Button size="icon" variant="ghost" className="rounded-full w-9 h-9" onClick={() => goTestimonial(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex gap-2">
              {testimonials.map((_, i) =>
              <button
                key={i}
                onClick={() => {setDirection(i > activeTestimonial ? 1 : -1);setActiveTestimonial(i);}}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${i === activeTestimonial ? "bg-primary w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"}`} />

              )}
            </div>
            <Button size="icon" variant="ghost" className="rounded-full w-9 h-9" onClick={() => goTestimonial(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Join Us CTA — Enhanced */}
      





















































      

      {/* Footer */}
      <Footer />
    </div>);

};

export default LifeAtLumofy;