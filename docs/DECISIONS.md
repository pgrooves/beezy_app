# Architecture decisions

A running log. Each entry records what we chose, why, and what would make us
revisit it. Newest decisions go at the bottom; numbers are stable and are
referenced from code comments.

---

## 0001 — The portability boundary is enforced by CI, not by convention

**Date:** 2026-09-11 · **Status:** Active

**Context.** The beta ships as a PWA on GitHub Pages. Later the same product
goes to the App Store and Google Play. Apple rejects thin web wrappers under
Guideline 4.2, so the iOS path is likely a genuine React Native port of the
view layer (or a Capacitor build with substantive native capability). Either
way, the value of the codebase at port time is however much of it is *not*
tied to the DOM.

**Decision.** Three hard layers, enforced by lint rules that fail CI:

| Layer | Path | Rule |
|---|---|---|
| Logic | `src/core` | No React, no DOM, no imports from the view layer |
| Capability | `src/lib/platform` | The only place allowed to touch browser globals |
| View | `src/routes`, `src/components` | May import from either, never the reverse |

`eslint.config.js` rejects `window`, `document`, `navigator`, `localStorage`,
`sessionStorage` and `indexedDB` anywhere outside `src/lib/platform`, and
rejects React or view imports inside `src/core`.
`src/main.tsx` is the single exemption: mounting is inherently host-specific
and that file is replaced wholesale by the native entry point.

**Why enforced rather than documented.** A boundary described in a README
decays within weeks — the violation is always one line and always urgent.
A boundary that breaks the build does not decay. `src/lib/platform/boundary.test.ts`
asserts the rules still fire, because a green `npm run lint` on a clean tree
proves nothing about whether the enforcement is still wired up.

**Revisit if** we abandon the native port entirely, which would make the
indirection pure cost.

---

## 0002 — Design tokens live in TypeScript; CSS is generated

**Date:** 2026-09-11 · **Status:** Active

**Context.** The brief requires one source of truth for colour, spacing,
radius and type that can be re-exported as a React Native theme object.
Tailwind v4 configures itself from CSS, which is the wrong direction.

**Decision.** `src/theme/tokens.ts` is authoritative — plain data, no imports.
`scripts/generate-tokens.mjs` emits `src/theme/tokens.css` (custom properties
plus a Tailwind `@theme` block that references them). The generated file is
gitignored and rebuilt before every `dev` and `build`. React Native will
import `tokens.ts` directly and never see the CSS.

Components reference `var(--c-*)`, never a hex literal.

---

## 0003 — The repo is public, so RLS *is* the security model

**Date:** 2026-09-11 · **Status:** Active

**Context.** GitHub Pages on the free tier requires a public repo. The entire
client bundle and its source are readable by anyone, including every `VITE_*`
value baked in at build time.

**Decision.** No secret may exist in the client, in the repo, or in a build-time
environment variable. The Supabase anon key ships because it is designed to,
and it is safe *only* because row-level security enforces access. Therefore:

- Every table enables RLS in the same migration that creates it.
- Every policy is reviewed as public-facing security, not as a convenience.
- Square, Google and Resend credentials live in Supabase edge function secrets
  and are never referenced from `src/`.
- Helper functions used by policies live in the `private` schema
  (see 0005), not `public`.

---

## 0004 — Display type is a serif, not the grotesque the brief assumed

**Date:** 2026-09-11 · **Status:** Active

**Context.** §3 of the brief specified "a tight geometric or grotesque sans in
uppercase" for display type. The actual wordmark is a high-contrast Didone
serif — the `BEEZY` lettering has strong thick/thin modulation and bracketed
serifs. A grotesque heading sitting under that logo reads as a different brand.

**Decision.** Playfair Display (a Didone with similar contrast) for display
and headings; Inter Tight for UI, body and numerals. The all-caps wide-tracked
voice from the site is preserved in the `eyebrow` style, which is where the
brief's instinct was actually pointing.

**Revisit if** we license the wordmark's actual typeface, which would be a
straight substitution in `tokens.ts`.

---

## 0005 — RLS helper functions live in a non-exposed schema

**Date:** 2026-09-11 · **Status:** Active

**Context.** `is_staff()` and `is_owner()` are called from policy expressions.
Placed in `public`, Supabase exposes them over PostgREST at
`/rest/v1/rpc/<name>`, callable by `anon` — which the security linter flagged.

Revoking `EXECUTE` is not available to us: policy expressions are evaluated as
the querying role, so revoking would break every policy that calls them.

