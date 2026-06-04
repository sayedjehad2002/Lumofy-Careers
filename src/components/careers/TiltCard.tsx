import { useRef, useState } from "react";
import { motion } from "framer-motion";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  tiltDeg?: number;
}

const TiltCard = ({ children, className = "", tiltDeg = 8 }: TiltCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50 });

  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({
      rotateX: (0.5 - y) * tiltDeg,
      rotateY: (x - 0.5) * tiltDeg,
    });
    setGlare({ x: x * 100, y: y * 100 });
  };

  const handleLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setGlare({ x: 50, y: 50 });
  };

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      animate={tilt}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ perspective: 800, transformStyle: "preserve-3d" }}
    >
      {children}
      {/* Glare overlay */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, hsl(0 0% 100% / 0.06), transparent 60%)`,
        }}
      />
    </motion.div>
  );
};

export default TiltCard;
