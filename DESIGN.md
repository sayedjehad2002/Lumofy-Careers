# Lumofy — Design System

The official brand, sourced from the **Brand Guidelines Sheet** and the **Dark Theme** deck.
Lumofy's identity is **cosmic and aspirational**: every color is a celestial body with a promise.
The careers site is **dark-only**; tokens live in `src/index.css` under `.dark`.

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

- **Primary: Source Sans 3** (= Source Sans Pro) — body **and** headings. Headings use weight 800.
- **Secondary: IBM Plex Sans** (available for distinction if needed).
- **Arabic** (when added): **IBM Plex Sans Arabic** primary, Source Sans Arabic secondary.
- Loaded in `src/index.css` (Google Fonts). Urbanist has been retired — it is **not** a Lumofy font.

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
