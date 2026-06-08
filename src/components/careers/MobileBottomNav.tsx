import { forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Briefcase, Users, Sparkles, Send } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/#why", label: "Mission", icon: Sparkles },
  { to: "/#team", label: "Team", icon: Users },
  { to: "/#roles", label: "Roles", icon: Briefcase },
  { to: "/jobs", label: "Apply", icon: Send },
];

const MobileBottomNav = forwardRef<HTMLElement>((_, ref) => {
  const location = useLocation();

  // Don't show on dashboard or apply pages
  if (location.pathname.startsWith("/dashboard") || location.pathname.includes("/apply") || location.pathname.includes("/respond")) {
    return null;
  }

  return (
    <nav ref={ref} className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="glass border-t border-border/50 px-2 pb-[env(safe-area-inset-bottom)]">
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
                className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative">
                  {isActive && (
                    <span className="absolute -inset-2 bg-primary/10 rounded-lg" />
                  )}
                  <Icon className={`w-5 h-5 relative z-10 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-primary" : ""}`}>
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
