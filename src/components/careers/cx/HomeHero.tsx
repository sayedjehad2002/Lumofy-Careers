import type { MouseEvent } from "react";
import type { Job } from "@/types/careers";
import { pickHeroRole, teamCounts } from "@/lib/roleFinder";
import personaStar from "@/assets/brand/careers/persona-star.webp";
import personaStar600 from "@/assets/brand/careers/persona-star-600.webp";
import personaStar1040 from "@/assets/brand/careers/persona-star-1040.webp";
import { CxIcon } from "./icons";
import { AiStar, Spark } from "./parts";
import { scrollToSection } from "./scroll";

// React 18 does not know fetchPriority; the lowercase HTML attribute passes through untouched.
const LCP_HINT = { fetchpriority: "high" } as Record<string, string>;
// The portrait's rendered width (cx.css --pw), slightly rounded up: 29.375rem two-column, 32.5rem from 1800px, and
// past 1920px the whole page scales with the screen (32.5rem = 27vw there). sizes can't see that root scaling, hence vw.
const PORTRAIT_SRCSET = `${personaStar600} 600w, ${personaStar1040} 1040w, ${personaStar} 1800w`;
const PORTRAIT_SIZES = "(min-width: 1921px) 28vw, (min-width: 1800px) 540px, (min-width: 1024px) 480px, 80vw";

const onAnchor = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
  if (scrollToSection(id)) e.preventDefault();
};

// Dark bookend. The trail rises from the featured role card to the sparkle: the open role is the
// start of the path. Every fact here is live (role counts, featured role) or sourced (lumofy.ai).
export default function HomeHero({ jobs, loading }: { jobs: Job[]; loading: boolean }) {
  const hero = pickHeroRole(jobs);
  const nTeams = teamCounts(jobs).length;

  return (
    <section className="cx-hero" id="top" data-inview-watch aria-labelledby="hero-title">
      <div className="cx-hero__bg" aria-hidden="true">
        <span className="cx-hero__grid" />
        <span className="cx-hero__floor" />
        <span className="cx-hero__glow" />
      </div>
      <div className="cx-wrap cx-hero__in">
        <div className="cx-hero__copy">
          <p className="cx-eyebrow cx-eyebrow--dark">
            <AiStar className="cx-eyebrow__star" />
            Careers at Lumofy
          </p>
          <h1 className="cx-hero__title" id="hero-title">
            {/* three fixed lines, so the headline breaks the same way on every screen */}
            <span className="cx-hero-line">Build what helps</span>
            <span className="cx-hero-line">people <em>grow</em></span>
            <span className="cx-hero-line">at work.</span>
          </h1>
          <p className="cx-hero-lead">
            Lumofy is the AI-powered workforce performance and development platform that helps organizations measure
            performance, build capabilities and mobilize their people. Join the team building it, in Manama, Riyadh and remote.
          </p>
          <div className="cx-hero-ctas">
            <a className="cx-btn cx-btn--primary cx-btn--lg" href="#roles" onClick={onAnchor("roles")}>
              View open roles
              <CxIcon name="arrow-right" className="cx-nudge" />
            </a>
            <a className="cx-btn cx-btn--ghost-dark cx-btn--lg" href="#build" onClick={onAnchor("build")}>
              See what we build
            </a>
          </div>
          <p className="cx-hero-readout">
            {loading ? (
              <span>Loading open roles…</span>
            ) : jobs.length ? (
              <span>
                <span className="cx-hero-readout__n">{jobs.length}</span> open {jobs.length === 1 ? "role" : "roles"} across{" "}
                <span className="cx-hero-readout__n">{nTeams}</span> {nTeams === 1 ? "team" : "teams"}
              </span>
            ) : (
              <span>No open roles right now</span>
            )}
            <span className="cx-hero-readout__sep" aria-hidden="true" />
            <span>
              Manama <span className="cx-dot" aria-hidden="true" /> Riyadh <span className="cx-dot" aria-hidden="true" /> Remote
            </span>
          </p>
        </div>

        <div className="cx-hero__visual">
          <div className="cx-persona">
            <svg className="cx-ribbon cx-ribbon--hero" data-ribbon="hero" aria-hidden="true" focusable="false" />
            <span className="cx-hero-halo" aria-hidden="true" />
            <Spark className="cx-spark cx-hero-spark" />
            <img className="cx-persona__img" src={personaStar} srcSet={PORTRAIT_SRCSET} sizes={PORTRAIT_SIZES} alt="" width={1800} height={2182} decoding="async" {...LCP_HINT} />
            <Spark className="cx-twinkle cx-tw-1" />
            <Spark className="cx-twinkle cx-tw-2" />
            <Spark className="cx-twinkle cx-tw-3" />

            {hero && (
              <div className="cx-float cx-float--role">
                <span className="cx-float__label">
                  <span className="cx-float__dot" aria-hidden="true" />
                  Hiring in {hero.department}
                </span>
                <span className="cx-float__title">{hero.title}</span>
                <span className="cx-float__meta cx-float__facts">
                  <span><CxIcon name="map-pin" />{hero.location}</span>
                  <span><CxIcon name="clock" />{hero.type}</span>
                </span>
              </div>
            )}
            <div className="cx-float cx-float--ai">
              <span className="cx-float__label cx-float__label--ai">
                <Spark className="cx-spark cx-spark--xs" />
                Lumofy AI
              </span>
              <span className="cx-float__title">Goals and KPIs drafted in minutes, not months</span>
            </div>
            <div className="cx-float cx-float--where">
              <span className="cx-float__icon" aria-hidden="true">
                <CxIcon name="globe-hemisphere-east" />
              </span>
              <span className="cx-float__stack">
                <span className="cx-float__title">
                  Manama <span className="cx-dot" aria-hidden="true" /> Riyadh <span className="cx-dot" aria-hidden="true" /> Remote
                </span>
                <span className="cx-float__meta cx-mono">
                  Sun–Thu <span className="cx-dot" aria-hidden="true" /> UTC+3
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
