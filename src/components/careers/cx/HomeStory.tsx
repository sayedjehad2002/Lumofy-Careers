import type { CSSProperties, MouseEvent } from "react";
import teamMeeting from "@/assets/brand/careers/team-meeting.webp";
import { CxIcon, type CxIconName } from "./icons";
import { Eyebrow, Spark } from "./parts";
import { scrollToSection } from "./scroll";

const vars = (v: Record<string, number>) => v as unknown as CSSProperties;

// ---------- Why Lumofy exists (Halo band) ----------
// The statement is proposed wording: Lumofy has no official mission statement yet (needs sign-off).
// Sourced: Lumofy company profile p19 and lumofy.ai "Proven Impact". Do not round or restate.
const PROOF = [
  { value: "100k+", label: "performance reviews completed" },
  { value: "50k+", label: "performance goals managed" },
  { value: "113k+", label: "courses completed" },
];

export function HomeMission() {
  return (
    <section className="cx-band cx-band--halo cx-mission" id="mission" aria-labelledby="mission-title">
      <span className="cx-band__grid" aria-hidden="true" />
      <div className="cx-wrap cx-mission__in">
        <Eyebrow decorative>Why Lumofy Exists</Eyebrow>
        <h2 className="sr-only" id="mission-title">Why Lumofy exists</h2>
        <div className="cx-mission__body">
          <div className="cx-statement-wrap">
            <div className="cx-mission__rail" aria-hidden="true">
              <svg className="cx-ribbon" data-ribbon="mission" />
            </div>
            <p className="cx-statement">
              <span className="cx-lit">Most organizations don't lack talent.</span>{" "}
              <span className="cx-lit">They lack a clear view of it.</span>{" "}
              <span className="cx-lit">
                Lumofy makes capability visible, measurable and <em>ready to act on.</em>
              </span>
            </p>
          </div>
          <div className="cx-mission__aside">
            <div className="cx-chain" role="group" aria-label="The problem, as Lumofy sees it">
              <span className="cx-chain__step">No visibility</span>
              <span className="cx-chain__step">Poor decisions</span>
              <span className="cx-chain__step cx-chain__step--end">Business cost</span>
              <p className="cx-chain__verdict">The problem isn't resources. It's visibility.</p>
            </div>
            {/* Sourced: Lumofy company profile p19 and lumofy.ai "Proven Impact". */}
            <div className="cx-proof">
              <p className="cx-proof__lead">Organizations across the region rely on Lumofy</p>
              <dl className="cx-proof__list">
                {PROOF.map((f) => (
                  <div key={f.label}>
                    <dt>{f.value}</dt>
                    <dd>{f.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- What we build (white band) ----------
const CAPS: { icon: CxIconName; verb: string; name: string; text: string; tags: string[]; mock: JSX.Element }[] = [
  {
    icon: "chart-line-up", verb: "The core", name: "Performance Management System",
    text: "Set goals, measure performance and drive accountability through KPIs, reviews and continuous feedback.",
    tags: ["Goals & KPIs", "360° reviews", "9-box grid", "Calibration"],
    mock: (
      <div className="cx-mock cx-mock--goals" aria-hidden="true">
        {([["Regional pipeline", 0.78], ["Onboarding path", 0.54], ["Review cycle", 0.92]] as const).map(([l, v]) => (
          <div className="cx-mock__row" key={l}><span className="cx-mock__label">{l}</span><span className="cx-bar"><span style={vars({ "--v": v })} /></span></div>
        ))}
      </div>
    ),
  },
  {
    icon: "tree-structure", verb: "Defines", name: "Competency Framework",
    text: "Define the skills, behaviors and job architecture every role needs, as one shared foundation for talent decisions.",
    tags: ["Proficiency levels", "Behavioral indicators", "Job descriptions"],
    mock: (
      <div className="cx-mock cx-mock--levels" aria-hidden="true">
        {([["Communication", 4], ["Data literacy", 3], ["Coaching others", 2]] as const).map(([l, n]) => (
          <div className="cx-mock__row" key={l}><span className="cx-mock__label">{l}</span><span className={`cx-lv cx-lv--${n}`}><i /><i /><i /><i /><i /></span></div>
        ))}
      </div>
    ),
  },
  {
    icon: "graduation-cap", verb: "Builds", name: "Learning & Development Plans",
    text: "Close gaps with personalized development plans, mapped straight to each person's competencies, in English and Arabic.",
    tags: ["PDP & PIP", "ENG & AR", "Custom content"],
    mock: (
      <div className="cx-mock cx-mock--plan" aria-hidden="true">
        {([["Negotiation basics", "EN", true], ["Leading teams", "AR", true], ["Coaching", "EN", false]] as const).map(([l, lang, done]) => (
          <div className="cx-mock__row" key={l}>
            {done ? <span className="cx-tick"><CxIcon name="check" /></span> : <span className="cx-tick cx-tick--todo" />}
            <span className="cx-mock__label">{l}</span>
            <span className="cx-pill-mini">{lang}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: "heartbeat", verb: "Sustains", name: "Engagement & eNPS",
    text: "Gain continuous visibility into satisfaction, loyalty and engagement through pulse surveys and eNPS.",
    tags: ["Pulse surveys", "eNPS", "Custom surveys"],
    mock: (
      <div className="cx-mock cx-mock--pulse" aria-hidden="true">
        <div className="cx-cols">{[0.46, 0.62, 0.55, 0.74, 0.68, 0.86, 0.8].map((h, i) => <i key={i} style={vars({ "--h": h })} />)}</div>
        <span className="cx-mock__label">Weekly pulse</span>
      </div>
    ),
  },
];

export function HomeBuild() {
  // Same in-page jump as the hero and closing buttons; modified clicks are left to the browser.
  const toRoles = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (scrollToSection("roles")) e.preventDefault();
  };
  return (
    <section className="cx-band cx-band--paper cx-build" id="build" aria-labelledby="build-title">
      <div className="cx-wrap">
        <header className="cx-sec-head">
          <Eyebrow>What We Build</Eyebrow>
          <h2 className="cx-sec-title" id="build-title">One platform for how organizations <em>grow</em> their people.</h2>
          <p className="cx-sec-sub">
            Four connected systems, with Lumofy AI working across all of them. Engineers and product people build them; sales,
            marketing and customer success bring them to clients across the region.
          </p>
        </header>

        <div className="cx-build__rail" aria-hidden="true">
          <svg className="cx-ribbon" data-ribbon="build" />
          {CAPS.map((_, i) => <span className="cx-node" data-node={i} key={i} />)}
        </div>

        <ul className="cx-caps" role="list" data-ring-grid>
          {CAPS.map((c, i) => (
            <li className="cx-cap" data-cap={i} key={c.name}>
              <div className="cx-cap__top">
                <span className="cx-chip-ic"><CxIcon name={c.icon} trace /></span>
                {/* Numbered so the four read as the sequence the line above draws. */}
                <span className="cx-cap__verb"><b>0{i + 1}</b>{c.verb}</span>
              </div>
              <h3 className="cx-cap__name">{c.name}</h3>
              <p className="cx-cap__text">{c.text}</p>
              {c.mock}
              <ul className="cx-tags" role="list">{c.tags.map((t) => <li key={t}>{t}</li>)}</ul>
            </li>
          ))}
        </ul>

        <div className="cx-ai" data-ai>
          <div className="cx-ai__copy">
            <p className="cx-ai__label"><Spark className="cx-spark cx-ai__spark" />Lumofy AI</p>
            <h3 className="cx-ai__title">AI agents that draft the groundwork in minutes, not months.</h3>
            <p className="cx-ai__text">
              Four agents cover competencies, performance, assessments, and talent and potential. They read an organization's
              strategy, structure and KPIs, then draft frameworks, goals and assessments for people to review.
            </p>
            {/* The section's next step for a candidate: from what we build to who builds it. */}
            <a className="cx-btn cx-btn--ghost-dark cx-ai__cta" href="#roles" onClick={toRoles}>
              See the roles building this
              <CxIcon name="arrow-right" className="cx-nudge" />
            </a>
          </div>
          <ol className="cx-gen" aria-label="What Lumofy AI generates">
            {["Generating skills", "Generating goals & KPIs", "Generating assessments & insights"].map((t) => (
              <li className="cx-gen__row" key={t}>
                <span className="cx-gen__name">{t}</span>
                <span className="cx-gen__bar"><span /></span>
                <span className="cx-gen__ok"><CxIcon name="check" /></span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

// ---------- Growth (Halo band) ----------
// Card wording is carried over from the live careers site; People & Culture to confirm specifics.
const STEPS: { icon: CxIconName; title: string; text: string }[] = [
  { icon: "flag-banner", title: "Own real problems", text: "Your ideas can shape the product, the team and the way we build." },
  { icon: "books", title: "Keep learning", text: "Support for courses, conferences, certifications and continuous skill-building." },
  { icon: "rocket-launch", title: "Take on bigger challenges", text: "Clear paths, mentorship and room to grow into bigger scope." },
  { icon: "plant", title: "Grow sustainably", text: "Flexible ways of working where the role allows, at a pace built for real life." },
];
const FACTS: { icon: CxIconName; title: string; text: string; mono?: boolean }[] = [
  { icon: "calendar-dots", title: "Sunday to Thursday", text: "Bahrain time, UTC+3", mono: true },
  { icon: "buildings", title: "Offices in Manama and Riyadh", text: "Headquarters in Manama, Bahrain" },
  { icon: "laptop", title: "Remote where the role allows", text: "Each role lists where it's based" },
  { icon: "globe-hemisphere-east", title: "Built for the region", text: "Product and content in English and Arabic" },
];

export function HomeGrowth() {
  return (
    <section className="cx-band cx-band--mist cx-growth" id="growth" aria-labelledby="growth-title">
      <span className="cx-band__grid" aria-hidden="true" />
      <div className="cx-wrap">
        <header className="cx-sec-head cx-sec-head--split">
          <div>
            <Eyebrow>Growth at Lumofy</Eyebrow>
            <h2 className="cx-sec-title" id="growth-title">Grow into the <em>future.</em></h2>
          </div>
          <p className="cx-sec-sub">We build growth systems for other organizations. Here is what growth looks like on our own team.</p>
        </header>

        <div className="cx-stairs">
          <svg className="cx-ribbon" data-ribbon="growth" aria-hidden="true" focusable="false" />
          <ol className="cx-steps" role="list">
            {STEPS.map((s, i) => (
              <li className="cx-step" style={vars({ "--i": i })} key={s.title}>
                <span className={"cx-step__node" + (i === STEPS.length - 1 ? " cx-step__node--aurora" : "")} aria-hidden="true">
                  <Spark className="cx-spark" />
                </span>
                <div className="cx-step__card">
                  <span className="cx-chip-ic cx-chip-ic--soft"><CxIcon name={s.icon} trace /></span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="cx-how">
          <figure className="cx-how__photo">
            <img src={teamMeeting} alt="Two colleagues working at their desks in a bright office" width={1000} height={667} loading="lazy" decoding="async" />
          </figure>
          <div className="cx-how__facts">
            <h3 className="cx-how__title">How we work</h3>
            <ul className="cx-facts" role="list">
              {FACTS.map((f) => (
                <li key={f.title}>
                  <CxIcon name={f.icon} />
                  <span>
                    <strong>{f.title}</strong>
                    <span className={f.mono ? "cx-mono" : undefined}>{f.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
