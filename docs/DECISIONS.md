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

**Date:** 2026-09-11 · **Status:** Superseded by 0016

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

## 0012 — The shell is built on fixtures, and says so on screen

**Date:** 2026-09-14 · **Status:** Active

**Context.** The whole app needed to be walkable before any third-party
integration existed, so every screen could be judged as a product rather than
imagined from a plan.

**Decision.** `src/core/fixtures.ts` holds demo data shaped exactly like the
Supabase schema, so swapping an array for a query is a per-screen change and
no component moves. Real prices and real service copy, because a shell built
on lorem ipsum cannot be evaluated.

Two things are deliberately *not* faked:

- **Pricing is real.** `src/core/pricing.ts` is the production engine, tested
  against the published menu. The running total, the size band, the deposit
  and the job duration on every screen are computed, not typed in.
- **Anything unwired says so.** The `DemoNote` component marks surfaces that
  are demo-only and names what they are waiting on. A shell that looks
  finished but silently does nothing is worse than an obvious placeholder.

A `RoleSwitcher` in the More sheet stands in for sign-in so both shells can be
browsed. It disappears when auth lands: role will come from the profile and
`devMode` goes false.

---

## 0013 — Money is set in the numeric face, not the display serif

**Date:** 2026-09-14 · **Status:** Active

Prices were picking up `.font-display` to get heading size, which put them in
Playfair — a Didone with no tabular figures. A column of prices in it does not
align, and the glyphs read as a different voice from the rest of the UI.

`.money` sets the numeric family at heading scale with `tabular-nums`. The
display serif stays for headings and for the referral code, which is a code
rather than an amount.

---

## 0014 — Sheets use a denser glass than the nav capsule

**Date:** 2026-09-14 · **Status:** Active

The nav capsule at 68% opacity reads as depth: it is small, and content
passing under it is the effect. A full-height sheet at the same value let the
page behind collide with the sheet's own section labels — "BEEZY" landing on
top of a membership card.

`glassSheet` (93% light / 94% dark) is the sheet material; `glass` stays the
capsule material. Both degrade to a solid surface under Reduce Transparency
and where `backdrop-filter` is unsupported.

---

## 0015 — A screenshot tour is part of the test suite

**Date:** 2026-09-14 · **Status:** Active

**Context.** Unit tests cannot see a route that resolves to nothing, an asset
that 404s only under a nested path, or a chart that renders empty.

`scripts/tour.mjs` walks every screen in both themes at phone size, and walks
the booking flow by clicking through all seven steps. It fails on a page error,
a failing subresource, a redirect, or a page where `#root` never mounted.

**It has already paid for itself.** In its first two runs it caught:

1. **Relative icon hrefs.** `./favicon.png` resolves against the *current* URL,
   so on `/beezy_app/admin/jobs/bk-202` it asked for
   `/beezy_app/admin/jobs/favicon.png`. Worse than a missing favicon: iOS would
   have had no icon when adding to the Home Screen from any nested page.
2. **A frozen booking flow.** `BookLayout` selected `quote` and `canAdvance`
   from the Zustand store — both stable function references, so the component
   never re-rendered. The running total and the Continue button would have sat
   dead while the customer filled the flow in.
3. **An empty revenue chart.** Percentage bar heights inside an auto-height
   column resolve to zero.
4. **Ambiguous routing.** Two sibling routes both declared `path="/book"`.

A note on the harness itself: `serve` returns its own 404 page for deep links
rather than the app's `404.html`, and the tour's original "is the page nearly
empty" check was loose enough to let that pass as a rendered screen. The tour
now asserts `#root` actually mounted, and the local server runs with a rewrite
that mirrors what Pages does. A test that cannot fail is worse than no test.

---

## 0016 — Display face is Josefin Sans 300, and caps are rationed

**Date:** 2026-09-14 · **Status:** Active · Supersedes 0004

