import { motion } from "framer-motion";

const shapes = [
  { type: "circle", size: 60, x: "10%", y: "20%", duration: 18, delay: 0, opacity: 0.04 },
  { type: "hexagon", size: 40, x: "85%", y: "15%", duration: 22, delay: 2, opacity: 0.05 },
  { type: "circle", size: 80, x: "75%", y: "70%", duration: 20, delay: 4, opacity: 0.03 },
  { type: "hexagon", size: 50, x: "20%", y: "75%", duration: 24, delay: 1, opacity: 0.04 },
  { type: "circle", size: 35, x: "50%", y: "40%", duration: 16, delay: 3, opacity: 0.03 },
  { type: "hexagon", size: 45, x: "90%", y: "50%", duration: 19, delay: 5, opacity: 0.05 },
];

const hexagonPath = "M50 0L93.3 25V75L50 100L6.7 75V25Z";

const FloatingShapes = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {shapes.map((shape, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: shape.x, top: shape.y }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, -10, 5, 0],
            rotate: [0, 90, 180, 270, 360],
          }}
          transition={{
            duration: shape.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: shape.delay,
          }}
        >
          {shape.type === "circle" ? (
            <div
              className="rounded-full border border-primary/20"
              style={{
                width: shape.size,
                height: shape.size,
                opacity: shape.opacity,
                background: `radial-gradient(circle, hsl(223 83% 60% / 0.1), transparent)`,
              }}
            />
          ) : (
            <svg
              width={shape.size}
              height={shape.size}
              viewBox="0 0 100 100"
              style={{ opacity: shape.opacity }}
            >
              <path
                d={hexagonPath}
                fill="none"
                stroke="hsl(223 83% 60% / 0.3)"
                strokeWidth="1.5"
              />
            </svg>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingShapes;
