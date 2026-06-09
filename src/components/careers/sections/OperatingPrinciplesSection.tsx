import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SectionShell from "./SectionShell";
import { principles } from "@/data/careers";
import { brandEase } from "@/lib/motion";
import { hueClasses } from "@/lib/deptColor";

// Premium culture framework as an interactive index 01–05 (replaces Life at Lumofy).
// Selecting a principle reveals its detail; keyboard-operable buttons (spec §8 §4).
const OperatingPrinciplesSection = () => {
  const [active, setActive] = useState(0);
  const p = principles[active];
  const c = hueClasses[p.hue];

  return (
    <SectionShell
      id="principles"
      kicker="Operating principles"
      title="How we work"
      sub="Five principles that decide what we build, how we build it, and who we hire."
    >
      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* Index */}
        <ul className="space-y-1">
          {principles.map((pr, i) => {
            const ic = hueClasses[pr.hue];
            const isActive = i === active;
            return (
              <li key={pr.n}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-current={isActive}
                  className={`group flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    isActive ? "border-border bg-card" : "border-transparent hover:bg-muted/50"
                  }`}
                >
                  <span className={`font-mono text-sm ${isActive ? ic.text : "text-muted-foreground"}`}>{pr.n}</span>
                  <span className={`text-base font-semibold ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                    {pr.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Detail */}
        <div className="md:sticky md:top-28 md:self-start">
          <div className="glass-card relative overflow-hidden rounded-2xl p-8 sm:p-10">
            <div className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full ${c.bgSoft} blur-3xl`} />
            <AnimatePresence mode="wait">
              <motion.div
                key={p.n}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: brandEase }}
                className="relative"
              >
                <span className={`font-mono text-5xl font-extrabold ${c.text}`}>{p.n}</span>
                <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{p.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">{p.body}</p>
                <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Lumofy principle {p.n} / {String(principles.length).padStart(2, "0")}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </SectionShell>
  );
};

export default OperatingPrinciplesSection;