**Context.** Playfair read cheap in place. The reasoning in 0004 was right
about the pairing logic and wrong about the conclusion: free Didones have
clumsy thick/thin transitions at display sizes, and setting one *underneath* a
Didone wordmark made the headings compete with the mark rather than support it.

**Decision.** Josefin Sans 300 — a light art-deco geometric. It contrasts with
the wordmark instead of imitating it, which is the standard luxury pairing: the
mark stays the ornamental element and the headings get out of its way. Chosen
from a rendered comparison of fourteen faces across two rounds
(`scripts/font-trial.mjs`), judged in the real app rather than as specimens.

**Caps are rationed to screen titles.** `.display-caps` is 26px at 0.09em and
is used for the screen title and nothing else; longer headings stay mixed case.
Uppercase everywhere would put screen titles, section labels and card headings
into one treatment at three sizes and flatten the hierarchy, since `.eyebrow`
is already uppercase. Record names stay mixed case at any size.

Screen titles wrap rather than truncate — verified across every admin screen:
no overlap with the brand mark, no horizontal overflow, tallest header 135px.

**A note on the trial that produced this.** The first two rounds were invalid.
Google-hosted fonts registered no faces in this environment, so every candidate
rendered as the same fallback and only the per-candidate weight and tracking
differed; two shots came out byte-identical, which is what gave it away.
`document.fonts.check()` had returned true for all of them. The harness now
self-hosts each candidate and measures rendered text width against the generic
fallback, because an API that reports success for a font that never loaded is
worse than no check at all.

---

## 0017 — The screenshot harness proves the glass is blurring before it captures

**Date:** 2026-09-14 · **Status:** Active

**Context.** Headless Chromium, launched plainly, renders `backdrop-filter` as
a no-op. Nothing reports it. `getComputedStyle` still returns
`blur(36px) saturate(1.5)`, the translucent fill still paints, and the result
looks entirely plausible — a pale wash sitting over the content. The one thing
missing is the blur.

That means every screenshot this repo has produced, from the first tour
onward, showed the Liquid Glass surfaces *without their glass*. Every
judgement made from those images — the fill opacities, the rim values, whether
a nav label survives a photo scrolling underneath — was made against a render
missing the effect being judged.

**Decision.** All three Playwright harnesses launch through
`scripts/lib/browser.mjs`, which adds `--enable-unsafe-swiftshader
--use-gl=angle --use-angle=swiftshader` and then *measures* that the blur
composites before any screenshot is taken. The check renders 6px black/white
stripes under a pane carrying the app's own glass recipe and reads the pixels
back: a real `blur(36px)` flattens them to within a few levels of uniform grey
(measured: 5), a dropped filter leaves them fully banded (measured: 97). Over
20 throws.

`--enable-gpu` does not fix it; only the SwiftShader ANGLE backend does. Both
were measured, not assumed.

**Why it throws rather than warns.** A harness that renders glass without
glass is worse than no harness, because its output looks fine. Verified by
deliberately emptying the launch args: the tour aborts on the first check.

---

## 0018 — Every saturated colour gets a text-safe pair, and contrast is asserted per ground

**Date:** 2026-09-14 · **Status:** Active

**Context.** CI had been red on `main` for three pushes. The Lighthouse gate
(accessibility ≥ 0.95) was scoring 0.90 on two audits:

- **`color-contrast`.** `inkSubtle` was `#8E8E8E`, carrying a comment claiming
  AA "at 14px+". Both halves were wrong: 3.13:1 is below AA at any size, and
  WCAG's large-text floor is 24px, while every call site — `.eyebrow`, ListRow
  details, Stat captions, DemoNote — renders it at 12–13px. Separately, the
  status `Chip` set its 10px label in the bright fill colours: green measured
  2.21:1 on white, amber 2.05:1, red 3.42:1.
- **`aria-hidden-focus`.** The closed More sheet was `aria-hidden` while its
  contents were still in the tab order, so a keyboard user could tab into a
  drawer they could not see.

