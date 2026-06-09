import { Linkedin, Mail, MapPin } from "lucide-react";
import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { SITE } from "@/data/site";
import lumofyLogo from "@/assets/lumofy-mark.png";

const LINKEDIN_URL = "https://www.linkedin.com/company/lumofyinc/";

// Simplified, premium footer that flows out of the closing CTA: one brand block (logo +
// tagline), two tight link groups, and a slim copyright bar. Soft divider + surface so it
// reads as a continuation, not a hard break. (pb-24 on mobile clears the bottom nav.)
const Footer = forwardRef<HTMLElement>((_, ref) => (
  <footer ref={ref} className="border-t border-border/40 bg-card/20">
    <div className="mx-auto max-w-[1536px] px-4 pb-24 pt-14 sm:px-6 md:pb-14 lg:px-8">
      <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        {/* Brand */}
        <div className="max-w-xs">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Lumofy — home">
            <img src={lumofyLogo} alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
            <span className="text-lg font-extrabold tracking-tight text-foreground">Lumofy</span>
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            AI-powered skills intelligence platform helping organizations build future-ready workforces.
          </p>
        </div>

        {/* Link groups */}
        <div className="grid grid-cols-2 gap-10 sm:gap-16">
          <nav aria-label="Careers">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">Careers</h4>
            <ul className="space-y-2.5">
              <li><Link to="/jobs" className="text-sm text-muted-foreground transition-colors hover:text-primary">Open Positions</Link></li>
              <li><Link to="/#growth" className="text-sm text-muted-foreground transition-colors hover:text-primary">Growth</Link></li>
            </ul>
          </nav>
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">Get in touch</h4>
            <ul className="space-y-2.5">
              <li>
                <a href={`mailto:${SITE.careersEmail}`} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
                  <Mail className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {SITE.careersEmail}
                </a>
              </li>
              <li>
                <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
                  <Linkedin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  LinkedIn
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                Sanabis, Bahrain
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Slim copyright bar */}
      <div className="mt-12 border-t border-border/40 pt-6">
        <p className="text-center text-xs text-muted-foreground sm:text-left">
          © {new Date().getFullYear()} <span className="font-semibold text-foreground">Lumofy</span>. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
));
Footer.displayName = "Footer";

export default Footer;
