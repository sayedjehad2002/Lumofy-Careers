import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { prefersReducedMotion } from "@/lib/motion";
import bizz from "@/assets/brand/awards/bizz.webp";
import internationalFinance from "@/assets/brand/awards/international-finance.webp";
import holoniq from "@/assets/brand/awards/holoniq.webp";
import gitex from "@/assets/brand/awards/gitex-future-stars.webp";
import globalBusiness from "@/assets/brand/awards/global-business-outlook.webp";
import startupBahrain from "@/assets/brand/awards/startup-bahrain.webp";

// The main site's award bar, careers edition — the recognition logos from
// lumofy.ai in a slow marquee at the foot of the dark hero canvas. Decorative
// duplicate track is aria-hidden; motion pauses off-screen and under
// prefers-reduced-motion (falls back to a static wrapped row).
const AWARDS = [
  { src: bizz, alt: "The Bizz Award" },
  { src: internationalFinance, alt: "International Finance Award" },
  { src: holoniq, alt: "HolonIQ" },
  { src: gitex, alt: "GITEX Future Stars" },
  { src: globalBusiness, alt: "Global Business Outlook Award" },
  { src: startupBahrain, alt: "Startup Bahrain" },
];

const Track = ({ hidden = false }: { hidden?: boolean }) => (
  <div className="flex shrink-0 items-center gap-14 pr-14" aria-hidden={hidden || undefined}>
    {AWARDS.map((a) => (
      <img
        key={a.alt}
        src={a.src}
        alt={hidden ? "" : a.alt}
        className="h-9 w-auto opacity-60 transition-opacity duration-300 hover:opacity-100"
        loading="lazy"
      />
    ))}
  </div>
);

const AwardsMarquee = () => {
  const reduced = prefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative z-10 border-t border-white/[0.07]">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-5 px-4 py-7 sm:flex-row sm:gap-10 sm:px-6 lg:px-8">
        <p className="shrink-0 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--lx-on-dark-3))]">
          An award-winning team
        </p>
        {reduced ? (
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {AWARDS.map((a) => (
              <img key={a.alt} src={a.src} alt={a.alt} className="h-9 w-auto opacity-60" loading="lazy" />
            ))}
          </div>
        ) : (
          <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
            <motion.div
              className="flex w-max"
              animate={active ? { x: ["0%", "-50%"] } : undefined}
              transition={{ duration: 32, ease: "linear", repeat: Infinity }}
            >
              <Track />
              <Track hidden />
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AwardsMarquee;
