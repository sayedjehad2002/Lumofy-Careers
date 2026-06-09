import { Linkedin, Mail, MapPin } from "lucide-react";
import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { SITE } from "@/data/site";
import lumofyLogo from "@/assets/lumofy-mark.png";

const Footer = forwardRef<HTMLElement>((_, ref) => {
  return (
    <footer ref={ref} className="border-t border-border/50 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24 md:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-bold text-lg mb-2 text-foreground">Lumofy</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              AI-powered skills intelligence platform helping organizations build future-ready workforces.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-foreground">Careers</h4>
            <ul className="space-y-2">
              <li><Link to="/jobs" className="text-sm text-muted-foreground hover:text-primary transition-colors">Open Positions</Link></li>
              <li><Link to="/#growth" className="text-sm text-muted-foreground hover:text-primary transition-colors">Growth</Link></li>
              <li><Link to="/#principles" className="text-sm text-muted-foreground hover:text-primary transition-colors">Principles</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-foreground">Get in Touch</h4>
            <div className="space-y-2">
              <a className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors" href={`mailto:${SITE.careersEmail}`}>
                <Mail className="w-4 h-4" aria-hidden="true" />
                {SITE.careersEmail}
              </a>
              <a target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors" href="https://www.linkedin.com/company/lumofyinc/">
                <Linkedin className="w-4 h-4" aria-hidden="true" />
                LinkedIn
              </a>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                Sanabis, Bahrain
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-6 sm:flex-row">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Lumofy — home">
            <img src={lumofyLogo} alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
            <span className="text-lg font-extrabold tracking-tight text-foreground">Lumofy</span>
          </Link>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} <span className="font-semibold text-primary">Lumofy</span> — All rights reserved.
          </p>
        </div>
      </div>
    </footer>);
});
Footer.displayName = "Footer";

export default Footer;