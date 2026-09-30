// The "Path of Light" lines. Paths are computed from the real layout, so they line up with nodes and
// cards at every width and stay vector-sharp at any DPR. Fine strokes, straight or gently rising,
// never loops. No GSAP here: the lines are drawn in their finished state and motion animates them later.

const NS = "http://www.w3.org/2000/svg";
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
type Pt = [number, number];
type Stop = [number, string, number];

export interface Line {
  paths: SVGGeometryElement[]; // glow (dark bands) + body: what gets drawn
  body: SVGPathElement;
  sheen: SVGPathElement;
  extras: SVGGeometryElement[]; // e.g. the closing orbit ring
  head: SVGGElement | null; // light-head that rides the drawn end
  len: number;
  nodes: number[]; // 0..1 progress at which each node is reached
  t: number;
}

interface Spec {
  pts: Pt[];
  width: number;
  stops: Stop[];
  dark?: boolean;
  track?: string;
  head?: boolean;
  nodes?: number[];
  ring?: { cx: number; cy: number; r: number; width: number; color: string };
}

let uid = 0;
function mk<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  return n;
}
// Catmull-Rom through points, as cubic Beziers (two points give a straight line)
function smooth(pts: Pt[]) {
  const f = (n: number) => n.toFixed(1);
  let s = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    s += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return s;
}
const centerIn = (node: Element, box: DOMRect): Pt => {
  const r = node.getBoundingClientRect();
  return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
};

const ON_DARK: Stop[] = [[0, "#FFFFFF", 1], [0.1, "#9DB6FF", 1], [0.45, "#5C86F2", 1], [0.82, "#215BEA", 0.75], [1, "#215BEA", 0]];
const ON_LIGHT: Stop[] = [[0, "#215BEA", 1], [1, "#5C86F2", 1]];
const TRACK = "#D7DCEA";
const TRAIL: Stop[] = [[0, "#215BEA", 0], [0.35, "#215BEA", 0.5], [0.75, "#5C86F2", 0.95], [0.95, "#9DB6FF", 1], [1, "#FFFFFF", 1]];

// u = the page's rem scale (1 up to 1920px wide, larger on big screens and TVs): stroke widths and fixed offsets
// scale with it, so the lines keep their weight against the text they sit beside
type SpecFn = (root: HTMLElement, W: number, H: number, box: DOMRect, u: number) => Spec | null;
const SPECS: Record<string, SpecFn> = {
  hero(root, W, H, box, u) {
    const spark = root.querySelector(".cx-hero-spark");
    const copyEl = root.querySelector(".cx-hero__copy");
    if (!spark || !copyEl) return null;
    const end = centerIn(spark, box);
    // one straight trail rising from the left, above the portrait, into the spark;
    // when the text column sits beside the visual, the trail starts clear of it
    const copy = copyEl.getBoundingClientRect();
    const beside = copy.bottom > box.top && copy.right < box.left + W * 0.5;
    const x0 = beside ? Math.max(W * -0.3, copy.right - box.left + 28 * u) : W * -0.3;
    return { dark: true, width: clamp(W * 0.005, 2 * u, 2.8 * u), stops: TRAIL, pts: [[x0, H * 0.44], end] };
  },
  mission(_root, W, H, _box, u) {
    // a straight progress rail beside the statement; its light-head brightens each sentence
    return { width: 2 * u, stops: ON_LIGHT, track: TRACK, head: true, pts: [[W / 2, 4], [W / 2, H - 4]] };
  },
  build(root, W, _H, box, u) {
    const nodes = Array.from(root.querySelectorAll(".cx-build__rail .cx-node")).map((n) => centerIn(n, box));
    if (!nodes.length) return null;
    const y = nodes[0][1], step = nodes.length > 1 ? nodes[1][0] - nodes[0][0] : 200;
    return {
      width: 2 * u, stops: ON_LIGHT, track: TRACK, head: true,
      pts: [[Math.max(4, nodes[0][0] - 40 * u), y], [Math.min(W - 4, nodes[nodes.length - 1][0] + step * 0.72), y]],
      nodes: nodes.map((p) => p[0]),
    };
  },
  growth(root, _W, _H, box, u) {
    const nodes = Array.from(root.querySelectorAll(".cx-steps .cx-step__node")).map((n) => centerIn(n, box));
    if (!nodes.length) return null;
    // extend the line along its own direction at both ends, so it reads as one straight rising trend
    const a = nodes[0], a2 = nodes[1] || a, z = nodes[nodes.length - 1], z2 = nodes[nodes.length - 2] || z;
    const pts: Pt[] = [[a[0] - (a2[0] - a[0]) * 0.3, a[1] - (a2[1] - a[1]) * 0.3], ...nodes, [z[0] + (z[0] - z2[0]) * 0.4, z[1] + (z[1] - z2[1]) * 0.4]];
    return { width: 2 * u, stops: ON_LIGHT, track: TRACK, head: true, pts, nodes: nodes.map((p) => p[0]) };
  },
  closing(root, W, H, box, u) {
    const spark = root.querySelector(".cx-closing-spark");
    if (!spark) return null;
    const end = centerIn(spark, box);
    const r = clamp(Math.min(W, H) * 0.2, 56 * u, 110 * u);
    return {
      dark: true, width: 2.4 * u, stops: ON_DARK.slice().reverse().map(([o, c, op]) => [1 - o, c, op] as Stop),
      // a straight trail arriving at the spark, then a fine orbit ring around it
      pts: [[W * 0.99, H * 0.03], end],
      ring: { cx: end[0], cy: end[1], r, width: u, color: "rgba(157, 182, 255, .38)" },
    };
  },
};