**Why the suite stayed green.** `contrast.test.ts` asserted `inkSubtle` at
AA_LARGE (3.0) only, on the strength of that same wrong comment, and never
asserted the status colours at all. A threshold is only as good as the claim
it encodes.

**Decision.**

1. **The fill/text split generalises.** `successText`, `warningText` and
   `dangerText` join `accentText`. Dark mode shares one value per hue, as it
   already did for gold.
2. **Contrast is asserted against every ground**, `surfaceAlt` included. That
   widening immediately caught two more the old suite never looked at:
   `accentText` sat at 4.43:1 on the raised surface, and the new
   `warningText` at 4.46:1. Both darkened. 82 assertions, up from 24.
3. **`inkSubtle` is now `#6E6E6E`**, nearly `inkMuted`. That collapse is
   real and is documented rather than worked around: on a near-white ground
   three visibly separated greys cannot all clear 4.5, so light mode carries
   the tertiary tone with size and weight instead.
4. **`aria-hidden` implies `inert`** on the More sheet. Per-element `tabIndex`
   had been tried and did not cover it — anything passed as `footer` brought
   its own controls, which is exactly what the dev RoleSwitcher did.

**Verified.** Lighthouse accessibility 0.90 → 1.00 against the built app, no
failing audits. The tab order was walked 60 stops with zero landing inside the
closed sheet. 82 contrast assertions, 30 PWA checks, the full tour in both
themes.

---

## 0019 — The database is kept awake by a scheduled read, outside the app

**Date:** 2026-09-20 · **Status:** Active

**Context.** A free-tier Supabase project is paused after a stretch with no
activity, and it does not restart on its own — someone has to press restore in
the dashboard. The beta's usage pattern is exactly the one that triggers this:
a handful of testers opening the app irregularly, with quiet weeks between
rounds. The failure is silent until it is loud — a tester taps the icon and
every query fails, which reads as a broken app rather than a dormant project.

**Decision.** A scheduled GitHub Actions workflow
(`.github/workflows/keep-alive.yml`) runs `scripts/keep-alive.mjs` every third
day. It issues one unauthenticated `GET /rest/v1/services?select=id&limit=1`
and exits.

Four things about it are deliberate:

1. **It is not part of the app.** Not a module, not an import, not a build
   step. Nothing in `src/` changed to add it, so there is no code path by
   which a keep-alive failure can reach a bundle, a deploy, or a user's
   session. The app does not know it exists.

