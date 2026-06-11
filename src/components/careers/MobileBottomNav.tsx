import { forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, Sparkles, Send } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/#why", label: "Mission", icon: Sparkles },
  { to: "/#growth", label: "Growth", icon: TrendingUp },
  { to: "/jobs", label: "Apply", icon: Send },
];

const MobileBottomNav = forwardRef<HTMLElement>((_, ref) => {
  const location = useLocation();

  // Don't show on dashboard, apply, or HR pages
  if (location.pathname.startsWith("/dashboard") || location.pathname.includes("/apply") || location.pathname.startsWith("/hr/")) {
    return null;
  }

  return (
    <nav ref={ref} aria-label="Quick navigation" className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Dark bar to match the lx nav bookend — fixed dark in both themes. */}
      <div className="border-t border-white/[0.08] bg-[hsl(var(--lx-nav)/0.95)] backdrop-blur-xl px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
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
                <div className="relative">
                  {isActive && (
                    <span className="absolute -inset-2 bg-[hsl(var(--lx-blue-soft)/0.15)] rounded-lg" />
                  )}
                  <Icon className={`w-5 h-5 relative z-10 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
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
