import { type ReactNode, type ComponentType } from "react";

/**
 * Linear-style dashboard primitives — the shared design language for the HR
 * dashboard reshape: calm dark surfaces, hairline borders, restrained color
 * (one royal-blue accent), dense rows, tabular numbers, minimal decoration.
 * Reused across every dashboard screen so the look stays consistent.
 */

type IconType = ComponentType<{ className?: string }>;

/** A calm surface: hairline border, subtle elevation, optional clean header. No gradients/glows. */
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
    <section className={`rounded-xl border border-border/70 bg-card/50 ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            {title}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** A flat KPI: muted label, large tabular value, optional hint. Clickable when onClick is set. */
export function StatTile({
  label,
  value,
  hint,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  onClick?: () => void;
}) {
  const interactive = !!onClick;
  const Tag: "button" | "div" = interactive ? "button" : "div";
  return (
    <Tag
      {...(interactive ? { onClick, type: "button" as const } : {})}
      className={`flex flex-col gap-1.5 rounded-xl border border-border/70 bg-card/50 px-4 py-3.5 text-left transition-colors ${
        interactive
          ? "hover:border-border hover:bg-card focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
          : ""
      }`}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums leading-none text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </Tag>
  );
}

/** A simple labelled progress meter used in the calm pipeline / recommendation views. */
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
        <span className="tabular-nums text-muted-foreground">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary/60">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
    </div>
  );
}
