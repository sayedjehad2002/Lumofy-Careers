import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/careers/Navbar";
import Hero from "@/components/careers/Hero";
import TestimonialsSection from "@/components/careers/TestimonialsSection";
import Footer from "@/components/careers/Footer";
import ScrollSpine from "@/components/careers/ScrollSpine";
import CursorGlow from "@/components/careers/CursorGlow";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <CursorGlow />
      <ScrollSpine />
      <Navbar />
      <Hero />
      <TestimonialsSection />

      {/* Clean Minimal CTA */}
      <section className="relative py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-foreground/[0.02] to-background" />

        <div className="max-w-2xl mx-auto text-center relative z-10">
          <motion.p
            className="text-xs font-medium text-primary tracking-wider uppercase mb-6"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Your next chapter starts here
          </motion.p>

          <motion.h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6"
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            Ready to join us?
          </motion.h2>

          <motion.p
            className="text-muted-foreground text-base sm:text-lg mb-10 max-w-md mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            Explore open positions and find where your skills can make the biggest impact.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button
              size="lg"
              className="px-10 h-13 text-base rounded-xl group relative overflow-hidden"
              asChild
            >
              <Link to="/jobs">
                <span className="relative z-10 flex items-center gap-2">
                  View Open Roles
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                </span>
                {/* Glow behind button */}
                <span className="absolute inset-0 -z-10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl bg-primary/30" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
