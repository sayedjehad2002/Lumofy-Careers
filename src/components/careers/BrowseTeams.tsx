import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Code2, PenTool, Database, TrendingUp, Headphones, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

const teams = [
  { icon: Code2, name: "Engineering", desc: "Build the platform powering workforce decisions." },
  { icon: Database, name: "Data & AI", desc: "Train the models behind smarter talent insight." },
  { icon: PenTool, name: "Product & Design", desc: "Shape intuitive products for complex HR work." },
  { icon: TrendingUp, name: "Sales", desc: "Bring Lumofy to enterprises across MENA." },
  { icon: Headphones, name: "Customer Success", desc: "Help clients turn data into real outcomes." },
  { icon: Users, name: "People & Operations", desc: "Keep a fast-growing team running and thriving." },
];

const BrowseTeams = () => (
  <section id="roles" className="border-y border-border bg-muted/30 px-4 py-16 sm:py-20">
    <div className="mx-auto max-w-6xl">
      <motion.div
        className="mx-auto mb-10 max-w-2xl text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Open Roles</span>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Find your team</h2>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Explore where you can make an impact, then browse every open role.
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
      >
        {teams.map((t) => (
          <motion.div key={t.name} variants={fadeUp}>
            <Link
              to="/jobs"
              className="group flex h-full items-start gap-4 rounded-2xl border border-border bg-card p-5 light-glow transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <t.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="flex items-center gap-1.5 text-base font-bold">
                  {t.name}
                  <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-10 text-center">
        <Button size="lg" className="h-12 rounded-xl px-8 text-base" asChild>
          <Link to="/jobs">
            View all open roles <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  </section>
);

export default BrowseTeams;