**Decision.** Migration `0002` moved them, plus the trigger functions, into a
`private` schema. PostgREST only routes schemas in its exposed list, so they
remain callable from policies and unreachable over the API. Every function
also sets `search_path = ''` and fully qualifies its references, so a caller
cannot shadow the objects it resolves.

Policies are additionally scoped with `to authenticated` / `to anon` so an
unauthenticated request is rejected before the expression is evaluated, and
`auth.uid()` is wrapped as `(select auth.uid())` so Postgres caches it per
statement instead of re-evaluating per row.

**Verified** by simulating `anon` and two authenticated users directly against
the database: the service menu is readable signed out, private tables return
zero rows, and one customer cannot see another's vehicle.

---

## 0006 — Precache the shell only; photography loads on demand

**Date:** 2026-09-11 · **Status:** Active

**Context.** The first build precached 4.6 MB across 63 entries — icons,
splash screens and portfolio photography. A tester installing over cellular
pays that before seeing anything.

**Decision.** `globPatterns` covers JS, CSS, HTML, fonts, the two logo
variants and three icon sizes. Splash screens are excluded because iOS loads
them from `<link>` tags at launch, outside the service worker entirely.
Portfolio photos are excluded and served by a `CacheFirst` runtime handler
instead, so they cache on first view.

Result: 291 KB precache, 32 entries.

Source images live in `assets/brand-src/` — committed, but outside `public/`
so full-resolution masters never ship. `npm run brand` generates every
published asset and never reads a file it has written, so it is safe to
re-run; CI fails if `public/` drifts from what the pipeline produces.

---

## 0007 — Fonts are self-hosted

**Date:** 2026-09-11 · **Status:** Active

**Context.** The first cut linked Inter Tight and Playfair Display from
`fonts.googleapis.com`.

**Decision.** `scripts/fetch-fonts.mjs` downloads the woff2 files into
`public/fonts/` and generates `src/theme/fonts.css`. Three reasons, in order
of weight:

1. **Offline.** A linked stylesheet is unavailable with no signal, and the app
   has to work in a driveway. Self-hosted fonts precache with the shell.
2. **Privacy.** Google Fonts logs the viewer's IP. That is a third-party data
   disclosure on both stores' privacy forms, for no benefit.
3. **First paint.** A third-party stylesheet is render-blocking on a cold DNS
   lookup.

Only latin and latin-ext subsets, and only the weights the design system
actually uses — four files, 200 KB. Shipping Cyrillic and Greek would roughly
triple that for an English-only app.

Generated output is **committed**, and the script is not part of the build:
fonts change when the type stack changes, which is rarely, and a build that
reaches the network is a build that can fail offline.

---

## 0008 — Two golds, because one of them cannot carry text

**Date:** 2026-09-11 · **Status:** Active

**Context.** The brief specifies champagne `#C9A961` as the accent and says
"never for body text". Measured, it is worse than that: 2.15:1 against the
light background, which fails AA (4.5:1) and even the 3:1 needed for large
text and for focus indicators under WCAG 1.4.11. The first build used it for
the tagline, which would have failed the Lighthouse accessibility gate CI
enforces.

**Decision.** Split the token:

- `accent` `#C9A961` — **fills only.** Badges, the active nav pill, premium
  highlights. Never lettering.
- `accentText` `#8A6D2F` — the same hue darkened to 4.67:1 on `bg` and 4.87:1
  on `surface`. All gold text, plus the focus ring.

On dark both hold `#C9A961`, which already reaches 8.8:1 on near-black.

`src/theme/contrast.test.ts` asserts every foreground/background pair in the
palette, and specifically asserts that `accent` is *not* text-safe on light —
so anyone "simplifying" by collapsing the two tokens gets a failure that
explains why they exist.

---

## 0009 — PWA installability is asserted directly, not via Lighthouse

**Date:** 2026-09-11 · **Status:** Active

**Context.** CI asserted the Lighthouse audits `installable-manifest`,
`service-worker`, `maskable-icon`, `apple-touch-icon` and `themed-omnibox`.
The first real CI run failed all five with *"is not a known audit"* — Lighthouse
removed its PWA category in v12, and those audits no longer exist. The app was
fine; the config was asserting against a deleted API.

**Decision.** Do not pin CI to an end-of-life Lighthouse to keep a deprecated
category alive. Instead `scripts/check-pwa.mjs` asserts the invariants against
the built `dist/` directly, and Lighthouse keeps doing what it is still good
at — performance, accessibility (an error gate at 0.95), best practices.

