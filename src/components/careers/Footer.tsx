import { Linkedin, Mail, MapPin } from "lucide-react";
import { forwardRef } from "react";
import { SITE } from "@/data/site";

const Footer = forwardRef<HTMLElement>((_, ref) => {
  return (
    <footer ref={ref} className="border-t border-border/50 bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 py-12 pb-24 md:pb-12">
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
              <li><a href="/jobs" className="text-sm text-muted-foreground hover:text-primary transition-colors">Open Positions</a></li>
              <li><a href="/life" className="text-sm text-muted-foreground hover:text-primary transition-colors">Life at Lumofy</a></li>
              <li><a href="/benefits" className="text-sm text-muted-foreground hover:text-primary transition-colors">Benefits</a></li>
              <li><a href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">About Us</a></li>
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

        <div className="border-t border-border/50 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Lumofy. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a>
            <a href="/terms" className="text-xs text-muted-foreground hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>);
});
Footer.displayName = "Footer";

export default Footer;