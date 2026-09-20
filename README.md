# Beezy Luxury Detailing

Booking and operations app for [Beezy Luxury Detailing](https://beezynola.com),
a mobile luxury auto detailing business in Greater New Orleans.

**Make life easy, call Beezy.**

Two experiences behind one login: a customer app for booking, garage and
gallery, and an admin/tech portal for the day's jobs, schedule, clients and
reporting. Role is resolved at auth time and determines the entire shell.

**Beta:** installable PWA at **https://pgrooves.github.io/beezy_app/**
(lower-case — Pages URLs are case-sensitive)
**Later:** App Store and Google Play, from this same codebase.

> **Repository setting this depends on.** Pages **Source** must be
> **GitHub Actions** (Settings → Pages → Build and deployment). On *Deploy
> from a branch* GitHub publishes the repo root instead of `dist/`, and the
> site renders as a blank black page — the root `index.html` is Vite's dev
> entry and its `/src/main.tsx` never resolves when served. If you see a black
> page and a `pages build and deployment` run in the Actions tab, that is the
> cause. See [DECISIONS.md#0010](docs/DECISIONS.md).
>
> **The base path is derived, not typed.** Pages serves this site at
> `/<repo>/` and those paths are case-sensitive, so the build takes its base
> from `GITHUB_REPOSITORY`. Do not hard-code it — a mismatch 404s every asset
> while CI stays green. See [DECISIONS.md#0011](docs/DECISIONS.md).

---

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Repo, PWA pipeline, CI → Pages, Supabase base schema, docs | Done |
| 2 | Navigable shell: both tab bars, every screen, live pricing on fixtures | **Done** |
| 3 | Supabase auth, real data, account deletion | Next |
| 4 | Square deposits, Google Calendar, confirmation email | |
| 5 | Today, Schedule, Jobs pipeline, Clients, photo checklists | |
| 6 | Subscriptions | |
| 7 | Reporting | |
| 8 | Push, SMS, referrals, production Square, store submission | |

---

## Getting started

```bash
npm install
cp .env.example .env     # add VITE_SUPABASE_ANON_KEY
npm run dev
```

The service worker is disabled in dev. To test install and offline behaviour,
build first:

```bash
npm run build && npm run preview
```

### Commands

| Command | Does |
|---|---|
| `npm run dev` | Dev server (regenerates theme tokens first) |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint, including the portability boundary rules |
| `npm test` | Vitest, including boundary enforcement regression tests |
| `npm run tokens` | Regenerate `src/theme/tokens.css` from `tokens.ts` |
| `npm run brand` | Regenerate icons, logos and splashes from `assets/brand-src/` |
| `npm run keep-alive` | One cheap Supabase read, so the free-tier project is not auto-paused |

---

## Layout

```
src/
  core/         Pure business logic. No React, no DOM. Ports to native unchanged.
  lib/
    platform/   The only code allowed to touch browser globals.
    supabase.ts
  components/   Shared UI
  routes/       Screens
  theme/        tokens.ts is the single source of truth
assets/brand-src/  Logo and photo masters. Committed, never published.
public/         Generated assets, privacy policy
supabase/migrations/  Numbered SQL. Never edited once applied.
docs/           Compliance, decisions, data model, design system, testing
scripts/        Token and brand asset generation
```

### Three rules that are enforced, not suggested

1. **Browser globals live only in `src/lib/platform`.** `window`, `document`,
   `navigator`, `localStorage` and IndexedDB are unavailable anywhere else —
   CI fails on a violation. Add an adapter method instead.
2. **`src/core` imports no React, no DOM, and nothing from the view layer.**
   It is the part of the codebase that survives the native port intact.
3. **No secrets, anywhere.** This repo is public and the client bundle ships
   whatever `VITE_*` holds. The Supabase anon key is safe only because
   row-level security does the real enforcement. Everything else lives in an
   edge function.

See [`docs/DECISIONS.md`](docs/DECISIONS.md) for why.

---

## Documentation

| Document | Contents |
|---|---|
| [COMPLIANCE.md](docs/COMPLIANCE.md) | Per-guideline store readiness and pre-submission tasks |
| [DECISIONS.md](docs/DECISIONS.md) | Architecture decisions and their reasoning |
| [DATA_MODEL.md](docs/DATA_MODEL.md) | Schema plus the field-level collection inventory |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Palette, type, Liquid Glass, accessibility |
| [TESTING.md](docs/TESTING.md) | How testers install, what to check, how to report |

Privacy policy: [`public/privacy.html`](public/privacy.html), served at
`/beezy_app/privacy.html`.

---

## Stack

React · TypeScript · Vite · Tailwind v4 · vite-plugin-pwa · Supabase
(Postgres, auth, storage, edge functions) · Square (payments, bookings,
subscriptions) · deployed to GitHub Pages by Actions on every merge to `main`.

React is chosen specifically because the logic layer, hooks and state
management port to React Native essentially unchanged; only the view layer is
rewritten.
