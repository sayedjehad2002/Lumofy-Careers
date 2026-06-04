import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "@/components/careers/Navbar";
import Footer from "@/components/careers/Footer";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, Lightbulb, Users, Rocket, Shield, Sparkles, ArrowRight,
} from "lucide-react";

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

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const BenefitsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Benefits at <span className="text-primary">Lumofy</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Tangible advantages that support your career, wellbeing, and professional development — not just promises.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefit Cards */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.title}
                variants={cardVariants}
                className="group relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none border border-primary/20" />
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold mb-3">Ready to make an impact?</h2>
          <p className="text-muted-foreground mb-6">
            Explore our open positions and find where you can grow with us.
          </p>
          <Link to="/jobs">
            <Button size="lg" className="gap-2">
              Explore Open Roles <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default BenefitsPage;