2. **It reads `services`, and adds no table.** That table already carries an
   anon-readable policy, because the service menu must be browsable signed out
   (see #0003 and `0002_private_schema_helpers.sql`). A dedicated `keep_alive`
   table — the obvious first instinct — would mean a migration and a fresh RLS
   policy granting the anon role read access to something new, which is more
   public attack surface bought for exactly the same round-trip. The cheapest
   schema change is the one not made.

3. **It has no dependencies.** One `fetch` against PostgREST is what
   `@supabase/supabase-js` issues underneath anyway, so the job is a checkout
   and a `node` invocation — no `npm ci`. A lockfile conflict or a registry
   outage cannot be the reason the database paused.

4. **It is its own workflow, not a job in CI & Deploy.** A keep-alive run never
   appears among the logs anyone reads to judge a push, and can never turn the
   deploy pipeline red.

**On "fail silently".** The script retries three times with backoff, and a
transient blip costs nothing. But a *persistent* failure exits non-zero and
turns that run red. A keep-alive that swallows its own errors is the worst
available design: the database pauses on schedule anyway and nothing ever
said so, which is the precise failure this entry exists to prevent. The
blast radius of that red run is one workflow's history and an email to the
repo owner — the app and the deploy job are untouched either way. Silent
toward users, loud toward the one person who can fix it.

**Two things that will switch this off, neither of them visible in the code.**

- **GitHub disables scheduled workflows in a repository with no commits for
  60 days.** This is the sharp edge: a project quiet enough to need a
  keep-alive is a project quiet enough to lose one. GitHub emails the repo
  admin before it happens; the fix is to re-enable the workflow in the
  Actions tab, or push anything. Worth checking on any return to a long-idle
  repo — before concluding the database pause was unexplained.
- **`schedule:` only fires on the default branch.** The workflow does nothing
  at all until it is merged to `main`, regardless of how correct it is on a
  feature branch.

**Where the credentials live, and the trap in it.** The job reads
`vars.X || secrets.X`. GitHub keeps variables and secrets one tab apart under
the same settings page, and `vars.*` reads as an empty string when the value
went into the other tab — indistinguishable from never having configured it.
Reading both removes a whole class of setup error. Either store is correct
here, because both values are public by design (#0003); a value arriving from
the secret store is masked in the log, so the success line prints `***` for
the host.

Two separate systems also call this "secrets": Supabase's dashboard has an
edge function secret store, and values put there are invisible to GitHub
Actions. Both mistakes were made while setting this up, costing three red
runs, which is why the script's own error message now names the right store
explicitly rather than saying "repository variables".

**`deploy.yml` still reads `vars.*` alone.** If the two values live only in
the Secrets tab, its build step continues to compile with blank Supabase
config. That is currently harmless — `src/lib/supabase.ts` is imported by
nobody, so Vite drops it — but the first Phase 3 import turns it into a module
that throws at load, on a build CI calls green. Either move the values to the
Variables tab or give `deploy.yml` the same fallback before Phase 3.

**Revisit if** the project moves to a paid tier (no auto-pause, delete the
workflow), or to a host with real cron (Vercel, Supabase's own `pg_cron`),
either of which is a better home for this than a CI runner.

**Verified.** The success path was run against a stub PostgREST on loopback:
exactly one request, correct path and `apikey`/`authorization` headers, one
line of output, exit 0, no key printed. The retry-and-fail path was run twice,
against a blocked host and against a stub returning 401: three attempts, 2s
and 8s backoff, one line per retry, exit 1, and the key absent from the output
in both. Missing configuration exits 1 immediately without retrying. That the
`anon` role really can read `services` under RLS was confirmed on the live
database with `set local role anon`, which returned a row. Typecheck, lint, 82
tests, the build, 9 asset checks and 30 PWA checks were all green afterwards,
and `keep-alive` appears nowhere in `dist/`.

---

## Open — Nav labels fail AA over photography

**Date:** 2026-09-14 · **Status:** Open, found by #0017

The first honest render of the nav capsule — blur actually compositing —
measured the tab labels over a bright vehicle photo scrolling underneath:

| Label | Light | Dark |
|---|---|---|
| Home / Book / Garage / More | 2.90 – 3.16 | 4.41 – 4.63 |
| Gallery (active, gold) | 2.70 | 3.77 |

AA needs 4.5. Light mode fails on every label; dark is borderline and fails on
two. This was invisible for as long as the harness was dropping the blur,
because an unblurred backdrop kept far more of the fill's own lightness.

**Raising the fill will not fix it.** A muted grey label sits near the middle
of the luminance range, so it collides with any mid-tone backdrop; reaching
4.5 against a blurred mid-grey photo needs the fill at roughly 86%, which is
frost, not glass — and the brief is explicit that the bar is never opaque.
The variable that actually moves the number is the label colour: over an
arbitrary photo the inactive label needs to be around `#2E2E2E` in light mode,
and the active gold around `#5C4718` — well past where #0018 already took
`accentText`, which is as dark as that token can go before it stops
reading as gold at all.

That trades directly against the design intent recorded on the `navLabel`
token — that this is the one label in the app meant to be quieter than the
thing it labels. It is a real tradeoff and wants a decision, not a unilateral
retune. Left open deliberately.

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
