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
  // Band rhythm is FLUID like the main site (padding-block clamp(72→128px)), so
  // laptops aren't over-padded and monitors aren't cramped; 4K gets one more step.
  <section id={id} className={cn("scroll-mt-24 px-4 py-[clamp(4.5rem,9vw,8rem)] sm:px-6 lg:px-8 3xl:px-10 4xl:py-40", className)}>
    {/* Content measure: a readable 72rem column on laptops, widening with the
        screen (80rem at 1920+, 88rem at 4K) so big displays don't feel hollow. */}
    <div className="mx-auto max-w-6xl 3xl:max-w-7xl 4xl:max-w-[88rem]">
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
            <motion.p variants={fadeUp} className="mt-5 text-[1.0625rem] leading-relaxed text-[hsl(var(--lx-ink-2))] dark:text-muted-foreground sm:text-lg 3xl:text-xl">
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
