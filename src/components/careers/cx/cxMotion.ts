// Motion for the careers homepage ("Path of Light"). Ported from the approved concept.
// Rules it keeps: light moves, text does not; every one-shot plays once (data-lit guards it);
// every element's finished look is its default, and motion only primes what it is about to light;
// nothing repeats, so no pause control is needed; the OS reduced-motion setting turns it all off live.
import { loadGsap, type GsapBundle } from "./gsapLoader";
import { drawLine, setHead, type Line } from "./lightLines";

type Timeline = ReturnType<GsapBundle["gsap"]["timeline"]>;
type Context = ReturnType<GsapBundle["gsap"]["context"]>;

// GSAP has exact Penner equivalents of the CSS tokens (power4 = quint, power2 = cubic).
const EASE = { glide: "power4.out", arrive: "expo.out", orbit: "power2.inOut", depart: "power2.in" };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Decide motion mode before first paint. Call from a layout effect on the careers home page. */
export function primeMotionMode() {
  const d = document.documentElement;
  const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const save = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  d.dataset.motion = rm ? "reduce" : "full";
  d.dataset.tier = window.matchMedia("(pointer: coarse)").matches || save || (navigator.hardwareConcurrency || 8) <= 4 ? "lite" : "full";
  if (!rm) d.dataset.hero = "pending";
  else delete d.dataset.hero;
  // never wait long for the engine: after 1.2s the hero simply shows its finished state
  return window.setTimeout(() => { if (d.dataset.hero === "pending") d.dataset.hero = "skip"; }, 1200);
}

export interface CxMotion {
  /** Redraw nothing, re-plan motion (e.g. after the role list renders). Lit elements never replay. */
  rebuild(): void;
  destroy(): void;
}

