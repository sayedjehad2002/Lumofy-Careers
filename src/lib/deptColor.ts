// Maps a department / pillar name to a stable brand hue so color always encodes
// meaning across the careers experience (see spec §6.1). A given name always
// returns the same hue. Use `hueClasses` for Tailwind class names — they are
// written as COMPLETE literal strings so Tailwind's JIT scanner generates them
// (dynamically-built class names like `bg-brand-${hue}` are NOT detected).
export const BRAND_HUES = ["sirius", "eclipse", "aurora", "stellar", "nova"] as const;
export type BrandHue = (typeof BRAND_HUES)[number];

const norm = (s: string) => s.trim().toLowerCase();

// Stable string hash → index, so a given department always maps to the same hue.
function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

export function deptColor(name: string): BrandHue {
  return BRAND_HUES[hashIndex(norm(name), BRAND_HUES.length)];
}

export type HueClassSet = {
  text: string;
  /** AA-safe variant for SMALL text on white / hue-tinted chips (≥4.5:1). */
  textReadable: string;
  bg: string;
  bgSoft: string;
  border: string;
  ring: string;
  from: string;
  /** Soft hue glow applied to icon tiles when the parent `.group` is hovered. */
  glow: string;
};

// Complete literal class strings per hue (JIT-safe). Semantic color is always
// paired with text in the UI, never used as the only signal.
export const hueClasses: Record<BrandHue, HueClassSet> = {
  sirius: { text: "text-brand-sirius", textReadable: "text-[hsl(var(--brand-sirius-readable))]", bg: "bg-brand-sirius", bgSoft: "bg-brand-sirius/10", border: "border-brand-sirius/30", ring: "ring-brand-sirius/40", from: "from-brand-sirius/20", glow: "group-hover:shadow-[0_0_18px_hsl(var(--brand-sirius)/0.35)]" },
  eclipse: { text: "text-brand-eclipse", textReadable: "text-[hsl(var(--brand-eclipse-readable))]", bg: "bg-brand-eclipse", bgSoft: "bg-brand-eclipse/10", border: "border-brand-eclipse/30", ring: "ring-brand-eclipse/40", from: "from-brand-eclipse/20", glow: "group-hover:shadow-[0_0_18px_hsl(var(--brand-eclipse)/0.35)]" },
  aurora: { text: "text-brand-aurora", textReadable: "text-[hsl(var(--brand-aurora-readable))]", bg: "bg-brand-aurora", bgSoft: "bg-brand-aurora/10", border: "border-brand-aurora/30", ring: "ring-brand-aurora/40", from: "from-brand-aurora/20", glow: "group-hover:shadow-[0_0_18px_hsl(var(--brand-aurora)/0.35)]" },
  stellar: { text: "text-brand-stellar", textReadable: "text-[hsl(var(--brand-stellar-readable))]", bg: "bg-brand-stellar", bgSoft: "bg-brand-stellar/10", border: "border-brand-stellar/30", ring: "ring-brand-stellar/40", from: "from-brand-stellar/20", glow: "group-hover:shadow-[0_0_18px_hsl(var(--brand-stellar)/0.35)]" },
  nova: { text: "text-brand-nova", textReadable: "text-[hsl(var(--brand-nova-readable))]", bg: "bg-brand-nova", bgSoft: "bg-brand-nova/10", border: "border-brand-nova/30", ring: "ring-brand-nova/40", from: "from-brand-nova/20", glow: "group-hover:shadow-[0_0_18px_hsl(var(--brand-nova)/0.35)]" },
};

// Convenience: hue → class set for a department/pillar name.
export const deptClasses = (name: string): HueClassSet => hueClasses[deptColor(name)];
