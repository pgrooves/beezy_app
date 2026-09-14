# Testing

How to install the beta, what to check this phase, and how to report what you
find.

---

## Install it (iPhone)

Safari has no install button, so this is manual. It takes about fifteen
seconds.

1. Open **https://pgrooves.github.io/beezy_app/** in **Safari**. Chrome and
   Firefox on iOS cannot install to the Home Screen — it has to be Safari.
   (All lower-case. GitHub Pages URLs are case-sensitive, so a capitalised
   `Beezy_App` is a 404, not a redirect.)
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

## What to test now

The whole app is walkable, running on demo data. Nothing saves, and nothing is
charged — anything not wired up says so on the screen.

**The booking flow** is the screen that matters most:

- [ ] Home → **Book a detail**, then all seven steps
- [ ] The running total at the bottom updates as you pick things
- [ ] Picking a bigger vehicle raises it; so does a worse condition
- [ ] The Deposit step breaks the price down — base, vehicle, condition
- [ ] Choosing **Extreme** condition drops the deposit and says Beezy will
      confirm on site
- [ ] Continue stays greyed out until the step has what it needs

**Getting around:**

- [ ] The bottom bar floats, and content scrolls *under* it
- [ ] The gold pill slides between tabs rather than jumping
- [ ] **•••** opens a sheet, not a page
- [ ] In that sheet, **Preview as → Owner** switches to Beezy's side of the app
- [ ] Owner: Today, Schedule, Jobs, Clients, Reporting
- [ ] **Preview as → Tech**: fewer tabs, and no money anywhere

**Worth a look:** Gallery (drag the before/after slider), Garage, About.

**Not built yet, on purpose:** signing in, saving anything, real photos,
payments, calendar, email or texts.

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