export function startCxMotion(root: HTMLElement): CxMotion {
  const d = document.documentElement;
  const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = root) => r.querySelector<T>(s);
  const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = root) => Array.from(r.querySelectorAll<T>(s));
  const full = () => d.dataset.motion === "full";
  const lite = () => d.dataset.tier === "lite";
  const wide = () => window.matchMedia("(min-width: 1024px)").matches;
  const below = (el: Element, pct = 0.9) => el.getBoundingClientRect().top > window.innerHeight * pct;
  const RM = window.matchMedia("(prefers-reduced-motion: reduce)");

  let destroyed = false;
  let B: GsapBundle | null = null;
  let heroTl: Timeline | null = null;
  let ctx: Context | null = null;
  let closingSheen: Timeline | null = null;
  let heroRedraw = false;
  const lines: Record<string, Line | undefined> = {};
  const cleanups: Array<() => void> = [];

  const has = (t: Element[] | Element | null) => (Array.isArray(t) ? t.length > 0 : !!t);
  const gset = (t: Element[] | Element | null, v: object) => { if (B && has(t)) B.gsap.set(t as never, v); };
  const gto = (t: Element[] | Element | null, v: object) => { if (B && has(t)) B.gsap.to(t as never, v); };

  // ---------- lines ----------
  const drawAll = (skipHero = false) => {
    $$<SVGSVGElement>("svg[data-ribbon]").forEach((s) => {
      const name = s.dataset.ribbon || "";
      if (skipHero && name === "hero") return;
      lines[name] = drawLine(root, s) || undefined;
    });
  };

  // ---------- hero intro (plays once, never late) ----------
  function heroIntro() {
    if (!B || !full() || d.dataset.hero !== "pending") return;
    const { gsap } = B;
    const rb = lines.hero;
    const blur = lite() ? "blur(0px)" : "blur(6px)";
    const text = $$(".cx-hero-line, .cx-hero-lead, .cx-hero-ctas > *, .cx-hero-readout, .cx-persona__img, .cx-float, .cx-hero-spark, .cx-hero-halo");
    heroTl = gsap.timeline({
      onComplete() {
        d.dataset.hero = "done";
        gsap.set(text, { clearProps: "opacity,transform,filter" });
        if (rb) gsap.set(rb.paths, { clearProps: "opacity" });
        if (heroRedraw) { heroRedraw = false; const s = $<SVGSVGElement>('svg[data-ribbon="hero"]'); if (s) lines.hero = drawLine(root, s) || undefined; }
      },
    });
    heroTl
      .fromTo($$(".cx-hero__glow"), { opacity: 0.55 }, { opacity: 1, duration: 1.2, ease: EASE.arrive }, 0)
      .fromTo($$(".cx-persona__img"), { opacity: 0.4, scale: 1.035 }, { opacity: 1, scale: 1, duration: 1.2, ease: EASE.arrive }, 0.1)
      .fromTo($$(".cx-hero-spark"), { opacity: 0, scale: 0.6, rotate: -30 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.7, ease: EASE.arrive, transformOrigin: "50% 50%" }, rb ? 1.05 : 0)
      .fromTo($$(".cx-hero-halo"), { opacity: 0, scale: 0.4 }, { opacity: 0.9, scale: 1, duration: 0.9, ease: EASE.arrive }, rb ? 1.05 : 0)
      .to($$(".cx-hero-halo"), { opacity: 0.6, duration: 0.6, ease: EASE.glide }, rb ? 1.95 : 0.9)
      .fromTo($$(".cx-hero-line"), { opacity: 0.6, yPercent: 25, filter: blur }, { opacity: 1, yPercent: 0, filter: "blur(0px)", duration: 0.7, ease: EASE.arrive, stagger: 0.11 }, 0.2)
      .fromTo($$(".cx-hero-lead, .cx-hero-ctas > *, .cx-hero-readout"), { opacity: 0.8, y: 12 }, { opacity: 1, y: 0, duration: 0.48, ease: EASE.glide, stagger: 0.07 }, 0.52)
      .fromTo($$(".cx-float"), { opacity: 0.6, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: EASE.glide, stagger: 0.12 }, 1.0);
    if (rb) {
      heroTl.fromTo(rb.paths, { opacity: 1, drawSVG: "0%" }, { drawSVG: "100%", duration: 0.85, ease: "power3.in" }, 0.25)
        .fromTo(rb.sheen, { opacity: 0, drawSVG: "0% 8%" }, { opacity: 0.9, drawSVG: "92% 100%", duration: 1, ease: "power1.inOut" }, 1.5)
        .to(rb.sheen, { opacity: 0, duration: 0.3 }, 2.1);
    }
    d.dataset.hero = "running"; // same tick as the first render: no unstyled frame in between
  }

  // a single sheen pass along a line (nothing repeats)
  function sheenOnce(rb: Line | undefined) {
    if (!B || !rb) return null;
    return B.gsap.timeline({ paused: true, delay: 0.2 })
      .fromTo(rb.sheen, { opacity: 0, drawSVG: "0% 6%" }, { opacity: 0.85, drawSVG: "94% 100%", duration: 1.1, ease: "power1.inOut" })
      .to(rb.sheen, { opacity: 0, duration: 0.3 }, 0.8);
  }
  function syncAmbient() {
    if (!closingSheen) return;
    const card = $("[data-closing]");
    const on = full() && !document.hidden && card?.dataset.inview === "1";
    if (on) closingSheen.play(); else closingSheen.pause();
  }

  // ---------- ignite helpers (lit is the default look; primed is the dim one) ----------
  function igniteSpark(el: HTMLElement | null) {
    if (!el || el.dataset.lit) return;
    el.dataset.lit = "1";
    el.classList.remove("is-primed");
    if (B && full()) B.gsap.fromTo(el, { opacity: 0.35, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.48, ease: EASE.arrive, transformOrigin: "50% 50%", clearProps: "opacity,transform" });
  }
  function primeSpark(el: HTMLElement) {
    el.classList.add("is-primed");
    B?.gsap.set(el, { opacity: 0.35, scale: 0.6, transformOrigin: "50% 50%" });
  }
  function traceIcon(svg: Element | null) {
    const p = svg?.querySelector(".cx-trace");
    if (!p || !B) return;
    B.gsap.timeline()
      .set(p, { attr: { "stroke-width": 10 }, fillOpacity: 0 })
      .fromTo(p, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.32, ease: EASE.glide })
      .to(p, { fillOpacity: 1, duration: 0.2, ease: "none" }, 0.24)
      .set(p, { attr: { "stroke-width": 0 }, clearProps: "fillOpacity,strokeDasharray,strokeDashoffset" });
  }
  function primeCap(cap: Element) {
    gset($$(".cx-bar > span", cap), { scaleX: 0 });
    gset($$(".cx-cols i", cap), { scaleY: 0 });
    gset($$(".cx-tick", cap), { scale: 0.4, opacity: 0 });
    gset($$(".cx-lv i", cap), { opacity: 0.35 });
    gset($$(".cx-trace", cap), { fillOpacity: 0, drawSVG: "0%" });
  }
  function igniteCap(i: number) {
    const cap = $(`.cx-cap[data-cap="${i}"]`);
    igniteSpark($(`.cx-build__rail .cx-node[data-node="${i}"]`));
    if (!cap || cap.dataset.lit) return;
    cap.dataset.lit = "1";
    if (!B || !full()) return;
    const { gsap } = B;
    traceIcon($(".cx-ic--trace", cap));
    $$(".cx-bar > span", cap).forEach((b, k) => gsap.to(b, { scaleX: parseFloat(getComputedStyle(b).getPropertyValue("--v")) || 1, duration: 0.7, ease: EASE.glide, delay: 0.15 + k * 0.07 }));
    $$(".cx-cols i", cap).forEach((c, k) => gsap.to(c, { scaleY: parseFloat(getComputedStyle(c).getPropertyValue("--h")) || 1, duration: 0.6, ease: EASE.glide, delay: 0.15 + k * 0.04 }));
    gto($$(".cx-tick", cap), { scale: 1, opacity: 1, duration: 0.32, ease: EASE.glide, stagger: 0.07, delay: 0.15 });
    gto($$(".cx-lv i", cap), { opacity: 1, duration: 0.32, ease: "none", stagger: 0.04, delay: 0.15 });
  }
  function igniteMile(i: number) {
    const node = $$(".cx-steps .cx-step__node")[i];
    if (!node || node.dataset.lit) return;
    igniteSpark(node);
    if (B && full()) traceIcon($(".cx-ic--trace", node.closest(".cx-step") || root));
  }

  function scrubbedLine(section: Element, rb: Line | undefined, start?: string, end?: string) {
    if (!B || !rb) return null;
    const once = lite() || !start;
    // a one-shot line whose section is already passed stays drawn: a rebuild (rotation, resize) must not redraw it
    if (once && !below(section, 0.75)) { setHead(rb, 1); return null; }
    const tl: Timeline = B.gsap.timeline({
      scrollTrigger: once ? { trigger: section, start: "top 75%", once: true } : { trigger: section, start, end, scrub: 0.6 },
      onUpdate: () => setHead(rb, tl.progress()),
    });
    tl.fromTo(rb.paths, { drawSVG: "0%" }, { drawSVG: "100%", duration: 1, ease: once ? EASE.orbit : "none" }, 0);
    setHead(rb, 0);
    return tl;
  }

  // ---------- per-section plans ----------
  function eyebrowSparks() {
    $$("[data-ignite]").forEach((s) => {
      if (s.dataset.lit || !below(s, 0.92)) return;
      primeSpark(s);
      B!.ScrollTrigger.create({ trigger: s, start: "top 92%", once: true, onEnter: () => igniteSpark(s) });
    });
  }

  // the sentence that carries the Sirius highlight dims less, so it stays readable (3.5:1) at rest
  const dimOf = (l: Element) => (l.querySelector("em") ? 0.8 : 0.6);
  function lightSentence(l: HTMLElement) {
    if (l.dataset.lit || !B) return;
    l.dataset.lit = "1";
    B.gsap.to(l, { opacity: 1, duration: 0.48, ease: EASE.glide, clearProps: "opacity" });
  }
  function missionMotion() {
    const sec = $("#mission");
    if (!sec || !B) return;
    const lits = $$(".cx-statement .cx-lit", sec);
    const rb = lines.mission;
    const wrap = $(".cx-statement-wrap", sec);
    if (!lite() && rb && wrap) {
      const tl = scrubbedLine(wrap, rb, "top 78%", "bottom 48%");
      const box = $(".cx-mission__rail svg", sec)!.getBoundingClientRect();
      lits.forEach((l) => {
        // one-way: a sentence stays lit once the light has reached it (no re-dimming on scroll back)
        if (l.dataset.lit || !below(l, 0.78)) return;
        const r0 = l.getClientRects()[0] || l.getBoundingClientRect();
        const at = clamp((r0.top + r0.height / 2 - box.top) / box.height, 0, 0.98);
        B!.gsap.set(l, { opacity: dimOf(l) });
        tl?.call(() => lightSentence(l), undefined, Math.max(0, at - 0.04));
      });
    } else {
      lits.forEach((l) => {
        if (l.dataset.lit || !below(l, 0.7)) return;
        B!.gsap.set(l, { opacity: dimOf(l) });
        B!.ScrollTrigger.create({ trigger: l, start: "top 70%", once: true, onEnter: () => lightSentence(l) });
      });
      if (rb) scrubbedLine(sec, rb);
    }
  }

  function buildMotion() {
    const sec = $("#build");
    if (!sec || !B) return;
    const caps = $$(".cx-cap", sec);
    const rb = lines.build;
    const railEl = $(".cx-build__rail");
    if (rb && railEl && wide() && !lite()) {
      const tl = scrubbedLine(railEl, rb, "top 84%", "top 40%");
      const passed = !below(railEl, 0.82);
      caps.forEach((cap, i) => {
        if (cap.dataset.lit || passed) { igniteCap(i); return; }
        primeCap(cap);
        const node = $(`.cx-build__rail .cx-node[data-node="${i}"]`);
        if (node && !node.dataset.lit) node.classList.add("is-primed");
        tl?.call(() => igniteCap(i), undefined, rb.nodes[i] ?? (i + 0.5) / 4);
      });
    } else {
      caps.forEach((cap, i) => {
        if (cap.dataset.lit || !below(cap, 0.85)) { igniteCap(i); return; }
        primeCap(cap);
        B!.ScrollTrigger.create({ trigger: cap, start: "top 85%", once: true, onEnter: () => igniteCap(i) });
      });
    }
  }

  function growthMotion() {
    const stairs = $(".cx-stairs");
    if (!stairs || !B) return;
    const nodes = $$(".cx-steps .cx-step__node");
    const rb = lines.growth;
    // Unlit icons stay faintly visible: at laptop height all four cards are on
    // screen before the line reaches the last two, and an empty tile reads as broken.
    const prime = (n: HTMLElement) => { primeSpark(n); gset($$(".cx-trace", n.closest(".cx-step") || root), { fillOpacity: 0.28 }); };
    if (rb && wide() && !lite()) {
      const tl = scrubbedLine(stairs, rb, "top 78%", "bottom 88%");
      const passed = !below(stairs, 0.78);
      nodes.forEach((n, i) => {
        if (n.dataset.lit || passed) { igniteMile(i); return; }
        prime(n);
        tl?.call(() => igniteMile(i), undefined, rb.nodes[i] ?? (i + 0.5) / 4);
      });
    } else {
      nodes.forEach((n, i) => {
        if (n.dataset.lit || !below(n, 0.8)) { igniteMile(i); return; }
        prime(n);
        B!.ScrollTrigger.create({ trigger: n, start: "top 80%", once: true, onEnter: () => igniteMile(i) });
      });
    }
  }

  function aiMotion() {
    const box = $("[data-ai]");
    if (!box || !B || box.dataset.lit) return;
    if (!below(box, 0.8)) { box.dataset.lit = "1"; return; }
    const bars = $$(".cx-gen__bar > span", box), oks = $$(".cx-gen__ok", box);
    B.gsap.set(bars, { scaleX: 0 });
    B.gsap.set(oks, { scale: 0.4, opacity: 0 });
    B.ScrollTrigger.create({
      trigger: box, start: "top 75%", once: true,
      onEnter: () => {
        box.dataset.lit = "1";
        const tl = B!.gsap.timeline();
        bars.forEach((b, i) => {
          tl.to(b, { scaleX: 1, duration: 0.7, ease: EASE.orbit }, i * 0.3)
            .to(oks[i], { scale: 1, opacity: 1, duration: 0.32, ease: EASE.arrive }, i * 0.3 + 0.6);
        });
      },
    });
  }

  function chainMotion() {
    const chain = $(".cx-chain");
    if (!chain || !B || chain.dataset.lit || !below(chain, 0.85)) return;
    const steps = $$(".cx-chain__step", chain);
    steps.forEach((p) => p.classList.add("is-primed"));
    B.ScrollTrigger.create({
      trigger: chain, start: "top 85%", once: true,
      onEnter: () => { chain.dataset.lit = "1"; steps.forEach((p, i) => B!.gsap.delayedCall(i * 0.12, () => p.classList.remove("is-primed"))); },
    });
  }

  function processMotion() {
    const list = $(".cx-process");
    if (!list || !B || list.dataset.lit || !below(list, 0.85)) return;
    const nodes = $$(".cx-process__node", list);
    B.gsap.set(list, { "--line": 0 });
    nodes.forEach(primeSpark);
    B.ScrollTrigger.create({
      trigger: list, start: "top 80%", once: true,
      onEnter: () => {
        list.dataset.lit = "1";
        B!.gsap.to(list, { "--line": 1, duration: 0.9, ease: EASE.orbit, clearProps: "--line" });
        nodes.forEach((n, i) => B!.gsap.delayedCall(0.1 + i * 0.22, () => igniteSpark(n)));
      },
    });
  }

  function rolesArrival() {
    const board = $(".cx-board");
    const line = $(".cx-board__line");
    if (!board || !B || board.dataset.lit || !below(board, 0.8)) return;
    const rows = $$(".cx-role", board).slice(0, 8);
    if (!rows.length) return; // the list has not rendered yet; rebuild() runs again when it does
    B.gsap.set(line, { scaleY: 0 });
    B.gsap.set(rows, { y: 12 }); // rows move, they never dim: meta text stays at full contrast
    B.ScrollTrigger.create({
      trigger: board, start: "top 80%", once: true,
      onEnter: () => {
        board.dataset.lit = "1";
        B!.gsap.to(line, { scaleY: 1, duration: 0.7, ease: EASE.orbit, clearProps: "transform" });
        B!.gsap.to(rows, { y: 0, duration: 0.32, ease: EASE.glide, stagger: 0.04, clearProps: "transform" });
      },
    });
  }

  function closingTie() {
    const card = $("[data-closing]");
    if (!card || !B) return;
    const rb = lines.closing;
    const spark = $(".cx-closing-spark"), halo = $(".cx-closing-halo");
    closingSheen?.kill();
    closingSheen = null;
    const done = () => {
      if (card.dataset.sheen) return; // the sheen passes once; a rebuild (resize, list load) must not replay it
      closingSheen = sheenOnce(lines.closing)?.eventCallback("onComplete", () => { card.dataset.sheen = "1"; }) ?? null;
      syncAmbient();
    };
    // a start the page can never scroll to counts as already reached
    const unreachable = card.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.75 > B.ScrollTrigger.maxScroll(window);
    if (card.dataset.lit || unreachable || !below(card, 0.75)) { card.dataset.lit = "1"; done(); return; }
    if (rb) { B.gsap.set(rb.paths, { drawSVG: "0%" }); gset(rb.extras, { drawSVG: "0%" }); }
    B.gsap.set(spark, { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" });
    B.gsap.set(halo, { opacity: 0, scale: 0.4 });
    B.ScrollTrigger.create({
      trigger: card, start: "top 75%", once: true,
      onEnter: () => {
        card.dataset.lit = "1";
        const tl = B!.gsap.timeline({ onComplete: done });
        if (rb) { tl.to(rb.paths, { drawSVG: "100%", duration: 0.9, ease: EASE.orbit }, 0); if (rb.extras.length) tl.to(rb.extras, { drawSVG: "100%", duration: 1.1, ease: EASE.orbit }, 0.75); }
        tl.to(spark, { opacity: 1, scale: 1, duration: 0.6, ease: EASE.arrive }, 0.9)
          .to(halo, { opacity: 0.9, scale: 1, duration: 0.9, ease: EASE.arrive }, 0.9)
          .to(halo, { opacity: 0.6, duration: 0.6, ease: EASE.glide }, 1.8);
      },
    });
  }

  function build() {
    if (!B || destroyed) return;
    ctx?.revert();
    $$(".is-primed").forEach((n) => n.classList.remove("is-primed"));
    Object.values(lines).forEach((rb) => { if (rb) { rb.t = -1; setHead(rb, 1); } });
    ctx = B.gsap.context(() => {
      if (!full()) return;
      eyebrowSparks();
      missionMotion();
      buildMotion();
      growthMotion();
      aiMotion();
      chainMotion();
      processMotion();
      rolesArrival();
      closingTie();
    }, root);
    B.ScrollTrigger.refresh();
  }

  // ---------- listeners ----------
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { (e.target as HTMLElement).dataset.inview = e.isIntersecting ? "1" : "0"; });
    syncAmbient();
  });
  $$("[data-inview-watch]").forEach((s) => io.observe(s));

  const onVisibility = () => { d.toggleAttribute("data-hidden", document.hidden); syncAmbient(); };
  document.addEventListener("visibilitychange", onVisibility);
  cleanups.push(() => document.removeEventListener("visibilitychange", onVisibility));

  const onMotionPref = (e: MediaQueryListEvent) => {
    d.dataset.motion = e.matches ? "reduce" : "full";
    heroTl?.progress(1);
    if (e.matches && d.dataset.hero === "pending") d.dataset.hero = "skip";
    if (!full()) closingSheen?.pause(0);
    if (!e.matches) boot();
    build();
    syncAmbient();
  };
  RM.addEventListener("change", onMotionPref);
  cleanups.push(() => RM.removeEventListener("change", onMotionPref));

  // light ring: one passive listener per grid, rAF-throttled, read all then write
  $$("[data-ring-grid]").forEach((grid) => {
    let raf = 0, px = 0, py = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      px = e.clientX; py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const items = $$(".cx-cap, .cx-role__link", grid);
        const rects = items.map((n) => n.getBoundingClientRect());
        items.forEach((n, i) => { n.style.setProperty("--x", `${(px - rects[i].left).toFixed(0)}px`); n.style.setProperty("--y", `${(py - rects[i].top).toFixed(0)}px`); });
      });
    };
    grid.addEventListener("pointermove", move, { passive: true });
    cleanups.push(() => { grid.removeEventListener("pointermove", move); cancelAnimationFrame(raf); });
  });

  // keep lines aligned to layout (own size only); a running hero intro is never cut short
  const seen = new WeakMap<Element, [number, number]>();
  let reTimer = 0;
  const ro = new ResizeObserver((entries) => {
    let changed = false;
    entries.forEach((en) => {
      const { width, height } = en.contentRect, last = seen.get(en.target);
      if (last && (Math.abs(last[0] - width) > 1 || Math.abs(last[1] - height) > 1)) changed = true;
      seen.set(en.target, [width, height]);
    });
    if (!changed) return;
    window.clearTimeout(reTimer);
    reTimer = window.setTimeout(() => {
      const introOn = !!heroTl?.isActive();
      if (introOn) heroRedraw = true;
      drawAll(introOn);
      build();
    }, 200);
  });
  $$("svg[data-ribbon]").forEach((s) => ro.observe(s));

  // ---------- boot: lines at once; motion once GSAP and fonts are ready (fonts capped at 600ms) ----------
  // Reduced motion never downloads GSAP: the drawn lines are already the finished page.
  let booted = false;
  function boot() {
    if (booted || destroyed) return;
    booted = true;
    const fontsReady = Promise.race([document.fonts ? document.fonts.ready.then(() => undefined) : wait(0), wait(600)]);
    Promise.all([loadGsap(), fontsReady]).then(([bundle]) => {
      if (destroyed) return;
      if (!bundle) { if (d.dataset.hero === "pending") d.dataset.hero = "skip"; return; }
      B = bundle;
      drawAll();
      heroIntro();
      build();
      document.fonts?.ready.then(() => { if (!destroyed) B?.ScrollTrigger.refresh(); });
    });
  }
  drawAll();
  if (full()) boot();

  return {
    rebuild: () => { if (!destroyed) { drawAll(!!heroTl?.isActive()); build(); } },
    destroy() {
      destroyed = true;
      window.clearTimeout(reTimer);
      ro.disconnect();
      io.disconnect();
      cleanups.forEach((f) => f());
      heroTl?.kill();
      closingSheen?.kill();
      ctx?.revert();
      delete d.dataset.hero;
      delete d.dataset.motion;
      delete d.dataset.tier;
      d.removeAttribute("data-hidden");
    },
  };
}
