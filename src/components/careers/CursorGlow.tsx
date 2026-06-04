import { useEffect, useRef } from "react";

const CursorGlow = () => {
  const glowRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);

  useEffect(() => {
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

    window.addEventListener("mousemove", handleMove);
    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div
      ref={glowRef}
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