// progress (0..1 of length) at which the path first reaches a given x (lines here are monotonic in x)
function nodeAt(path: SVGPathElement, len: number, x: number) {
  let lo = 0, hi = len;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (path.getPointAtLength(mid).x < x) lo = mid;
    else hi = mid;
  }
  return clamp(hi / len, 0, 1);
}

export function setHead(line: Line | undefined, t: number) {
  if (!line || !line.head) return;
  t = clamp(t, 0, 1);
  if (Math.abs(t - line.t) < 0.004 && t !== 0 && t !== 1) return; // skip sub-pixel moves while scrubbing
  line.t = t;
  const p = line.body.getPointAtLength(line.len * t);
  line.head.setAttribute("transform", `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`);
}

/** Draws (or redraws) one line into its <svg data-ribbon="name">. Returns null when hidden at this width. */
export function drawLine(root: HTMLElement, svg: SVGSVGElement): Line | null {
  const name = svg.dataset.ribbon || "";
  const box = svg.getBoundingClientRect();
  const W = box.width, H = box.height;
  svg.textContent = "";
  if (W < 4 || H < 4 || getComputedStyle(svg).display === "none" || !SPECS[name]) return null;
  const u = Math.max(1, parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1);
  const spec = SPECS[name](root, W, H, box, u);
  if (!spec) return null;
  svg.setAttribute("viewBox", `0 0 ${W.toFixed(1)} ${H.toFixed(1)}`);
  const id = `cxrb${++uid}`, a = spec.pts[0], b = spec.pts[spec.pts.length - 1];
  const line = { gradientUnits: "userSpaceOnUse", x1: a[0], y1: a[1], x2: b[0], y2: b[1] };
  const defs = mk("defs", {});
  const lg = mk("linearGradient", { id, ...line });
  spec.stops.forEach(([o, c, op]) => lg.appendChild(mk("stop", { offset: o, "stop-color": c, "stop-opacity": op })));
  const sg = mk("linearGradient", { id: id + "s", ...line });
  ([[0, "#9DB6FF"], [0.5, "#FFFFFF"], [1, "#9DB6FF"]] as const).forEach(([o, c]) => sg.appendChild(mk("stop", { offset: o, "stop-color": c })));
  defs.append(lg, sg);
  const d0 = smooth(spec.pts), w = spec.width;
  const g = mk("g", { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" });
  if (spec.track) g.append(mk("path", { d: d0, class: "cx-rb-track", stroke: spec.track, "stroke-width": w }));
  const extras: SVGGeometryElement[] = [];
  if (spec.ring) {
    const { cx, cy, r, width, color } = spec.ring;
    extras.push(mk("circle", { cx: cx.toFixed(1), cy: cy.toFixed(1), r: r.toFixed(1), class: "cx-rb-extra", stroke: color, "stroke-width": width, transform: `rotate(-120 ${cx.toFixed(1)} ${cy.toFixed(1)})` }));
  }
  const paths: SVGGeometryElement[] = [];
  if (spec.dark) paths.push(mk("path", { d: d0, class: "cx-rb-glow", stroke: `url(#${id})`, "stroke-opacity": ".18", "stroke-width": (w * 3.4).toFixed(1) }));
  const body = mk("path", { d: d0, class: "cx-rb-body", stroke: `url(#${id})`, "stroke-width": w });
  paths.push(body);
  const sheen = mk("path", { d: d0, class: "cx-rb-sheen", stroke: `url(#${id}s)`, "stroke-width": (w * 1.1).toFixed(1) });
  g.append(...extras, ...paths, sheen);
  let head: SVGGElement | null = null;
  if (spec.head) {
    head = mk("g", { class: "cx-rb-head" });
    const inner = mk("g", { transform: `scale(${(1.25 * u).toFixed(3)}) translate(-10.43,-7.9)` });
    inner.append(mk("use", { href: "#cx-spark-path" }));
    head.append(mk("circle", { r: (9 * u).toFixed(1), class: "cx-rb-head__halo" }), inner);
    g.append(head);
  }
  svg.append(defs, g);
  const len = body.getTotalLength();
  const out: Line = { paths, body, sheen, extras, head, len, t: -1, nodes: (spec.nodes || []).map((x) => nodeAt(body, len, x)) };
  setHead(out, 1);
  return out;
}
