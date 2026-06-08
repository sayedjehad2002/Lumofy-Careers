import { motion } from "framer-motion";

/**
 * Signature Lumofy "aurora" — a soft, slow-moving cosmic nebula behind the hero:
 * Sirius blue leads, with Eclipse purple + Nova pink accents (the brand palette).
 * GPU-only (transform / opacity / blur), pointer-events-none, paused under
 * prefers-reduced-motion via MotionConfig.
 */
const AuroraEffect = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Band 1 — Sirius blue (brand-led, dominant) */}
      <motion.div
        className="absolute top-[8%] left-[-20%] w-[140%] h-[42%] rounded-[50%] blur-[100px]"
        style={{
          background:
            "linear-gradient(90deg, hsl(223 83% 58% / 0.16), hsl(223 92% 66% / 0.24), hsl(223 83% 58% / 0.10))",
        }}
        animate={{ x: [0, 80, -40, 0], y: [0, -20, 10, 0], scaleX: [1, 1.15, 0.95, 1], rotate: [0, 3, -2, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Band 2 — Eclipse purple accent */}
      <motion.div
        className="absolute top-[22%] left-[-10%] w-[120%] h-[34%] rounded-[50%] blur-[120px]"
        style={{
          background:
            "linear-gradient(90deg, hsl(245 80% 64% / 0.09), hsl(264 100% 72% / 0.18), hsl(264 85% 66% / 0.08))",
        }}
        animate={{ x: [-30, 50, 0, -30], y: [10, -15, 20, 10], scaleX: [1, 0.9, 1.1, 1], rotate: [0, -4, 2, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Band 3 — Nova pink accent (subtle) */}
      <motion.div
        className="absolute top-[14%] left-[10%] w-[80%] h-[28%] rounded-[50%] blur-[140px]"
        style={{
          background:
            "linear-gradient(90deg, hsl(300 70% 64% / 0.07), hsl(336 78% 68% / 0.15), hsl(312 70% 64% / 0.06))",
        }}
        animate={{ x: [20, -40, 30, 20], y: [-10, 15, -5, -10], scaleX: [1, 1.2, 0.85, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />

      {/* Gentle vertical shimmer sweep */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, transparent 30%, hsl(223 83% 60% / 0.05) 50%, transparent 70%)",
        }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
};

export default AuroraEffect;
