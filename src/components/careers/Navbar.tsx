import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCareers } from "@/contexts/CareersContext";
import lumofyLogoWhite from "@/assets/brand/lumofy-en-white.svg";

// The lumofy.ai master-brand nav: a DARK sticky bar (white wordmark, on-dark
// links, pill CTA) over the light page — the same bookend pattern as the main
// website. Art-directed dark in both themes, so no theme toggle lives here.
const Navbar = forwardRef<HTMLElement>((_, ref) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isHrUser } = useCareers();

  // Single-page anchors (Index has a hash-scroll effect that handles these).
  const links = [
    { to: "/#why", label: "Mission" },
    { to: "/#building", label: "What We Build" },
    { to: "/#growth", label: "Growth" },
    { to: "/jobs", label: "Open Roles" },
  ];

  return (
    <motion.nav
      ref={ref as any}
      aria-label="Primary"
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[hsl(var(--lx-nav)/0.92)] backdrop-blur-xl"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 3xl:max-w-[1800px] 4xl:max-w-[2000px]">
        <div className="flex items-center justify-between h-[68px]">
          <Link to="/" className="flex items-center gap-2.5 group" aria-label="Lumofy Careers — home">
            <img
              src={lumofyLogoWhite}
              alt="Lumofy"
              className="h-8 w-auto transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <span className="rounded-full bg-[hsl(var(--lx-blue-soft)/0.16)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--lx-blue-glow))]">
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
                  className="whitespace-nowrap px-3.5 py-2 text-[15px] font-medium text-[hsl(var(--lx-on-dark-2))] hover:text-white transition-colors rounded-md relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lx-blue-soft))]"
                >
                  {link.label}
                  <span className="absolute bottom-0.5 left-3.5 right-3.5 h-[2px] bg-[hsl(var(--lx-blue-soft))] rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                </Link>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Button asChild className="ml-3 h-11 rounded-full px-6 text-[15px] font-semibold btn-sheen shadow-sirius">
                <Link to="/jobs">View Open Roles</Link>
              </Button>
            </motion.div>
            {isHrUser && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.3 }}
              >
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="ml-2 rounded-full border-white/20 bg-transparent text-[hsl(var(--lx-on-dark-2))] hover:bg-white/10 hover:text-white"
                >
                  <Link to="/dashboard">HR Dashboard</Link>
                </Button>
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <motion.button
              className="text-[hsl(var(--lx-on-dark))] p-3 -m-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lx-blue-soft))]"
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
            className="md:hidden border-t border-white/[0.06] bg-[hsl(var(--lx-nav)/0.97)] backdrop-blur-xl overflow-hidden"
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
                    className="block px-3 py-2.5 text-[15px] font-medium text-[hsl(var(--lx-on-dark-2))] hover:text-white rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lx-blue-soft))]"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <Button asChild className="mt-2 w-full h-11 rounded-full btn-sheen">
                <Link to="/jobs" onClick={() => setMobileOpen(false)}>
                  View Open Roles
                </Link>
              </Button>
              {isHrUser && (
                <Button asChild size="sm" variant="outline" className="mt-2 w-full rounded-full border-white/20 bg-transparent text-[hsl(var(--lx-on-dark-2))] hover:bg-white/10 hover:text-white">
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
