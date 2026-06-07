import { motion } from "framer-motion";

/**
 * Signature Lumofy "aurora" — soft, slow-moving brand-colour bands behind the hero.
 * GPU-only (transform / opacity / blur), pointer-events-none, and automatically
 * paused under prefers-reduced-motion via the app-level <MotionConfig reducedMotion="user">.
 */
const AuroraEffect = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Band 1 — blue */}
      <motion.div
        className="absolute top-[8%] left-[-20%] w-[140%] h-[42%] rounded-[50%] blur-[100px]"
        style={{
          background:
            "linear-gradient(90deg, hsl(223 83% 60% / 0.14), hsl(200 90% 55% / 0.22), hsl(223 83% 60% / 0.10))",
        }}
        animate={{ x: [0, 80, -40, 0], y: [0, -20, 10, 0], scaleX: [1, 1.15, 0.95, 1], rotate: [0, 3, -2, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Band 2 — purple */}
      <motion.div
        className="absolute top-[22%] left-[-10%] w-[120%] h-[34%] rounded-[50%] blur-[120px]"
        style={{
          background:
            "linear-gradient(90deg, hsl(270 80% 60% / 0.10), hsl(280 90% 65% / 0.18), hsl(260 80% 55% / 0.08))",
        }}
        animate={{ x: [-30, 50, 0, -30], y: [10, -15, 20, 10], scaleX: [1, 0.9, 1.1, 1], rotate: [0, -4, 2, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Band 3 — cyan (dark-mode accent) */}
      <motion.div
        className="absolute top-[14%] left-[10%] w-[80%] h-[28%] rounded-[50%] blur-[140px] hidden dark:block"
        style={{
          background:
            "linear-gradient(90deg, hsl(185 90% 55% / 0.09), hsl(190 85% 60% / 0.16), hsl(185 90% 55% / 0.07))",
        }}
        animate={{ x: [20, -40, 30, 20], y: [-10, 15, -5, -10], scaleX: [1, 1.2, 0.85, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />

      {/* Gentle vertical shimmer sweep */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, transparent 30%, hsl(223 83% 60% / 0.04) 50%, transparent 70%)",
        }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
};

export default AuroraEffect;
