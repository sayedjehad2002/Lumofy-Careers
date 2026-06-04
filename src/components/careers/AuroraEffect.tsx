import { motion } from "framer-motion";

const AuroraEffect = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Aurora band 1 — blue */}
      <motion.div
        className="absolute top-[10%] left-[-20%] w-[140%] h-[40%] rounded-[50%] blur-[100px]"
        style={{
          background: "linear-gradient(90deg, hsl(223 83% 60% / 0.08), hsl(200 90% 55% / 0.12), hsl(223 83% 60% / 0.06))",
        }}
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -20, 10, 0],
          scaleX: [1, 1.15, 0.95, 1],
          rotate: [0, 3, -2, 0],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Aurora band 2 — purple */}
      <motion.div
        className="absolute top-[25%] left-[-10%] w-[120%] h-[30%] rounded-[50%] blur-[120px]"
        style={{
          background: "linear-gradient(90deg, hsl(270 80% 60% / 0.05), hsl(280 90% 65% / 0.1), hsl(260 80% 55% / 0.04))",
        }}
        animate={{
          x: [-30, 50, 0, -30],
          y: [10, -15, 20, 10],
          scaleX: [1, 0.9, 1.1, 1],
          rotate: [0, -4, 2, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Aurora band 3 — cyan (dark mode accent) */}
      <motion.div
        className="absolute top-[15%] left-[10%] w-[80%] h-[25%] rounded-[50%] blur-[140px] hidden dark:block"
        style={{
          background: "linear-gradient(90deg, hsl(185 90% 55% / 0.04), hsl(190 85% 60% / 0.08), hsl(185 90% 55% / 0.03))",
        }}
        animate={{
          x: [20, -40, 30, 20],
          y: [-10, 15, -5, -10],
          scaleX: [1, 1.2, 0.85, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />

      {/* Shimmer overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, transparent 30%, hsl(223 83% 60% / 0.02) 50%, transparent 70%)",
        }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
};

export default AuroraEffect;
