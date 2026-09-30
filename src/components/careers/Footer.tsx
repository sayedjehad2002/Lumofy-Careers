import { forwardRef, type MouseEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { SITE } from "@/data/site";
import lumofyLogoWhite from "@/assets/brand/lumofy-en-white.svg";
import "@/components/careers/cx/cx.css";
import { CxIcon } from "@/components/careers/cx/icons";
import { scrollToSection } from "@/components/careers/cx/scroll";

const LINKEDIN_URL = "https://www.linkedin.com/company/lumofyinc/";
const CAREER_LINKS = [
  { id: "mission", label: "Mission" },
  { id: "build", label: "What we build" },
  { id: "growth", label: "Growth" },
  { id: "roles", label: "Open roles" },
  { id: "hiring", label: "How we hire" },
];

// Dark footer shared by every public page. Office cities and hours follow lumofy.ai/en/contact.
// On pages that show the mobile bottom nav (not home, not apply), extra bottom padding keeps the legal line clear of it.
const Footer = forwardRef<HTMLElement>((_, ref) => {
  const { pathname } = useLocation();
  const home = pathname === "/";
  const navPad = !home && !pathname.includes("/apply");
  // on the homepage, section links scroll in place like the nav's (a link to the hash already in the URL would do nothing)
  const onSection = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (!home || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (scrollToSection(id)) e.preventDefault();
  };
  return (
    <footer ref={ref} className={"cx cx-foot" + (navPad ? " cx-foot--navpad" : "")}>
      <div className="cx-wrap cx-foot__in">
        <div className="cx-foot__brand">
          <Link to="/" aria-label="Lumofy Careers, home">
            <img src={lumofyLogoWhite} alt="Lumofy" width={120} height={28} loading="lazy" />
          </Link>
          <p>
            Lumofy is the AI-powered workforce performance &amp; development platform helping organizations measure performance,
            build capabilities, and mobilize their people.
          </p>
        </div>
        <nav className="cx-foot__col" aria-label="Careers">
          <p className="cx-foot__h">Careers</p>
          {CAREER_LINKS.map((l) => <Link key={l.id} to={{ pathname: "/", hash: `#${l.id}` }} onClick={onSection(l.id)}>{l.label}</Link>)}
        </nav>
        <div className="cx-foot__col">
          <p className="cx-foot__h">Get in touch</p>
          <a href={`mailto:${SITE.careersEmail}`}><CxIcon name="envelope-simple" />{SITE.careersEmail}</a>
          <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer"><CxIcon name="linkedin-logo" />LinkedIn<span className="sr-only"> (opens in a new tab)</span></a>
          <a href="https://lumofy.ai" target="_blank" rel="noopener noreferrer"><CxIcon name="arrow-up-right" />lumofy.ai<span className="sr-only"> (opens in a new tab)</span></a>
        </div>
        <div className="cx-foot__col">
          <p className="cx-foot__h">Offices</p>
          <p className="cx-foot__line"><CxIcon name="map-pin" />Manama, Bahrain</p>
          <p className="cx-foot__line"><CxIcon name="map-pin" />Riyadh, Saudi Arabia</p>
          <p className="cx-foot__line cx-mono">Sun–Thu, 8:00–17:00</p>
        </div>
      </div>
      <div className="cx-wrap cx-foot__legal">
        <p>© {new Date().getFullYear()} Lumofy. All rights reserved.</p>
      </div>
    </footer>
  );
});
Footer.displayName = "Footer";

export default Footer;
