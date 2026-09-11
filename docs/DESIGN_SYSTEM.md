# Design system

The brand is black, white, minimal, all-caps, high contrast. We extend it; we
do not invent a new identity. The audience owns expensive cars, so the app
should feel like a concierge service, not a work-order tool.

**Single source of truth: `src/theme/tokens.ts`.** Every colour, space, radius
and type ramp comes from there. `npm run tokens` generates the CSS custom
properties. No hex literal belongs in a component (DECISIONS.md#0002).

---

## Colour

| Role | Light | Dark |
|---|---|---|
| Background | `#FAFAF9` | `#0A0A0A` |
| Surface | `#FFFFFF` | `#151515` |
| Raised surface | `#F4F4F3` | `#1E1E1E` |
| Ink | `#111111` | `#F5F5F5` |
| Ink muted | `#6B6B6B` | `#A1A1A1` |
| Hairline | `#E5E5E5` | `#262626` |
| Brand | `#212121` | `#F5F5F5` |
| Accent — fills (champagne) | `#C9A961` | `#C9A961` |
| Accent — text | `#8A6D2F` | `#C9A961` |
| Success / Warning / Danger | `#34C759` / `#FF9F0A` / `#FF453A` | same |

**The accent is rationed.** Champagne appears on tier badges, the active nav
state, and premium service highlights. Its scarcity is what makes it read as
premium rather than decorative.

**There are two golds, and mixing them up is an accessibility bug.**
`accent` is the bright champagne and is a **fill colour only** — it measures
2.15:1 against the light background, far below the 4.5:1 AA needs, so it can
never carry lettering. `accentText` is the same hue darkened to 4.67:1 on
`bg` and 4.87:1 on `surface`. Any gold *text* uses `accentText`; so does the
focus ring, since WCAG 1.4.11 wants 3:1 for a focus indicator.

On dark both tokens hold the same value: the bright champagne already reaches
8.8:1 on near-black.

Brand inverts between schemes: the primary button is near-black on light and
near-white on dark, so it stays the highest-contrast element either way.

---

## Type

| Role | Face | Notes |
|---|---|---|
| Display / headings | Playfair Display | Didone, matching the wordmark (DECISIONS.md#0004) |
| Body / UI | Inter Tight | Sentence case, generous leading |
| Numerals | Inter Tight, tabular | Prices, invoices, reporting — always |

**All-caps is a style, not a default.** The `.eyebrow` class carries the
site's voice — 12px, 0.18em tracking, uppercase — and is used for section
labels and button text. Never all-caps for anything over four words.

Prices always use `.tabular` so columns align on the decimal.

---

## Space, radius, motion

- Screen gutter **24px**. Everything full-width sits inside it.
- Card radius **16px**, sheets **28px**, nav capsule and chips fully round.
- Transitions **200–300ms**. Spring (`cubic-bezier(0.32, 0.72, 0, 1)`) for nav
  and sheets; flat ease for anything financial. **No bounce on money** — a
  total that springs reads as unstable.
- Haptics on booking confirmation, job status change, payment success.
  (No-op on iOS Safari; live after the native port.)

Photography is the primary visual texture. Full-bleed vehicle photos carry the
luxury — not gradients, not illustration.

---

## Liquid Glass navigation

A floating capsule hovering 16px above the safe-area inset — **not** a
full-width docked bar.

- `backdrop-filter: blur(24px) saturate(180%)`
- Translucent fill: 68% white (light), 62% `#151515` (dark)
- 1px inner hairline stroke; soft ambient shadow
- Specular highlight along the top rim
- Content scrolls underneath and stays partly visible. **The bar is never
  opaque** — that is the entire effect.
- Active tab: accent-tinted pill that springs between positions rather than
  cutting

**Exactly four primary tabs plus a trailing `•••` More** that opens a glass
sheet, not a new page.

### Degradation is mandatory

Implemented in `src/styles.css`, in one place:

| Condition | Behaviour |
|---|---|
| `prefers-reduced-transparency` | Solid surface, no blur, no specular |
| `@supports not (backdrop-filter)` | Solid surface — never a see-through box with no blur |
| `prefers-reduced-motion` | Cross-fade instead of the morph |

---

## Accessibility

Non-negotiable, checked in CI by the Lighthouse audit (accessibility ≥ 0.95):

- **44pt minimum** on every interactive element, enforced in the base layer.
- **WCAG AA contrast in both themes.** The champagne accent is the one colour
  that fails at body size — hence the rationing rule above.
- Full VoiceOver labelling. Icon-only controls carry `aria-label`.
- Focus rings use the accent at 2px with 2px offset, and are never removed.
- Every destructive admin action confirms.

---

## Brand assets

Sources in `assets/brand-src/` (committed, never published). `npm run brand`
generates everything under `public/`.

The supplied logo is pure white artwork on pure black, so its luminance
channel is an exact alpha mask. The pipeline lifts that mask once and recolours
it per theme, rather than shipping a flattened raster per background — which is
why the light-mode logo has clean antialiased edges rather than a black halo.

Generated: stacked and horizontal lockups in ink and white; icons at 16–1024;
maskable icons at 56% coverage for Android's circle crop; ten iOS splash
screens; favicon.

The icon drops "LUXURY DETAILING" — it is unreadable at 60px, and the car mark
plus BEEZY is the recognisable unit.
