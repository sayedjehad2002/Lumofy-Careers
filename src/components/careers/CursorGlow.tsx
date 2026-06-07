import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Soft glow that trails the cursor (desktop only). The mousemove handler only stores
 * the latest position; the rAF loop does the eased follow — so pointer events never
 * drive layout work. Disabled entirely under prefers-reduced-motion.
 */
const CursorGlow = () => {
  const glowRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);
  // Decide once on mount; honor reduced motion without a first-frame flash.
  const [enabled] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    if (!enabled) return;

    const handleMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };

    const animate = () => {
      const lerp = 0.12;
      currentRef.current.x += (posRef.current.x - currentRef.current.x) * lerp;
      currentRef.current.y += (posRef.current.y - currentRef.current.y) * lerp;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${currentRef.current.x - 200}px, ${currentRef.current.y - 200}px)`;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(animRef.current);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      className="fixed top-0 left-0 w-[400px] h-[400px] pointer-events-none z-[9999] mix-blend-screen hidden md:block"
      style={{
        background: "radial-gradient(circle, hsl(223 83% 60% / 0.07) 0%, hsl(270 80% 60% / 0.03) 30%, transparent 70%)",
        borderRadius: "50%",
        willChange: "transform",
      }}
    />
  );
};

export default CursorGlow;
