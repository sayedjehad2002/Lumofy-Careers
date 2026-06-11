import { motion, useScroll, useSpring } from "framer-motion";

// The "intelligence thread": a thin Sirius progress line under the navbar that
// tracks scroll depth — signals the page is sensing where you are (spec §7).
// GPU-only (scaleX), aria-hidden, reduced-motion-safe via the spring + MotionConfig.
const ScrollThread = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  return (
    <motion.div
      aria-hidden="true"
      className="fixed left-0 right-0 top-[68px] z-40 h-[2px] origin-left bg-primary"
      style={{ scaleX }}
    />
  );
};

export default ScrollThread;
