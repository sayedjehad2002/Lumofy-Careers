import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp, staggerContainer, revealViewport } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Shared wrapper for every flagship section, in the lumofy.ai lx language:
// eyebrow pill kicker + balanced display title + sub-deck, scroll-revealed,
// with an anchor id and fixed-nav scroll offset. Keeps section rhythm and
// typography identical across the page.
interface SectionShellProps {
  id?: string;
  kicker?: string;
  title?: ReactNode;
  sub?: ReactNode;
  className?: string;
  headerClassName?: string;
  children: ReactNode;
}

const SectionShell = ({ id, kicker, title, sub, className, headerClassName, children }: SectionShellProps) => (
  <section id={id} className={cn("scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28", className)}>
    {/* Content measure: sections keep a readable 72rem column (their compositions are
        designed for it) while the page chrome (nav / hero / footer) spans 1536px. */}
    <div className="mx-auto max-w-6xl">
      {(kicker || title || sub) && (
        <motion.div
          variants={staggerContainer()}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
          className={cn("mx-auto max-w-2xl text-center", headerClassName)}
        >
          {kicker && (
            <motion.p variants={fadeUp}>
              <span className="eyebrow-pill">{kicker}</span>
            </motion.p>
          )}
          {title && (
            <motion.h2 variants={fadeUp} className="sec-title mt-5 text-foreground">
              {title}
            </motion.h2>
          )}
          {sub && (
            <motion.p variants={fadeUp} className="mt-5 text-[1.0625rem] leading-relaxed text-[hsl(var(--lx-ink-2))] dark:text-muted-foreground sm:text-lg">
              {sub}
            </motion.p>
          )}
        </motion.div>
      )}
      {children}
    </div>
  </section>
);

export default SectionShell;
