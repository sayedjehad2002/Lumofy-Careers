// Lumofy Motion System — single source of truth for animation tokens + variants.
//
// Centralizes the easing/durations/stagger that were previously duplicated inline
// across many section components, so motion stays consistent and tunable in one place.
// Pair with <MotionConfig reducedMotion="user"> (see App.tsx): every motion.* that
// uses these variants then automatically respects prefers-reduced-motion.
//
// Guardrails (ui-ux-pro-max §7): animate transform/opacity only, 150–400ms, ease-out
// enter, ~30–50ms stagger, no layout shift.

import type { Variants, Transition } from "framer-motion";

// Signature Lumofy easing (smooth, snappy) — already used across the app; codified here.
export const brandEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const durations = {
  fast: 0.15,
  base: 0.22,
  mid: 0.3,
  slow: 0.4,
} as const;

// Snappier signature rhythm (was 0.06–0.15 inline).
export const STAGGER = 0.05;

export const tween = (duration: number = durations.mid): Transition => ({
  duration,
  ease: brandEase,
});

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: tween(durations.slow) },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: tween(durations.mid) },
};

export const staggerContainer = (
  stagger: number = STAGGER,
  delayChildren: number = 0.05,
): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});

// Shared scroll-reveal viewport config: reveal once, slightly before fully in view.
export const revealViewport = { once: true, margin: "-60px" } as const;

// Helper: read the user's reduced-motion preference (for JS-driven loops/canvas that
// live outside framer-motion's MotionConfig — e.g. ParticleNetwork, CursorGlow).
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
