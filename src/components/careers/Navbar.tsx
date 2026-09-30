import { forwardRef, useEffect, useRef, useState, type MouseEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCareers } from "@/contexts/CareersContext";
import lumofyLogo from "@/assets/brand/lumofy-en-secondary.svg";
import "@/components/careers/cx/cx.css";
import { CxIcon } from "@/components/careers/cx/icons";
import { scrollToSection } from "@/components/careers/cx/scroll";

const LINKS = [
  { id: "mission", label: "Mission" },
  { id: "build", label: "What we build" },
  { id: "growth", label: "Growth" },
  { id: "roles", label: "Open roles" },
];
const SPY_IDS = ["top", "mission", "build", "growth", "roles", "hiring", "join"];

// Dark sticky bar shared by every public page. On the homepage it starts transparent over the dark hero
// and turns solid Cosmos after 24px; elsewhere it is solid from the start. Section links scroll in place
// on the homepage and route to "/#section" from other pages (Index scrolls to the hash on arrival).
const Navbar = forwardRef<HTMLElement>((_, ref) => {
  const { pathname } = useLocation();
  const home = pathname === "/";
  const { jobs, loading, isHrUser } = useCareers();
  const openCount = jobs.filter((j) => j.status === "open" && !j.archivedAt).length;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!home) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [home]);

  // scroll-spy (homepage only): sections without a nav link clear the marker
  useEffect(() => {
    setCurrent(null);
    if (!home) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setCurrent(e.target.id); }),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    SPY_IDS.forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    return () => io.disconnect();
  }, [home]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    // Escape closes the menu; focus returns to the burger only if it was in the menu (never pulled back from the page)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const a = document.activeElement;
      const inside = a === burgerRef.current || !!document.getElementById("cx-menu")?.contains(a);
      setMenuOpen(false);
      if (inside) burgerRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const onSection = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    setMenuOpen(false);
    if (!home || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (scrollToSection(id)) e.preventDefault();
  };
  const sectionLink = (id: string, label: string, extra?: Record<string, string>) => (
    <Link key={id} to={{ pathname: "/", hash: `#${id}` }} onClick={onSection(id)} {...extra}>
      {label}
    </Link>
  );

  const solid = !home || scrolled || menuOpen;
  return (
    <header ref={ref} className={"cx cx-nav" + (solid ? " is-solid" : "") + (menuOpen ? " is-menu" : "")}>
      <div className="cx-nav__in">
        <Link className="cx-nav__brand" to="/" aria-label="Lumofy Careers, home" onClick={home ? onSection("top") : undefined}>
          <img src={lumofyLogo} alt="Lumofy" width={132} height={30} />
          <span className="cx-nav__tag">Careers</span>
        </Link>
        <nav className="cx-nav__links" aria-label="Primary">
          {LINKS.map((l) => sectionLink(l.id, l.label, { "aria-current": String(home && current === l.id) }))}
        </nav>
        <div className="cx-nav__end">
          {isHrUser && (
            <Link className="cx-btn cx-btn--ghost-dark cx-btn--sm cx-nav__hr" to="/dashboard">HR Dashboard</Link>
          )}
          <Link className="cx-btn cx-btn--primary cx-btn--sm cx-nav__cta" to={{ pathname: "/", hash: "#roles" }} onClick={onSection("roles")}>
            Open roles{!loading && openCount > 0 && <span className="cx-nav__count">{openCount}</span>}
          </Link>
          <button
            ref={burgerRef} type="button" className="cx-nav__burger" aria-expanded={menuOpen} aria-controls="cx-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen((o) => !o)}
          >
            <CxIcon name={menuOpen ? "x" : "list"} />
          </button>
        </div>
      </div>
      <div className="cx-menu" id="cx-menu" hidden={!menuOpen}>
        <nav aria-label="Sections">
          {LINKS.map((l) => sectionLink(l.id, l.label))}
          {sectionLink("hiring", "How we hire")}
          {isHrUser && <Link to="/dashboard">HR Dashboard</Link>}
        </nav>
      </div>
    </header>
  );
});
Navbar.displayName = "Navbar";

export default Navbar;
