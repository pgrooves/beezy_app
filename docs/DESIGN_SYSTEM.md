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
| Ink subtle | `#6E6E6E` | `#8A8A8A` |
| Hairline | `#E5E5E5` | `#262626` |
| Brand | `#212121` | `#F5F5F5` |
| Accent — fills (champagne) | `#C9A961` | `#C9A961` |
| Accent — text | `#866A2D` | `#C9A961` |
| Success / Warning / Danger — fills | `#34C759` / `#FF9F0A` / `#FF453A` | same |
| Success / Warning / Danger — text | `#1E7A38` / `#966300` / `#D0281C` | same as fills |

**The accent is rationed.** Champagne appears on tier badges, the active nav
state, and premium service highlights. Its scarcity is what makes it read as
premium rather than decorative.

**Every saturated colour comes in a fill and a text value, and mixing them up
is an accessibility bug.** `accent` is the bright champagne and is a **fill
colour only** — 2.15:1 against the light background, far below the 4.5:1 AA
needs, so it can never carry lettering. `accentText` is the same hue darkened
until it clears AA on all three light grounds. The status colours follow
exactly the same split, for exactly the same reason: `#34C759` set as 10px
Chip text measured 2.21:1 on white and shipped that way. Any gold or status
*lettering* uses the `*Text` value; so does the focus ring, since WCAG 1.4.11
wants 3:1 for a focus indicator.

On dark, fill and text share one value for all four hues — on near-black the
bright versions already clear AA.

**Check against `surfaceAlt`, not just `bg`.** The raised surface is the
tightest of the three grounds, and it is where `accentText` was sitting at
4.43:1 while every check looked only at `bg` and `surface`.

**The light theme has two greys, not three.** `inkSubtle` used to be `#8E8E8E`
on the claim that it was AA "at 14px+" — it was 3.13:1, which is below AA at
any size, and nothing ever set it above 13px. Fixed, it lands at `#6E6E6E`,
almost on top of `inkMuted`, and that is not a mistake to tidy up later: on a
near-white ground three visibly separated greys cannot all clear 4.5. In light
mode the tertiary tone is carried by size and weight. Dark mode keeps a real
three-step ladder because it has the headroom.

Brand inverts between schemes: the primary button is near-black on light and
near-white on dark, so it stays the highest-contrast element either way.

---

## Type

| Role | Face | Notes |
|---|---|---|
| Display / headings | Josefin Sans 300 | Light art-deco geometric (DECISIONS.md#0016) |
| Body / UI | Inter Tight | Sentence case, generous leading |
| Numerals | Inter Tight, tabular | Prices, invoices, reporting — always |

**Three uppercase treatments, and they are not interchangeable.**

- `.eyebrow` — 12px, 0.18em tracking. Section labels and button text.
- `.display-caps` — 26px, 0.09em tracking. **Screen titles only.**
- Every other heading in the display face stays **mixed case**.

That last rule is the one that matters. Caps on every heading puts screen
titles, section labels and card headings into one treatment at three sizes and
the hierarchy collapses, because `.eyebrow` is already uppercase. So a screen
is titled `GARAGE`, but the vehicle on it is "2023 Porsche Macan" and the
booking step asks "Show me the car".

Record names — a client, a vehicle — stay mixed case at any size. A person's
name set in caps reads as shouting.

Screen titles wrap rather than truncate: caps at this tracking are wide, and a
title like "Business settings" will not fit beside the brand mark on one line
at phone width. A two-line header beats a clipped title.

Prices use `.money` — the numeric face at heading scale. The display face has
no tabular figures, so a column of prices set in it will not align.

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

- `backdrop-filter: blur(36px) saturate(150%)`
- Translucent fill: 58% white (light), 52% `#151515` (dark)
- Content scrolls underneath and stays partly visible. **The bar is never
  opaque** — that is the entire effect.
- Active tab: accent tint at 12% with a 1px accent edge, springing between
  positions rather than cutting

**The edge is lit, not outlined.** A uniform 1px border round the whole
capsule is what makes glass read as moulded plastic, so the rim is built from
four unequal tokens instead — `glassRim` (bright specular along the top),
`glassRimFade` (a whisper everywhere else), `glassSheen` (the highlight
rolling off into the upper half), and `glassUnderlight` (light bouncing up off
the content passing beneath). Dark mode reproduces the same relationships at
roughly a third of the amplitude.

**Weight discipline.** Nav icons are 22px at **1.25** stroke, and labels use
`navLabel` (10px / 500 / 0.01em sentence case) — deliberately *not* `.eyebrow`
shrunk down, which at 9px / 600 / 0.18em outweighed the icon above it. The
ambient shadow stays at 10% black: separation comes from the blur and the rim,
not from a dark halo.

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
- **WCAG AA contrast in both themes**, asserted token-by-token in
  `src/theme/contrast.test.ts` — every text token against `bg`, `surface` and
  `surfaceAlt`. The saturated hues (champagne, green, amber, red) all fail at
  body size in light mode, hence the fill/text split above.
- Full VoiceOver labelling. Icon-only controls carry `aria-label`.
- **`aria-hidden` implies `inert`.** A subtree marked hidden that still holds
  reachable controls is its own axe failure, and a real one — the closed More
  sheet sat in the tab order. Per-element `tabIndex` does not cover content
  passed in as children; `inert` covers the subtree.
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