The direct check is better than the audit it replaces: it verifies that every
icon the manifest *declares* actually shipped (a declared icon that 404s makes
the install prompt fail silently), that `start_url` is inside `scope`, and that
`404.html` matches `index.html` for the Pages SPA fallback — none of which the
old audit covered. It names the exact missing file when it fails.

**Verified** by deliberately breaking the manifest and confirming the script
fails with the right messages and a non-zero exit.

---

## 0010 — Pages must deploy from Actions, never from a branch

**Date:** 2026-09-11 · **Status:** Active

**Context.** With the repository's Pages source set to *Deploy from a branch*,
GitHub runs its own `pages build and deployment` workflow that publishes the
**repository root**. The root contains Vite's development `index.html`, which
references `/src/main.tsx` — a file that exists only in source form and 404s
when served. The result is a mounted-nothing page: no CSS, an empty `#root`,
and `color-scheme: light dark` painting it black in a dark-mode browser.

That is precisely what the first live load showed, while the app's own deploy
job reported success — two deployment mechanisms writing to the same site.

**Decision.** The Pages source must be **GitHub Actions**. This is a
repository setting, not a file, so it cannot be enforced in the repo; it is
recorded here and in the README so the symptom is diagnosable in seconds next
time rather than mistaken for an application bug.

**Symptom to recognise:** a black or blank page at the Pages URL, plus a
`pages build and deployment` run in the Actions tab. That workflow only exists
when the source is set to a branch.

---

## 0011 — The Pages base path is derived from the repo name, never typed

**Date:** 2026-09-11 · **Status:** Active

**Context.** The base path was written by hand as `/Beezy_App/`, matching how
the project is capitalised in prose. The repository is `beezy_app`. GitHub
Pages serves a project site at `/<repo>/` and **those paths are
case-sensitive**, so the deployed `index.html` asked for
`/Beezy_App/assets/index-*.js` on a site rooted at `/beezy_app/`. Both the
script and the stylesheet 404'd.

That produced the 0010 fallback screen on a deployment where the Pages source
was already set correctly and the build had in fact shipped — so the fallback
named a cause that was not the real one. Every layer agreed with itself and
was wrong together: the base fed the manifest `scope`, `start_url` and the
service worker scope, so `check:pwa` validated a self-consistent build, and
the Lighthouse job copied `dist/` into `site/Beezy_App/` before auditing it.
CI was green and the deploy job reported success.

**Decision.** `vite.config.ts` derives the base from `GITHUB_REPOSITORY`
(`/${repo}/`), falling back to `/beezy_app/` for local builds. `BASE_PATH`
still overrides it for the eventual custom domain. The Lighthouse job takes
its directory from `github.event.repository.name` rather than a typed literal,
so the audited layout cannot disagree with the built one.

`scripts/check-pwa.mjs` asserts the manifest `scope` equals `/<repo>/`
whenever `GITHUB_REPOSITORY` is set and `BASE_PATH` is not. This is the check
that would have caught the bug: it is the only one that compares the build
against something outside itself.

**Why a check and not just a fix.** The failure is invisible to every
self-consistent test — the build, the PWA audit and the deploy all pass. Only
a comparison against the real repository name can fail.

**Verified** by building with `BASE_PATH=/Beezy_App/` and confirming
`check:pwa` exits non-zero naming the mismatch, then building normally and
loading the result in a browser under `/beezy_app/`: the app mounts, the boot
fallback is absent from the DOM, and no request 404s.

**Revisit if** we move to a custom domain, where the base becomes `/` and the
repo-name check is skipped by the `BASE_PATH` override.

---

## Open — Outbound email sending domain

**Date:** 2026-09-11 · **Status:** Blocked, needed by Phase 4

Resend/Postmark verify *domains*, and we do not own `gmail.com`, so
`beezyluxurydetailing@gmail.com` cannot be a verified sender. Mail sent as
`@gmail.com` from third-party infrastructure fails DMARC alignment and lands
in spam.

The intended fix was to send from `beezynola.com` with `Reply-To` the Gmail
address, but we do not control that domain's DNS. Options, in preference
order:

1. Get DNS access to `beezynola.com` from whoever registered it (likely
   Brandon, via Squarespace). Cheapest and best for brand continuity.
2. Register a dedicated domain for the app (~$12/yr) and send from there.
   Also gives us a custom Pages domain, which removes the `/beezy_app/`
   base path.
3. A provider offering single-sender verification without DNS. Works, but
   deliverability is materially worse and it cannot be fixed later without
   changing the sending address on customers.

Not blocking any earlier phase. Revisit before Phase 4.
