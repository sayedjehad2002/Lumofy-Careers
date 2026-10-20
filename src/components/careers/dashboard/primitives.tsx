import { useId, type ReactNode, type ComponentType } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus, Search, X } from "lucide-react";
import AnimatedCounter from "@/components/careers/AnimatedCounter";
import { brandEase, prefersReducedMotion } from "@/lib/motion";
import { Spark } from "@/components/careers/cx/parts";
import "./dx.css";

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
  const headingId = useId();
  return (
    <section className={`h-full ${PANEL} ${className}`} aria-labelledby={title ? headingId : undefined}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-[hsl(var(--intel-border))] px-4 py-2.5">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
            {/* Heading semantics only — no visual change. Preflight makes h2 inherit
                font-size/weight/margin, so it renders identically to the plain text
                it replaces while giving screen-reader users a real landmark to jump to. */}
            {title && <h2 id={headingId}>{title}</h2>}
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
  tone = "default",
  onClick,
}: {
  label: string;
  value: ReactNode;
  delta?: number | null;
  series?: number[];
  seriesClassName?: string;
  hint?: string;
  /** "warning" gives the tile amber emphasis (border + value colour). Defaults to
   *  current styling, so existing callers are unaffected. */
  tone?: "default" | "warning";
  onClick?: () => void;
}) {
  const interactive = !!onClick;
  const Tag: "button" | "div" = interactive ? "button" : "div";
  // Built inline (not via the shared PANEL constant) so the border colour can vary
  // by tone without stacking two conflicting border-color utility classes.
  const surface = `rounded-xl border ${
    tone === "warning" ? "border-[hsl(var(--intel-warning)/0.5)]" : "border-[hsl(var(--intel-border))]"
  } bg-[hsl(var(--intel-card))]`;
  return (
    <Tag
      {...(interactive ? { onClick, type: "button" as const } : {})}
      className={`flex h-full flex-col gap-1.5 ${surface} px-4 py-3.5 text-left transition-colors ${
        interactive
          ? "hover:bg-[hsl(var(--intel-card-hover))] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
          : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        <DeltaBadge delta={delta} />
      </div>
      <span
        className={`text-2xl font-semibold tabular-nums leading-none ${
          tone === "warning" ? "text-[hsl(var(--intel-warning))]" : "text-foreground"
        }`}
      >
        {value}
      </span>
      {/* Hint and sparkline coexist: the hint carries the metric's denominator or
          sample size, which is what stops a bare number being read as a fact
          about the whole pipeline. It must not be crowded out by a trend line. */}
      {(hint || (series && series.length > 0)) && (
        <div className="flex items-end justify-between gap-2">
          {hint
            ? <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground" title={hint}>{hint}</span>
            : <span />}
          {series && series.length > 0 && (
            <Sparkline data={series} className={`h-6 w-20 flex-shrink-0 ${seriesClassName || "text-primary"}`} />
          )}
        </div>
      )}
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

/* ───────────── Path of Light layer (dx.css) ─────────────
   The public careers site's language, tuned for a tool: an eyebrow pill with the
   brand sparkle, a Source Sans display title, one plain summary sentence, pill
   chips, hairline list surfaces. Every dashboard tab builds its top from these,
   so the tabs read as one product with the site candidates see. */

/** Tab header: eyebrow, display title, one summary sentence, and actions on the right. */
export function PageHeader({
  eyebrow,
  title,
  summary,
  actions,
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  summary?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`dx-head ${className}`}>
      <div className="dx-head__copy">
        {eyebrow && (
          <p className="dx-eyebrow">
            <Spark />
            {eyebrow}
          </p>
        )}
        <h1 className="dx-title">{title}</h1>
        {summary && <p className="dx-sum">{summary}</p>}
      </div>
      {actions && <div className="dx-head__actions">{actions}</div>}
    </header>
  );
}

/** Filter chip with an optional count. `tone="warning"` for chips that name a problem. */
export function Chip({
  active,
  count,
  tone,
  onClick,
  disabled,
  title,
  children,
}: {
  active: boolean;
  count?: number;
  tone?: "warning";
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`dx-chip${tone === "warning" ? " dx-chip--warn" : ""}${active ? " is-on" : ""}`}
    >
      {children}
      {count !== undefined && <span className="dx-chip__n">{count}</span>}
    </button>
  );
}

/** Toolbar search field: mist well, Sirius focus ring, clear button once there is text. */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className = "",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  /** Accessible name (the placeholder is not one). */
  label: string;
  className?: string;
}) {
  return (
    <div className={`dx-search ${className}`}>
      <Search aria-hidden="true" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="dx-search__input"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="dx-search__clear">
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** Empty or no-match state: icon in a haze circle, a title, and an optional way out. */
export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon?: IconType;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="dx-empty">
      {Icon && (
        <span className="dx-empty__ic" aria-hidden="true">
          <Icon />
        </span>
      )}
      <p className="dx-empty__title">{title}</p>
      {children}
    </div>
  );
}
