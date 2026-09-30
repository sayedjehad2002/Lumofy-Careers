import { useLayoutEffect, useMemo, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import type { Job } from "@/types/careers";
import { SITE } from "@/data/site";
import { ALL_ROLES, formatRoleDate, groupRolesByTeam, isNewRole, matchesRole, regionsOf, teamCounts, type RoleFilter } from "@/lib/roleFinder";
import { getGsap } from "./gsapLoader";
import { CxIcon } from "./icons";
import { Eyebrow, Spark } from "./parts";

const REGIONS: { id: RoleFilter["region"]; label: string }[] = [
  { id: "any", label: "Any location" },
  { id: "bahrain", label: "Bahrain" },
  { id: "ksa", label: "Saudi Arabia" },
  { id: "remote", label: "Remote" },
];
type FlipState = ReturnType<NonNullable<ReturnType<typeof getGsap>>["Flip"]["getState"]>;

// The working surface: search, location and team filters over the live open roles, grouped by team.
// Rows open the real job page (/jobs/:id), which keeps apply, JD download and sharing in one place.
export default function HomeRoles({ jobs, loading }: { jobs: Job[]; loading: boolean }) {
  const [filter, setFilter] = useState<RoleFilter>(ALL_ROLES);
  const boardRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const sparkRef = useRef<SVGSVGElement>(null);
  const flipRef = useRef<FlipState | null>(null);

  const teams = useMemo(() => teamCounts(jobs), [jobs]);
  const shown = useMemo(() => jobs.filter((j) => matchesRole(j, filter)), [jobs, filter]);
  const groups = useMemo(() => groupRolesByTeam(shown), [shown]);
  const active = filter.team !== "all" || filter.region !== "any" || !!filter.q;
  const now = useMemo(() => new Date(), []);

  // Flip: remember where rows were before a filter change, then animate them to where they are now
  const update = (next: Partial<RoleFilter>) => {
    const g = getGsap();
    const rows = boardRef.current?.querySelectorAll(".cx-role");
    if (g && rows?.length && document.documentElement.dataset.motion === "full") flipRef.current = g.Flip.getState(rows);
    sparkRef.current?.classList.remove("is-on");
    setFilter((f) => ({ ...f, ...next }));
  };
  useLayoutEffect(() => {
    const g = getGsap(), state = flipRef.current;
    flipRef.current = null;
    if (!g || !boardRef.current) return;
    // no rows to animate from (e.g. an empty result being cleared): still re-measure, the list height has changed
    if (!state) { g.ScrollTrigger.refresh(); return; }
    g.Flip.from(state, {
      targets: boardRef.current.querySelectorAll(".cx-role"),
      duration: 0.28, ease: "power4.out",
      onEnter: (els) => g.gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none" }),
      onComplete: () => g.ScrollTrigger.refresh(),
    });
  }, [filter]);

  const clear = () => { update(ALL_ROLES); searchRef.current?.focus(); };

  // "you are here" sparkle on the rail follows hover and keyboard focus
  const moveSpark = (link: Element | null) => {
    if (!link || !railRef.current || !sparkRef.current) return;
    const r = link.getBoundingClientRect(), rr = railRef.current.getBoundingClientRect();
    sparkRef.current.style.transform = `translateY(${(r.top + r.height / 2 - rr.top - 10).toFixed(0)}px)`;
    sparkRef.current.classList.add("is-on");
  };
  const hideSpark = () => sparkRef.current?.classList.remove("is-on");
  const onOver = (e: PointerEvent<HTMLDivElement>) => { if (e.pointerType === "mouse") moveSpark((e.target as Element).closest(".cx-role__link")); };
  const onFocus = (e: FocusEvent<HTMLDivElement>) => moveSpark((e.target as Element).closest(".cx-role__link"));
  const onBlur = (e: FocusEvent<HTMLDivElement>) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) hideSpark(); };

  const nTeams = teams.length;
  return (
    <section className="cx-band cx-band--paper cx-roles" id="roles" aria-labelledby="roles-title">
      <div className="cx-wrap">
        <header className="cx-sec-head cx-sec-head--split">
          <div>
            <Eyebrow>Open Roles</Eyebrow>
            <h2 className="cx-sec-title" id="roles-title">Find your place on the <em>path.</em></h2>
          </div>
          <p className="cx-sec-sub">
            {loading ? (
              "Loading open roles…"
            ) : jobs.length ? (
              <>
                <strong>{jobs.length} open {jobs.length === 1 ? "role" : "roles"} across {nTeams} {nTeams === 1 ? "team" : "teams"}</strong>, in Bahrain,
                Saudi Arabia and remote. Grouped by team, newest first.
              </>
            ) : (
              "No roles are open right now. New roles open often, and you can always introduce yourself below."
            )}
          </p>
        </header>

        {(loading || jobs.length > 0) && (
          <>
            <div className="cx-finder" role="search">
              <label className="cx-search" htmlFor="role-q">
                <span className="sr-only">Search roles</span>
                <CxIcon name="magnifying-glass" />
                <input
                  id="role-q" ref={searchRef} type="search" placeholder="Search by role, team or location" autoComplete="off" spellCheck={false}
                  value={filter.q}
                  onChange={(e) => update({ q: e.target.value /* as typed; matchesRole ignores case */ })}
                  onKeyDown={(e) => { if (e.key === "Escape" && filter.q) { e.stopPropagation(); update({ q: "" }); } }}
                />
              </label>
              <div className="cx-seg" role="group" aria-label="Location">
                {REGIONS.map((r) => (
                  <button key={r.id} type="button" className={"cx-seg__btn" + (filter.region === r.id ? " is-on" : "")} aria-pressed={filter.region === r.id} onClick={() => update({ region: r.id })}>
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="cx-chips" role="group" aria-label="Team">
                <button type="button" className={"cx-chip" + (filter.team === "all" ? " is-on" : "")} aria-pressed={filter.team === "all"} onClick={() => update({ team: "all" })}>
                  All teams <span className="cx-chip__n">{jobs.length}</span>
                </button>
                {teams.map((t) => (
                  <button key={t.team} type="button" className={"cx-chip" + (filter.team === t.team ? " is-on" : "")} aria-pressed={filter.team === t.team} onClick={() => update({ team: t.team })}>
                    {t.team} <span className="cx-chip__n">{t.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="cx-roles__status">
              <p className="cx-status" role="status" aria-live="polite">
                {loading ? "" : shown.length === jobs.length ? `Showing all ${jobs.length} roles` : `Showing ${shown.length} of ${jobs.length} roles`}
              </p>
              {active && <button type="button" className="cx-linkbtn" onClick={clear}>Clear filters</button>}
            </div>

            <div className="cx-board" data-ring-grid ref={boardRef} onPointerOver={onOver} onPointerLeave={hideSpark} onFocus={onFocus} onBlur={onBlur}>
              <span className="cx-board__rail" aria-hidden="true" ref={railRef}>
                <span className="cx-board__line" />
                <Spark className="cx-spark cx-board__spark" ref={sparkRef} />
              </span>
              {loading ? (
                <div className="cx-groups" aria-hidden="true">
                  <div className="cx-group__list">{[0, 1, 2].map((i) => <div className="cx-loading-row" key={i} />)}</div>
                </div>
              ) : (
                <ul className="cx-groups" role="list">
                  {groups.map((g) => (
                    <li className="cx-group" key={g.team}>
                      <h3 className="cx-group__head"><span>{g.team}</span><span className="cx-group__count">{g.roles.length}</span></h3>
                      <ul className="cx-group__list" role="list">
                        {g.roles.map((r) => (
                          <li className="cx-role" data-flip-id={r.id} key={r.id}>
                            <Link className="cx-role__link" to={`/jobs/${r.id}`}>
                              <span className="cx-role__main">
                                <span className="cx-role__title">{r.title}</span>
                                <span className="cx-role__meta">
                                  <span><CxIcon name="map-pin" />{r.location}</span>
                                  <span><CxIcon name="clock" />{r.type}</span>
                                  {r.postedDate && <span>Posted {formatRoleDate(r.postedDate)}</span>}
                                  {r.deadline && <span className="cx-role__due">Apply by {formatRoleDate(r.deadline)}</span>}
                                </span>
                              </span>
                              <span className="cx-role__tags">
                                {isNewRole(r.postedDate, now) && <span className="cx-badge cx-badge--new">New</span>}
                                {regionsOf(r.location).includes("remote") && !/^remote$/i.test(r.location.trim()) && <span className="cx-badge">Remote</span>}
                              </span>
                              <span className="cx-role__cta">View role<CxIcon name="arrow-right" className="cx-nudge" /></span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
              {!loading && shown.length === 0 && (
                <div className="cx-empty">
                  <span className="cx-empty__ic" aria-hidden="true"><CxIcon name="magnifying-glass" /></span>
                  <p className="cx-empty__title">No roles match these filters</p>
                  <p className="cx-empty__text">Try another team or location, or clear the filters to see all {jobs.length} roles.</p>
                  <button type="button" className="cx-btn cx-btn--secondary" onClick={clear}>Clear filters</button>
                </div>
              )}
            </div>
          </>
        )}

        <div className="cx-open-app">
          <span className="cx-chip-ic cx-chip-ic--soft" aria-hidden="true"><CxIcon name="envelope-simple" /></span>
          <div>
            <p className="cx-open-app__title">Don't see your role?</p>
            <p className="cx-open-app__text">
              Introduce yourself. Send your CV to <span className="cx-mono">{SITE.careersEmail}</span> and tell us where you'd add the most value.
            </p>
          </div>
          <a className="cx-btn cx-btn--secondary cx-btn--sm" href={`mailto:${SITE.careersEmail}`}>
            <CxIcon name="envelope-simple" />Email your CV
          </a>
        </div>
        <p className="cx-snapshot">
          Want to save roles or share a filtered list? <Link className="cx-linkbtn" to="/jobs">Open the jobs page</Link>
        </p>
      </div>
    </section>
  );
}
