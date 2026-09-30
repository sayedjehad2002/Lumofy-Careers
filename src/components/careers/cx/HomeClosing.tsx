import type { MouseEvent } from "react";
import { CxIcon, type CxIconName } from "./icons";
import { Eyebrow, Spark } from "./parts";
import { scrollToSection } from "./scroll";

const LINKEDIN_URL = "https://www.linkedin.com/company/lumofyinc/";

// The four real hiring steps (the same ones the apply success screen lists).
const PROCESS: { icon: CxIconName; title: string; text: string }[] = [
  { icon: "file-text", title: "Apply", text: "Send your CV and, for most roles, answer a few short questions. PDF CVs work best." },
  { icon: "chats-circle", title: "Intro call", text: "A first conversation about you, the role and what you want next." },
  { icon: "users-three", title: "Meet the team", text: "Interview with the people you'd work with and see how the team works." },
  { icon: "handshake", title: "Offer", text: "If it's a match on both sides, we make you an offer." },
];

export function HomeHiring() {
  return (
    <section className="cx-band cx-band--halo cx-hiring" id="hiring" aria-labelledby="hiring-title">
      <div className="cx-wrap">
        <header className="cx-sec-head">
          <Eyebrow>How We Hire</Eyebrow>
          <h2 className="cx-sec-title" id="hiring-title">A clear path from hello <em>to offer.</em></h2>
        </header>
        <ol className="cx-process" role="list">
          {PROCESS.map((s, i) => (
            <li className="cx-process__step" key={s.title}>
              <span className="cx-process__node" aria-hidden="true"><CxIcon name={s.icon} /></span>
              <span className="cx-process__n">Step {i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
        {/* Same promise the apply success screen makes today; Talent team to confirm before launch. */}
        <p className="cx-hiring__note"><CxIcon name="clock" />After you apply, you'll hear back from us within five business days.</p>
      </div>
    </section>
  );
}

// Dark closing card: the trail arrives at the sparkle inside a fine orbit ring (the echo of the hero).
export function HomeClosing() {
  const toRoles = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (scrollToSection("roles")) e.preventDefault();
  };
  return (
    <section className="cx-band cx-band--paper cx-closing-wrap" id="join" aria-labelledby="closing-title">
      <div className="cx-wrap">
        <div className="cx-closing" data-inview-watch data-closing>
          <span className="cx-closing__grid" aria-hidden="true" />
          <div className="cx-closing__copy">
            <Eyebrow dark>Careers at Lumofy</Eyebrow>
            <h2 className="cx-closing__title" id="closing-title">Some careers follow change. <em>Others create it.</em></h2>
            <p className="cx-closing__text">Join the team building the systems that help organizations understand, develop and grow their people.</p>
            <div className="cx-closing__ctas">
              <a className="cx-btn cx-btn--primary cx-btn--lg" href="#roles" onClick={toRoles}>
                Explore open roles<CxIcon name="arrow-right" className="cx-nudge" />
              </a>
              <a className="cx-btn cx-btn--ghost-dark cx-btn--lg" href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
                <CxIcon name="linkedin-logo" />Follow Lumofy on LinkedIn<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </div>
          <div className="cx-closing__art" aria-hidden="true">
            <svg className="cx-ribbon" data-ribbon="closing" />
            <span className="cx-closing-halo" />
            <Spark className="cx-spark cx-closing-spark" />
            <Spark className="cx-twinkle cx-tw-4" />
            <Spark className="cx-twinkle cx-tw-5" />
          </div>
        </div>
      </div>
    </section>
  );
}
