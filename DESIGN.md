# Lumofy — Design System

The careers site speaks the **lumofy.ai master-brand language** ("lx", extracted from the main
website): a **LIGHT corporate canvas** (`#fcfdff` page, white cards, `#e5e9f2` hairlines,
`#f6f8fc` tint bands) **bookended by dark-canvas moments** — the `#040509` sticky nav, the
`#0a0a0c` hero with a 72px grid + Sirius aurora blur, the dark closing `ctacard`, and the
`#070708` footer. Those bookends are art-directed dark in BOTH themes (`.dark-canvas` etc. in
`src/index.css`).

**Theme mechanics:** public routes always render light (`ThemeRouteSync` in `App.tsx`); the
stored dark/light preference applies only on `/dashboard` and `/hr/*`. Light tokens live under
`:root`, dashboard dark tokens under `.dark`, and the theme-independent lx structural tokens
(`--lx-ink-*`, `--lx-on-dark-*`, `--lx-dark`, `--lx-nav`, `--lx-line`, `--lx-blue-soft`…) under
`:root`. The lx component vocabulary (`.dark-canvas`, `.grid-lines`, `.lx-aurora`,
`.eyebrow-pill`, `.sec-title`, `.band-tint/-mint/-bluegrad`, `.lx-card`, `.shadow-sirius`,
`.chrome-dots`) lives in `@layer components`. Marketing CTAs are **pill-shaped**
(`rounded-full`), section kickers are **eyebrow pills**, and headline accent words on dark use
`--lx-blue-soft` (`#5c86f2`).

## Color

Dark-first, **blue-led**, with a four-color cosmic accent palette. Sirius blue is the single
primary/action color; the accents carry data, status, categories, and graphics.

| Name | Hex | HSL token | Role |
|---|---|---|---|
| **Cosmos** (Void) | `#0C0C0C` | `222 16% 7%` (`--background`, whisper of tint) | Deep-space base |
| **Halo** | `#EFEFEF` | `220 9% 94%` (`--foreground`) | Light / text |
| **Sirius** | `#215BEA` | `223 83% 52%` (`--primary`, `--brand-sirius`) | Primary / action |
| **Eclipse** | `#A366FF` | `264 100% 70%` (`--brand-eclipse`) | Accent — purple |
| **Aurora** | `#5AE29C` | `149 70% 62%` (`--brand-aurora`) | Accent — green |
| **Stellar** | `#E2E05A` | `59 70% 62%` (`--brand-stellar`) | Accent — yellow |
| **Nova** | `#E05A90` | `336 68% 62%` (`--brand-nova`) | Accent — pink |

Use accents via `hsl(var(--brand-eclipse))` etc. Chart tokens `--chart-1..5` are mapped to
Sirius / Aurora / Eclipse / Nova / Stellar. Status colors (success/warning/danger) stay
functional. Keep the surface predominantly Cosmos + Sirius; reach for the other accents
deliberately, not as decoration.

## Typography

- **Display: Source Sans 3** — all headings, weight 800, tight (`.sec-title`:
  `clamp(2rem,4.4vw,3.375rem)`, `-0.028em`, lh 1.06). Tailwind `font-display`.
- **Body: IBM Plex Sans** (400/500/600) — the default `font-sans`, matching the main site's
  display/body pairing.
- **Arabic** (when added): **IBM Plex Sans Arabic** primary, Source Sans Arabic secondary.
- Loaded non-render-blocking from `index.html` (Google Fonts).

## Logo

- **Primary logo** (horizontal wordmark): most cases / rectangular layouts.
- **Logo Mark**: compact / square spaces (currently used in the navbar — `src/assets/lumofy-mark.png`).
- B&W variants exist. Respect clear space; don't recolor or distort.

## Voice

Guiding, illuminating, growth-driven. The palette taglines capture it: "Guide Your Journey"
(Sirius), "Illuminate the way forward" (Halo), "Ignite Your Potential" (Stellar), "Grow into
the Future" (Aurora), "Reach Beyond the Stars" (Cosmos).

## Motion

Calm, transform/opacity only, 150–300ms, ease-out, reduced-motion safe. Tokens in `src/lib/motion.ts`.
