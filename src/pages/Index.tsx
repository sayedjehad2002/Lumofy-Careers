import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/careers/Navbar";
import Footer from "@/components/careers/Footer";
import { useCareers } from "@/contexts/CareersContext";
import HomeHero from "@/components/careers/cx/HomeHero";
import { HomeBuild, HomeGrowth, HomeMission } from "@/components/careers/cx/HomeStory";
import HomeRoles from "@/components/careers/cx/HomeRoles";
import { HomeClosing, HomeHiring } from "@/components/careers/cx/HomeClosing";
import { SparkDefs } from "@/components/careers/cx/parts";
import { forgetHomeY, rememberHomeY, savedHomeY, scrollToSection, sectionOffset } from "@/components/careers/cx/scroll";
import { primeMotionMode, startCxMotion, type CxMotion } from "@/components/careers/cx/cxMotion";

type Arrival = { id: string; moved: boolean };
const USER_INPUT = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

/** Land an arrival hash again if layout has moved it (motion boot, the role list), unless the visitor has scrolled since. */
function reland(a: Arrival | null) {
  if (!a || a.moved || a.id === "top") return;
  const el = document.getElementById(a.id);
  if (el && Math.abs(el.getBoundingClientRect().top - sectionOffset()) > 12) scrollToSection(a.id, true);
}

// Careers homepage, "Path of Light" design (approved 2026-09-30). The page is complete before motion
// loads; cxMotion layers the light lines and choreography on top and cleans up on route change.
const Index = () => {
  const { hash } = useLocation();
  const { jobs, loading } = useCareers();
  const rootRef = useRef<HTMLDivElement>(null);
  const motionRef = useRef<CxMotion | null>(null);
  // HR users' context holds every job; the public page only ever lists open, non-archived ones.
  const openJobs = useMemo(() => jobs.filter((j) => j.status === "open" && !j.archivedAt), [jobs]);
  // Back/Forward to this same history entry: return to where the visitor left, not the hero or the hash
  const [returnY] = useState(savedHomeY);
  const returnTo = useRef(returnY);
  const arrival = useRef<Arrival | null>(null);

  useEffect(() => {
    document.title = "Lumofy Careers – Join Our Team";
  }, []);

  // motion mode is decided before first paint, so the hero's first frame is the intro's first frame
  useLayoutEffect(() => {
    const timer = primeMotionMode();
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;
    const motion = startCxMotion(rootRef.current);
    motionRef.current = motion;
    return () => { motion.destroy(); motionRef.current = null; };
  }, []);

  // Remember the position on this history entry when a link leaves the page (capture phase: before React Router pushes
  // the next entry), so Back can return here. In-page and external links don't count.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href]");
      if (a && a.origin === window.location.origin && a.pathname !== window.location.pathname) rememberHomeY();
    };
    root.addEventListener("click", onClick, true);
    return () => root.removeEventListener("click", onClick, true);
  }, []);

  // once the live role list has rendered, re-plan motion (already-lit elements never replay), then settle the page:
  // a Back/Forward return goes to its saved spot, a hash arrival lands again if the list pushed its section down
  useEffect(() => {
    if (loading) return;
    motionRef.current?.rebuild();
    if (returnTo.current !== null) {
      window.scrollTo({ top: returnTo.current, behavior: "instant" });
      returnTo.current = null;
      forgetHomeY();
    }
    reland(arrival.current);
  }, [loading, openJobs.length]);

  // Anchor navigation: React Router doesn't auto-scroll to hashes, so do it here. Arriving from another
  // route jumps straight to the section, then lands again once motion boot (ScrollTrigger.refresh) and the
  // role list have settled, unless the visitor has started scrolling; a hash change while here scrolls smoothly.
  const arrived = useRef(false);
  useEffect(() => {
    if (!hash) { arrived.current = true; return; }
    const id = hash.slice(1);
    if (arrived.current) { scrollToSection(id); return; }
    arrived.current = true;
    if (returnY !== null) return; // a Back/Forward return: its saved position wins over the hash
    scrollToSection(id, true);
    const a: Arrival = { id, moved: false };
    arrival.current = a;
    const moved = () => { a.moved = true; };
    USER_INPUT.forEach((t) => window.addEventListener(t, moved, { passive: true }));
    const settle = window.setTimeout(() => reland(a), 1000);
    return () => {
      window.clearTimeout(settle);
      USER_INPUT.forEach((t) => window.removeEventListener(t, moved));
      if (arrival.current === a) arrival.current = null;
    };
  }, [hash, returnY]);

  return (
    <div ref={rootRef} className="cx cx-page">
      <SparkDefs />
      <Navbar />
      <main id="main">
        <HomeHero jobs={openJobs} loading={loading} />
        <HomeMission />
        <HomeBuild />
        <HomeGrowth />
        <HomeRoles jobs={openJobs} loading={loading} />
        <HomeHiring />
        <HomeClosing />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
