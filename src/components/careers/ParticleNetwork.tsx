import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

/**
 * Decorative particle field behind the hero. Hardened for performance:
 * - skipped entirely under prefers-reduced-motion and on small screens (<768px),
 * - the RAF loop is paused via IntersectionObserver when scrolled off-screen,
 * - fewer particles than before (lighter O(n^2) connection pass),
 * - the canvas is aria-hidden + pointer-events-none (purely decorative); the mouse
 *   reaction reads a window-level listener instead of capturing pointer events.
 */
const ParticleNetwork = ({ className = "" }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Respect reduced motion and skip on small screens (battery/perf).
    if (prefersReducedMotion() || window.innerWidth < 768) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let running = false;

    const initParticles = (w: number, h: number) => {
      // Fewer than before (was /12000, cap 80) to lighten the O(n^2) link pass.
      const count = Math.min(Math.floor((w * h) / 18000), 45);
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
      }));
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      // setTransform (not scale) so DPR doesn't compound across resizes.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles(rect.width, rect.height);
    };

    const animate = () => {
      if (!running) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const connectionDist = 120;
      const mouseDist = 180;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseDist && dist > 0) {
          const force = ((mouseDist - dist) / mouseDist) * 0.02;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 0.8) {
          p.vx = (p.vx / speed) * 0.8;
          p.vy = (p.vy / speed) * 0.8;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(217, 91%, 60%, ${p.opacity})`;
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDist) {
            const alpha = (1 - dist / connectionDist) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(217, 91%, 60%, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      if (mouse.x > 0) {
        for (const p of particles) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouseDist) {
            const alpha = (1 - dist / mouseDist) * 0.25;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `hsla(217, 91%, 65%, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      rafId = requestAnimationFrame(animate);
    };

    const start = () => {
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(animate);
      }
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouse, { passive: true });

    // Only run while the canvas is on-screen.
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    });
    io.observe(canvas);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.7 }}
    />
  );
};

export default ParticleNetwork;
