import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp, staggerContainer, revealViewport } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Shared wrapper for every flagship section: mono kicker + display H2 + sub-deck,
// scroll-revealed, with an anchor id and fixed-nav scroll offset. Keeps section
// rhythm and typography identical across the page (spec §6.2, §9).
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
    <div className="mx-auto max-w-[1536px]">
      {(kicker || title || sub) && (
        <motion.div
          variants={staggerContainer()}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
          className={cn("mx-auto max-w-2xl text-center", headerClassName)}
        >
          {kicker && (
            <motion.p variants={fadeUp} className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-primary">
              {kicker}
            </motion.p>
          )}
          {title && (
            <motion.h2 variants={fadeUp} className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {title}
            </motion.h2>
          )}
          {sub && (
            <motion.p variants={fadeUp} className="mt-4 text-base text-muted-foreground sm:text-lg">
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
