import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Rocket, GraduationCap, HeartPulse, CalendarClock, Award, KeyRound, type LucideIcon } from "lucide-react";
import SectionShell from "./SectionShell";
import { growth } from "@/data/careers";
import { fadeUp, staggerContainer, revealViewport, brandEase } from "@/lib/motion";
import { BRAND_HUES, hueClasses } from "@/lib/deptColor";

// "Growth experience" as a compact, interactive "Growth OS": a left editorial column + a
// right system panel where the six growth areas are premium chips and the selected one
// expands into a detail panel. Hover / click / keyboard-focus a chip reveals its detail
// (announced via aria-live, so nothing is hidden from screen readers). Compact + contained
// — no long timeline / no big scroll. Motion is light + reduced-motion safe (MotionConfig
// + a gentle detail crossfade).
const ICONS: LucideIcon[] = [Rocket, GraduationCap, HeartPulse, CalendarClock, Award, KeyRound];

const GrowthExperienceSection = () => {
  const [sel, setSel] = useState(0);
  const active = growth[sel];
  const ActiveIcon = ICONS[sel];
  const ac = hueClasses[BRAND_HUES[sel % BRAND_HUES.length]];

  return (
    <SectionShell id="growth" className="band-mint">
      <motion.div
        className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14"
        variants={staggerContainer()}
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
      >
        {/* Left — editorial */}
        <motion.div variants={fadeUp}>
          <p><span className="eyebrow-pill">Growth experience</span></p>
          <h2 className="sec-title mt-5 text-foreground">Designed for the person you're becoming.</h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[hsl(var(--lx-ink-2))] dark:text-muted-foreground sm:text-[1.0625rem]">
            We build workforce growth systems for organizations. Inside Lumofy, we design the same clarity, trust, and momentum for our own team.
          </p>
          <p className="mt-6 text-sm text-[hsl(var(--lx-ink-3))] dark:text-muted-foreground">
            Growth here is part of <span className="font-semibold text-foreground">how the company works</span>, not a side benefit.
          </p>
        </motion.div>

        {/* Right — Growth OS panel */}
        <motion.div
          variants={fadeUp}
          className="lx-card relative overflow-hidden p-5 sm:p-6"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 50% at 85% 0%, hsl(var(--primary) / 0.07), transparent 70%)" }} />

          {/* chips — hover / click / focus to select */}
          <div className="relative grid grid-cols-2 gap-2.5">
            {growth.map((g, i) => {
              const c = hueClasses[BRAND_HUES[i % BRAND_HUES.length]];
              const Icon = ICONS[i];
              const isSel = i === sel;
              return (
                <button
                  key={g.title}
                  type="button"
                  onMouseEnter={() => setSel(i)}
                  onFocus={() => setSel(i)}
                  onClick={() => setSel(i)}
                  aria-pressed={isSel}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isSel
                      ? "border-primary/40 bg-accent"
                      : "border-[hsl(var(--lx-line))] dark:border-border/60 bg-card hover:border-primary/30 hover:bg-[hsl(var(--lx-surface-2))] dark:hover:bg-card/70"
                  }`}
                >
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${c.bgSoft}`}>
                    <Icon className={`h-4 w-4 ${c.text}`} aria-hidden="true" />
                  </span>
                  <span className={`text-xs font-semibold leading-tight sm:text-sm ${isSel ? "text-foreground" : "text-muted-foreground"}`}>{g.title}</span>
                </button>
              );
            })}
          </div>

          {/* detail panel */}
          <div className="relative mt-3.5 min-h-[7.5rem] rounded-xl border border-[hsl(var(--lx-line))] dark:border-border/60 bg-[hsl(var(--lx-surface-2))] dark:bg-card/40 p-5" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div
                key={sel}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: brandEase }}
              >
                <div className="mb-2 flex items-center gap-2.5">
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${ac.bgSoft}`}>
                    <ActiveIcon className={`h-5 w-5 ${ac.text}`} aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-bold text-foreground">{active.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{active.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </SectionShell>
  );
};

export default GrowthExperienceSection;
