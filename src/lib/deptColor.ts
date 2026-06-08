// Maps a department / pillar name to a stable brand hue so color always encodes
// meaning across the careers experience (see spec §6.1). A given name always
// returns the same hue. Pair with the class helpers below — semantic color is
// always shown alongside text, never as the only signal.
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

// Convenience class helpers (Tailwind brand.* colors from Task 1).
export const hueText = (h: BrandHue) => `text-brand-${h}`;
export const hueBg = (h: BrandHue) => `bg-brand-${h}`;
export const hueBgSoft = (h: BrandHue) => `bg-brand-${h}/10`;
export const hueBorder = (h: BrandHue) => `border-brand-${h}/30`;
