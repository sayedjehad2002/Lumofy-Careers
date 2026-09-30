import { forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { CxIcon, type CxIconName } from "@/components/careers/cx/icons";

/**
 * Four destinations, four distinct ideas.
 *
 * Sparkles and TrendingUp were both wrong here, and both for the same reason:
 * each already carries a settled meaning elsewhere in the product. Sparkles is
 * the AI marker (nine files), so on "Mission" it promised a feature rather than
 * a purpose. TrendingUp is the metrics glyph — and the Growth section is career
 * acceleration, learning and well-being, not a chart that goes up.
 *
 * Binoculars read as looking far ahead, which is what "the problem worth
 * joining" is about. The plant reads as personal development rather than a
 * rising line. Neither appears anywhere else in the app, so neither collides.
 * Phosphor, like the careers nav and footer this bar sits under.
 */
const navItems: { to: string; label: string; icon: CxIconName }[] = [
  { to: "/", label: "Home", icon: "house" },
  { to: "/#mission", label: "Mission", icon: "binoculars" },
  { to: "/#growth", label: "Growth", icon: "plant" },
  { to: "/jobs", label: "Apply", icon: "briefcase" },
];

const MobileBottomNav = forwardRef<HTMLElement>((_, ref) => {
  const location = useLocation();

  // Don't show on the homepage (its nav menu covers every section), dashboard, apply, or HR pages
  if (location.pathname === "/" || location.pathname.startsWith("/dashboard") || location.pathname.includes("/apply") || location.pathname.startsWith("/hr/")) {
    return null;
  }

  return (
    <nav ref={ref} aria-label="Quick navigation" className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Dark bar to match the lx nav bookend — fixed dark in both themes. */}
      <div className="border-t border-white/[0.08] bg-[hsl(var(--lx-nav)/0.95)] backdrop-blur-xl px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lx-blue-soft))] ${
                  isActive
                    ? "text-[hsl(var(--lx-blue-glow))]"
                    : "text-[hsl(var(--lx-on-dark-3))] hover:text-[hsl(var(--lx-on-dark))]"
                }`}
              >
                {/* The active lift lives on this wrapper, not on the icon.
                    The global press animation deliberately skips any icon that
                    owns its own transform (`:not([class*="scale-"])`), so a
                    `scale-110` on the icon made the selected tab the one
                    icon that never answered a tap — backwards, on the control
                    the thumb is actually on. */}
                <div className={`relative transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
                  {isActive && (
                    <span className="absolute -inset-2 bg-[hsl(var(--lx-blue-soft)/0.15)] rounded-lg" />
                  )}
                  <CxIcon name={item.icon} className="w-5 h-5 relative z-10" />
                </div>
                <span className="text-[10px] font-medium">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
});
MobileBottomNav.displayName = "MobileBottomNav";

export default MobileBottomNav;
