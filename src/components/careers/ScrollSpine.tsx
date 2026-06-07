import { motion, useScroll, useSpring, useTransform } from "framer-motion";

const ScrollSpine = () => {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 50, damping: 20 });
  const dotY = useTransform(smoothProgress, [0, 1], [0, 128]);

  return (
    <div className="fixed left-4 lg:left-8 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center">
      {/* Track */}
      <div className="relative w-[2px] h-32 bg-border/20 rounded-full overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 w-full rounded-full"
          style={{
            height: "100%",
            scaleY: smoothProgress,
            transformOrigin: "top",
            background: "linear-gradient(180deg, hsl(223 83% 60% / 0.8), hsl(205 90% 64% / 0.4))",
          }}
        />
      </div>

      {/* Glowing dot */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary"
        style={{
          top: 0,
          y: dotY,
          boxShadow: "0 0 10px hsl(223 83% 60% / 0.6), 0 0 25px hsl(223 83% 60% / 0.2)",
        }}
      />

      {/* Section markers */}
      {[0, 0.25, 0.5, 0.75, 1].map((pos) => (
        <div
          key={pos}
          className="absolute left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-muted-foreground/20"
          style={{ top: pos * 128 }}
        />
      ))}
    </div>
  );
};

export default ScrollSpine;
