import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const JoinCTA = () => (
  <section className="px-4 py-20 sm:py-24">
    <div className="mx-auto max-w-3xl text-center">
      <motion.h2
        className="text-4xl font-extrabold tracking-tight sm:text-5xl"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        Come build work that <span className="text-primary">matters</span>.
      </motion.h2>
      <motion.p
        className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        Every feature you ship reaches enterprises managing thousands of employees. Here, your work
        has measurable impact on how the region builds and grows its talent.
      </motion.p>
      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Button size="lg" className="h-12 rounded-xl px-8 text-base" asChild>
          <Link to="/jobs">
            Browse open roles <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </motion.div>
      <p className="mx-auto mt-10 max-w-xl text-xs leading-relaxed text-muted-foreground/80">
        Lumofy is an equal-opportunity employer. We celebrate diversity and are committed to building
        an inclusive workplace where everyone can do their best work.
      </p>
    </div>
  </section>
);

export default JoinCTA;
