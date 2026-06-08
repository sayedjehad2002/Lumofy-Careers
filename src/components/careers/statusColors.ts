/**
 * Shared semantic color map for the HR admin dashboard.
 *
 * All admin status / tier / metric colors resolve to design tokens defined in
 * `src/index.css` (`--intel-success/--intel-warning/--intel-danger`,
 * `--chart-1..5`, `--primary`, `--destructive`). This keeps the dashboard on a
 * single source of truth that reads correctly in BOTH light and dark mode,
 * instead of hardcoded Tailwind palette literals (emerald/yellow/violet/orange).
 *
 * Usage: spread the returned class string into a `className`.
 */

/** Soft tinted background + solid foreground for badges/chips. */
export const TONE_SOFT = {
  success: "bg-[hsl(var(--intel-success)/0.15)] text-[hsl(var(--intel-success))]",
  warning: "bg-[hsl(var(--intel-warning)/0.15)] text-[hsl(var(--intel-warning))]",
  danger: "bg-destructive/10 text-destructive",
  accent: "bg-primary/15 text-primary",
  /** AI / analytics accent (chart-3 = violet family token). */
  ai: "bg-[hsl(var(--chart-3)/0.15)] text-[hsl(var(--chart-3))]",
  /** Secondary warning / "bronze" rank accent (chart-5 = amber/orange token). */
  bronze: "bg-[hsl(var(--chart-5)/0.15)] text-[hsl(var(--chart-5))]",
  muted: "bg-muted text-muted-foreground",
} as const;

/** Solid foreground text only. */
export const TONE_TEXT = {
  success: "text-[hsl(var(--intel-success))]",
  warning: "text-[hsl(var(--intel-warning))]",
  danger: "text-destructive",
  accent: "text-primary",
  ai: "text-[hsl(var(--chart-3))]",
  bronze: "text-[hsl(var(--chart-5))]",
  muted: "text-muted-foreground",
} as const;

/** Solid background fill (progress bars, dots, accents). */
export const TONE_BG = {
  success: "bg-[hsl(var(--intel-success))]",
  warning: "bg-[hsl(var(--intel-warning))]",
  danger: "bg-destructive",
  accent: "bg-primary",
  ai: "bg-[hsl(var(--chart-3))]",
  bronze: "bg-[hsl(var(--chart-5))]",
  muted: "bg-muted",
} as const;

/** Border color at 30% opacity. */
export const TONE_BORDER = {
  success: "border-[hsl(var(--intel-success)/0.3)]",
  warning: "border-[hsl(var(--intel-warning)/0.3)]",
  danger: "border-destructive/30",
  accent: "border-primary/30",
  ai: "border-[hsl(var(--chart-3)/0.3)]",
  bronze: "border-[hsl(var(--chart-5)/0.3)]",
} as const;

/** Very subtle tinted surface (10%) for highlighted rows/containers. */
export const TONE_SUBTLE = {
  success: "bg-[hsl(var(--intel-success)/0.1)]",
  warning: "bg-[hsl(var(--intel-warning)/0.1)]",
  danger: "bg-destructive/10",
  accent: "bg-primary/10",
  ai: "bg-[hsl(var(--chart-3)/0.1)]",
  bronze: "bg-[hsl(var(--chart-5)/0.1)]",
} as const;

/**
 * Categorical chart palette as soft badge classes (bg tint + solid text).
 * For sets of distinct, non-semantic categories (tags, audit actions) that need
 * to be visually separable. Theme-aware via --chart-1..5 tokens.
 */
export const CHART_SOFT = [
  "bg-[hsl(var(--chart-1)/0.15)] text-[hsl(var(--chart-1))]",
  "bg-[hsl(var(--chart-2)/0.15)] text-[hsl(var(--chart-2))]",
  "bg-[hsl(var(--chart-3)/0.15)] text-[hsl(var(--chart-3))]",
  "bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))]",
  "bg-[hsl(var(--chart-5)/0.15)] text-[hsl(var(--chart-5))]",
];

/** Categorical chart palette including a border (for outlined tag chips). */
export const CHART_SOFT_BORDERED = [
  "bg-[hsl(var(--chart-1)/0.2)] text-[hsl(var(--chart-1))] border-[hsl(var(--chart-1)/0.3)]",
  "bg-[hsl(var(--chart-2)/0.2)] text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2)/0.3)]",
  "bg-[hsl(var(--chart-3)/0.2)] text-[hsl(var(--chart-3))] border-[hsl(var(--chart-3)/0.3)]",
  "bg-[hsl(var(--chart-4)/0.2)] text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4)/0.3)]",
  "bg-[hsl(var(--chart-5)/0.2)] text-[hsl(var(--chart-5))] border-[hsl(var(--chart-5)/0.3)]",
];

export type Tone = keyof typeof TONE_SOFT;

/**
 * Candidate AI-fit ranking tier → tone.
 * (Top/Strong/Moderate/Weak, with optional " Match" suffix.)
 */
export function tierTone(tier: string): Tone {
  const t = tier.toLowerCase();
  if (t.startsWith("top")) return "success";
  if (t.startsWith("strong")) return "accent";
  if (t.startsWith("moderate")) return "warning";
  return "danger";
}

/** Soft badge classes for a ranking tier. */
export function tierSoft(tier: string): string {
  return TONE_SOFT[tierTone(tier)];
}

/**
 * AI-fit score (0-100) → tone, using the standard dashboard thresholds.
 * High = success, mid = warning, low = danger. `strongThreshold` lets callers
 * treat an upper band as the brand "accent" tone (used by ranking views).
 */
export function scoreTone(score: number, opts?: { strongAsAccent?: boolean }): Tone {
  if (score >= 85) return "success";
  if (score >= 70) return opts?.strongAsAccent ? "accent" : "success";
  if (score >= 50) return "warning";
  return "danger";
}

/**
 * Raw HSL color references for the recruitment funnel (chart palette).
 * Used where an explicit color value (not a class) is required (e.g. recharts
 * `fill`, inline `backgroundColor`). Ordered new → reviewing → shortlisted →
 * interview → hired → rejected.
 */
export const FUNNEL_FILLS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-5))",
  "hsl(var(--intel-success))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-2))",
  "hsl(var(--destructive))",
];

/**
 * Ordered, theme-aware color VALUES (not classes) for categorical chart series
 * (recharts `fill`/`stroke`, inline `backgroundColor`). Single source of truth —
 * replaces hardcoded hex like "#3b82f6" that break in dark mode.
 */
export const CHART_SERIES = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];
