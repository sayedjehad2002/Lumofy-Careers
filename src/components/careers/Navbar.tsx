import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useCareers } from "@/contexts/CareersContext";
import lumofyLogo from "@/assets/lumofy-mark.png";

const Navbar = forwardRef<HTMLElement>((_, ref) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isHrUser } = useCareers();

  // Single-page anchors (Index has a hash-scroll effect that handles these).
  const links = [
    { to: "/#why", label: "Mission" },
    { to: "/#building", label: "Building" },
    { to: "/#growth", label: "Growth" },
  ];

  return (
    <motion.nav
      ref={ref as any}
      aria-label="Primary"
      className="fixed top-0 left-0 right-0 z-50 glass"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group" aria-label="Lumofy Careers — home">
            <img
              src={lumofyLogo}
              alt=""
              aria-hidden="true"
              className="h-11 w-11 object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span className="text-[1.6rem] font-extrabold leading-none tracking-tight text-foreground">
              Lumofy
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-readable">
              Careers
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((link, i) => (
              <motion.div
                key={link.label}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  to={link.to}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-primary-readable transition-colors rounded-md relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                  <span className="absolute bottom-0.5 left-3 right-3 h-[2px] bg-primary/60 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                </Link>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <ThemeToggle />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Button asChild size="sm" className="ml-1 rounded-xl btn-sheen">
                <Link to="/jobs">View open roles</Link>
              </Button>
            </motion.div>
            {isHrUser && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.3 }}
              >
                <Button asChild size="sm" variant="outline" className="ml-1 rounded-xl">
                  <Link to="/dashboard">HR Dashboard</Link>
                </Button>
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <motion.button
              className="text-foreground p-3 -m-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setMobileOpen(!mobileOpen)}
              whileTap={{ scale: 0.9 }}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <X className="w-5 h-5" aria-hidden="true" />
                  </motion.span>
                ) : (
                  <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Menu className="w-5 h-5" aria-hidden="true" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-menu"
            className="md:hidden glass border-t border-border overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-4 py-3 space-y-1">
              {links.map((link, i) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                >
                  <Link
                    to={link.to}
                    className="block px-3 py-2 text-sm text-muted-foreground hover:text-primary-readable rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <Button asChild size="sm" className="mt-2 w-full rounded-xl btn-sheen">
                <Link to="/jobs" onClick={() => setMobileOpen(false)}>
                  View open roles
                </Link>
              </Button>
              {isHrUser && (
                <Button asChild size="sm" variant="outline" className="mt-2 w-full rounded-xl">
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                    HR Dashboard
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
});
Navbar.displayName = "Navbar";

export default Navbar;
