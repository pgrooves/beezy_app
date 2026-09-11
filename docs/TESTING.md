# Testing

How to install the beta, what to check this phase, and how to report what you
find.

---

## Install it (iPhone)

Safari has no install button, so this is manual. It takes about fifteen
seconds.

1. Open **https://pgrooves.github.io/Beezy_App/** in **Safari**. Chrome and
   Firefox on iOS cannot install to the Home Screen — it has to be Safari.
2. Tap the **Share** button in the toolbar (square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.

You should now have a **Beezy** icon — white car mark on black — that opens
full screen with no Safari address bar.

The app has an **Install this app** button that walks through the same steps
if you get lost. It disappears once you are installed.

### Android

Chrome offers **Install app** in its menu, or prompts on its own. Same URL.

---

## Updates

Updates arrive silently on next launch. When a new version is ready you get a
small **"A new version is ready — Reload"** bar at the bottom. Tap Reload.

If something looks wrong or stale, force it: close the app from the app
switcher and reopen. The build number at the bottom of the screen tells us
which version you were on — **include it in every report**.

---

## What to test in Phase 1

Phase 1 is the pipeline, not the app. There is deliberately almost nothing to
use yet. What matters is that the plumbing works on real hardware:

- [ ] It installs, and the icon looks right on your Home Screen
- [ ] Opening it fills the screen — no address bar, no browser chrome
- [ ] Nothing is hidden behind the notch or the home indicator
- [ ] The logo and text are sharp, not blurry or pixelated
- [ ] The appearance toggle works: Light, Dark, System
- [ ] On System, flipping your iPhone's appearance flips the app immediately
- [ ] Status bar text stays readable in both themes
- [ ] It opens with no network (airplane mode) after the first launch
- [ ] It says "Installed — running standalone" once installed
- [ ] Rotating the phone does not break the layout

**Not in this phase:** booking, sign-in, the service menu, photos, the tab
bar. Those arrive in Phases 2 and 3.

---

## Reporting

Text Beezy, or open a GitHub issue. Include:

1. **The build number** from the bottom of the screen (e.g. `0.1.0 · build a1b2c3d`)
2. Your phone and iOS version (Settings → General → About)
3. What you expected, and what happened
4. A screenshot or screen recording — a recording is worth ten sentences for
   anything involving animation or layout

Small and specific beats comprehensive. "The gold text on the white background
is hard to read outside" is a better report than "the design looks off."

---

## Running it locally

```bash
npm install
cp .env.example .env     # fill in VITE_SUPABASE_ANON_KEY
npm run dev
```

The anon key is in the Supabase dashboard under **Settings → API**. It is a
public value by design — it ships in the client bundle — and is safe only
because row-level security enforces access (DECISIONS.md#0003).

### Checks

```bash
npm run typecheck
npm run lint       # includes the portability boundary rules
npm test           # includes boundary enforcement regression tests
npm run build
npm run brand      # regenerate icons/logos from assets/brand-src/
```

CI runs all of these on every PR, plus a Lighthouse PWA audit, and fails if
`public/` has drifted from what `npm run brand` produces.

Note the service worker is disabled in dev (`devOptions.enabled: false`), so
install and offline behaviour must be tested against a real build:

```bash
npm run build && npm run preview
```
