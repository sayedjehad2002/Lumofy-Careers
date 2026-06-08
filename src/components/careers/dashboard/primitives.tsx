import { type ReactNode, type ComponentType } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import AnimatedCounter from "@/components/careers/AnimatedCounter";
import { brandEase, prefersReducedMotion } from "@/lib/motion";

/**
 * Dashboard primitives — the shared "Intelligence in Motion, tool-tuned" language:
 * calm intel-token surfaces, hairline borders, mono data, one Sirius accent,
 * restrained motion. Reused across every dashboard screen for consistency.
 */
type IconType = ComponentType<{ className?: string }>;

const PANEL = "rounded-xl border border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-card))]";

/** Calm surface: intel-card, hairline border, optional header with mono kicker. */
export function Panel({
  title,
  icon: Icon,
  action,
  children,
  className = "",
  bodyClassName = "p-4",
}: {
  title?: string;
  icon?: IconType;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`h-full ${PANEL} ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-[hsl(var(--intel-border))] px-4 py-2.5">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
            {title}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Tiny inline-SVG trend line. Size + color via className (e.g. "h-6 w-20 text-primary"). */
export function Sparkline({ data, className = "h-6 w-20 text-primary" }: { data: number[]; className?: string }) {
  if (!data.length) return null;
  const w = 80;
  const h = 24;
  const p = 2;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = p + (i / Math.max(1, data.length - 1)) * (w - 2 * p);
    const y = h - p - ((v - min) / range) * (h - 2 * p);
    return [x, y] as const;
  });
  const line = pts.map((pt, i) => `${i ? "L" : "M"}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" className={className}>
      <path d={area} className="fill-current opacity-[0.08]" stroke="none" />
      <motion.path
        d={line}
        fill="none"
        className="stroke-current"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: brandEase }}
      />
    </svg>
  );
}

/** ▲ up (success) / ▼ down (muted, never alarming) / — flat. Hidden when delta is null. */
export function DeltaBadge({ delta, suffix = "%" }: { delta: number | null | undefined; suffix?: string }) {
  if (delta == null) return null;
  const flat = delta === 0;
  const up = delta > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const cls = up ? "text-[hsl(var(--intel-success))]" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-[11px] ${cls}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {Math.abs(delta)}
      {suffix}
    </span>
  );
}

/** Pulsing live status dot (static under reduced motion). */
export function LiveDot({ className = "" }: { className?: string }) {
  const reduced = prefersReducedMotion();
  return (
    <span className={`relative flex h-1.5 w-1.5 ${className}`}>
      {!reduced && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />}
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
    </span>
  );
}

/** Mono kicker + sans title, standard section rhythm. */
export function SectionHeading({ kicker, title, action }: { kicker?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {kicker && <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{kicker}</p>}
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/** Elevated KPI: mono label (+ optional DeltaBadge), big tabular value, optional Sparkline. */
export function MetricTile({
  label,
  value,
  delta,
  series,
  seriesClassName,
  hint,
  onClick,
}: {
  label: string;
  value: ReactNode;
  delta?: number | null;
  series?: number[];
  seriesClassName?: string;
  hint?: string;
  onClick?: () => void;
}) {
  const interactive = !!onClick;
  const Tag: "button" | "div" = interactive ? "button" : "div";
  return (
    <Tag
      {...(interactive ? { onClick, type: "button" as const } : {})}
      className={`flex h-full flex-col gap-1.5 ${PANEL} px-4 py-3.5 text-left transition-colors ${
        interactive
          ? "hover:bg-[hsl(var(--intel-card-hover))] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
          : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        <DeltaBadge delta={delta} />
      </div>
      <span className="text-2xl font-semibold tabular-nums leading-none text-foreground">{value}</span>
      {series && series.length > 0 ? (
        <Sparkline data={series} className={`h-6 w-20 ${seriesClassName || "text-primary"}`} />
      ) : hint ? (
        <span className="font-mono text-[11px] text-muted-foreground">{hint}</span>
      ) : null}
    </Tag>
  );
}

/** Back-compat alias — existing call sites importing StatTile keep working. */
export const StatTile = MetricTile;

/** Labelled progress meter (token track, mono value). */
export function Meter({
  label,
  value,
  pct,
  barColor,
  labelColor = "text-muted-foreground",
}: {
  label: string;
  value: ReactNode;
  pct: number;
  barColor: string;
  labelColor?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className={`font-medium ${labelColor}`}>{label}</span>
        <span className="font-mono tabular-nums text-muted-foreground">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[hsl(var(--intel-gauge-track))]">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: Math.max(0, Math.min(100, pct)) / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: brandEase }}
          style={{ transformOrigin: "left", width: "100%" }}
        />
      </div>
    </div>
  );
}
