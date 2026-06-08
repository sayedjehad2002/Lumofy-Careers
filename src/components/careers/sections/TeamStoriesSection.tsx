import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import SectionShell from "./SectionShell";
import { stories, teamMembers } from "@/data/careers";
import { fadeUp, staggerContainer, revealViewport, brandEase } from "@/lib/motion";

// Real people, editorial format (replaces testimonials). Featured spotlight that
// cycles through real quotes + a refined team grid (spec §8 §6).
const TeamStoriesSection = () => {
  const [i, setI] = useState(0);
  const s = stories[i];
  const go = (d: number) => setI((p) => (p + d + stories.length) % stories.length);

  return (
    <SectionShell
      id="team"
      kicker="Team stories"
      title="The people behind the platform"
      sub="The people you'll build with, in their own words."
    >
      {/* Featured spotlight */}
      <div className="mt-14 overflow-hidden rounded-3xl border border-border bg-card light-glow">
        <div className="grid md:grid-cols-[0.9fr_1.1fr]">
          <div className="relative aspect-[4/3] bg-muted md:aspect-auto md:min-h-[380px]">
            <AnimatePresence mode="wait">
              <motion.img
                key={s.photo}
                src={s.photo}
                alt={s.name}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            </AnimatePresence>
          </div>
          <div className="flex flex-col justify-between p-8 sm:p-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: brandEase }}
              >
                <Quote className="h-8 w-8 text-primary/30" aria-hidden="true" />
                <p className="mt-4 text-xl font-medium leading-relaxed text-foreground sm:text-2xl">{s.quote}</p>
                <div className="mt-6">
                  <p className="font-bold text-foreground">{s.name}</p>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {s.role} · {s.tenure}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous story"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next story"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")} / {String(stories.length).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Team grid */}
      <motion.div
        className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        variants={staggerContainer()}
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
      >
        {teamMembers.map((m) => (
          <motion.div
            key={m.name}
            variants={fadeUp}
            className="group overflow-hidden rounded-2xl border border-border bg-card light-glow transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="aspect-square overflow-hidden bg-muted">
              <img
                src={m.photo}
                alt={m.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-4">
              <p className="truncate font-bold text-foreground">{m.name}</p>
              <p className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.role}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.location}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </SectionShell>
  );
};

export default TeamStoriesSection;
