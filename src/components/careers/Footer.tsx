import { Linkedin, Mail, MapPin, ArrowRight } from "lucide-react";
import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SITE } from "@/data/site";
import lumofyLogoWhite from "@/assets/brand/lumofy-en-white.svg";

const LINKEDIN_URL = "https://www.linkedin.com/company/lumofyinc/";

// The main site's dark footer, careers edition: white wordmark + bio + pill
// CTA on the left, link columns on the right, slim legal bar. Fixed dark in
// both themes — the same bookend as the nav. (pb-24 on mobile clears the
// bottom nav.)
const Footer = forwardRef<HTMLElement>((_, ref) => (
  <footer ref={ref} className="bg-[hsl(var(--lx-foot))] text-[hsl(var(--lx-on-dark-2))]">
    <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-16 sm:px-6 md:pb-12 lg:px-8">
      <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
        {/* Brand */}
        <div className="max-w-xs">
          <Link to="/" aria-label="Lumofy — home" className="inline-block">
            <img src={lumofyLogoWhite} alt="Lumofy" className="h-9 w-auto" />
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--lx-on-dark-3))]">
            AI-powered skills intelligence platform helping organizations build future-ready workforces.
          </p>
          <Button asChild className="mt-6 h-11 rounded-full px-6 font-semibold btn-sheen">
            <Link to="/jobs">
              View Open Roles
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {/* Link groups */}
        <div className="grid grid-cols-2 gap-10 sm:gap-16 lg:gap-24">
          <nav aria-label="Careers">
            <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--lx-on-dark))]">Careers</h2>
            <ul className="space-y-3">
              <li><Link to="/jobs" className="text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lx-blue-soft))] rounded-sm">Open Positions</Link></li>
              <li><Link to="/#why" className="text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lx-blue-soft))] rounded-sm">Mission</Link></li>
              <li><Link to="/#building" className="text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lx-blue-soft))] rounded-sm">What We Build</Link></li>
              <li><Link to="/#growth" className="text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lx-blue-soft))] rounded-sm">Growth</Link></li>
            </ul>
          </nav>
          <div>
            <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--lx-on-dark))]">Get in touch</h2>
            <ul className="space-y-3">
              <li>
                <a href={`mailto:${SITE.careersEmail}`} className="flex items-center gap-2 text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lx-blue-soft))] rounded-sm">
                  <Mail className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {SITE.careersEmail}
                </a>
              </li>
              <li>
                <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lx-blue-soft))] rounded-sm">
                  <Linkedin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  LinkedIn
                  <span className="sr-only">(opens in new tab)</span>
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-[hsl(var(--lx-on-dark-3))]">
                <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                Sanabis, Bahrain
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Slim legal bar */}
      <div className="mt-14 border-t border-white/[0.08] pt-6">
        <p className="text-center text-xs text-[hsl(var(--lx-on-dark-3))] sm:text-left">
          © {new Date().getFullYear()} <span className="font-semibold text-[hsl(var(--lx-on-dark))]">Lumofy</span>. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
));
Footer.displayName = "Footer";

export default Footer;
