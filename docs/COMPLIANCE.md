# Store compliance

Tracks, per guideline, what the app does today, what must change before
submission, and why we expect to pass. **Update this in the same commit as any
feature that touches it.** Re-read it before marking a phase complete.

Nothing is submitted yet. The beta is a PWA on GitHub Pages, installed by a
handful of invited testers. Everything below is built toward a future
submission to both the App Store and Google Play.

---

## Status summary

| Guideline | Area | Today | Before submission |
|---|---|---|---|
| 4.2 | Minimum functionality | Boundary enforced in CI (0001) | Ship the four native anchors |
| 3.1.5(a) | Physical goods & services | Square only, no IAP | Reviewer notes explaining the exemption |
| 5.1.1(iv) | Login gating | Menu public; allowlist gates signup | **Remove the tester allowlist** |
| 5.1.1(v) | Account deletion | Phase 2 | Plus a public web deletion URL for Play |
| 4.8 | Sign in with Apple | Provider slot reserved | Implement, equal prominence |
| 5.1.1(i) | Purpose strings | Drafted below | Copy into Info.plist / manifests |
| 2.1 | Reviewable build | — | Demo account with seeded data |
| — | Privacy labels / Data Safety | Inventory in DATA_MODEL.md | Fill both forms from the inventory |

---

## 4.2 Minimum Functionality — the central risk

A Capacitor build wrapping this PWA is exactly the profile Apple rejects: a
bookings website in a WebView. This is not talked around at review time; it is
built out of, starting now.

**Four native anchors**, designed in as load-bearing rather than added at
submission:

1. **Guided camera capture.** Framing overlay that holds the *after* shot to
   the same angle as the *before*, on-device EXIF and geotag. `getUserMedia`
   can only approximate this, and the comparison slider depends on it.
2. **Actionable push notifications.** "Beezy is 10 minutes out — move your
   car?" with inline Yes / Reschedule.
3. **Calendar write (EventKit).** The appointment lands in the customer's real
   calendar, not an `.ics` download.
4. **Background sync and a Home Screen widget** showing the next appointment.
   A widget is concrete, visible evidence a reviewer can see on the springboard.

Android is not held hostage to this: a Trusted Web Activity via Bubblewrap is
an accepted Play distribution method, so Play is reachable months earlier.

**Enforcement today:** `eslint.config.js` fails CI on any browser global
outside `src/lib/platform`, and on React or view imports inside `src/core`.
See DECISIONS.md#0001.

---

## 3.1.5(a) Goods and Services Outside of the App

Detailing is a physical service performed on a real car in the customer's
driveway. Payments and maintenance plans **must not** use In-App Purchase;
Square is the correct and permitted processor.

**Standing rules:**

- No digital-only goods, ever. Adding one would move us under 3.1.1.
- Subscription copy describes **physical services only**. A reviewer skimming
  "priority booking window" or "5% off add-ons" can misread tier benefits as
  in-app perks. Every benefit is stated as a service or as a price on a
  service:

  | Never write | Write instead |
  |---|---|
  | "Priority booking window" | "Beezy holds Saturday mornings for Signature members" |
  | "Unlocks premium features" | "Includes a quarterly clay bar treatment" |
  | "Dedicated slot" | "A standing weekly appointment on your chosen day" |

**Reviewer note to submit** (draft):

> Beezy Luxury Detailing is a mobile auto detailing business operating in the
> Greater New Orleans area. All purchases in this app pay for physical
> services performed on the customer's vehicle at their address by a human
> technician. Subscription plans are prepaid packages of those same physical
> services — recurring washes, clay bar treatments, ceramic maintenance — and
> confer no digital content or app functionality. Under Guideline 3.1.5(a)
> these are goods and services consumed outside the app, processed by Square.
> No digital goods are sold.

---

## 5.1.1(iv) Account sign-in

Content that does not require an account must be browsable signed out. Today
and permanently:

- Public gallery, service menu and pricing, About, service-area map, FAQ.
- Verified at the database level: the `services` policy grants `select` to
  `anon`, and this is tested (DECISIONS.md#0005).

Sign-in is required only at booking, garage, and payment — all of which are
account-bound by nature.

> **Pre-submission task.** The `tester_allowlist` table gates account creation
> to invited beta emails. That is correct for a closed beta on a public URL
> and **conflicts with 5.1.1(iv)**. It must be removed before submission.
> Tracked in migration `0001`, table comment included.

---

## 5.1.1(v) Account deletion

Mandatory on both stores. Must be reachable **in the app** — an "email us to
delete" link is a rejection — and must actually remove or anonymise the data.

**Built in Phase 2**, not deferred:

- Reachable from More → Profile → Delete account, two taps from the tab bar.
- Confirms destructively, then calls a Supabase edge function.
- Deletes the `auth.users` row, which cascades to `profiles`, `vehicles`
  and their photos.
- Bookings and payments attached to completed work are **anonymised, not
  deleted** — the customer link is severed and PII cleared, but the financial
  record survives, because Beezy has tax obligations on transactions that
  actually happened. `profiles.deleted_at` marks the tombstone.
- This distinction is disclosed in the privacy policy and in the confirmation
  copy, since "we keep the invoice" must not be a surprise.

**Google Play additionally requires** a publicly reachable web deletion URL
declared in the store listing, usable without installing the app. To build
alongside the privacy policy on the Pages site.

---

## 4.8 Sign in with Apple

We offer Google Sign-In, which makes Sign in with Apple **required on iOS** at
submission, presented with equal prominence — same position, same visual
weight, not a smaller secondary button.

Added to the auth abstraction in Phase 2 as a provider slot, unimplemented
during beta, so enabling it later is configuration rather than a refactor.

---

## 5.1.1(i) Purpose strings

Every permission needs a specific, human-readable justification. These strings
are used verbatim in the web permission prompts now, so the copy is already
tested by the time it reaches a manifest.

| Permission | String |
|---|---|
| Camera (`NSCameraUsageDescription`) | "Beezy uses your camera to photograph your vehicle's condition before and after service, so the work is documented and the quote matches the car." |
| Photo library (`NSPhotoLibraryUsageDescription`) | "Choose existing photos of your vehicle to include with your booking." |
| Location, when in use (`NSLocationWhenInUseUsageDescription`) | "Beezy uses your location to confirm your service address and to route the van to you." |
| Notifications | "Get appointment reminders, and a heads-up when Beezy is on the way." |

Rules: name the benefit to the customer, never the mechanism. Never request a
permission before the screen that needs it.

---

## 2.1 App Completeness — a reviewable build

A reviewer cannot book a real mobile detail in New Orleans, and a review that
dead-ends at an empty state gets rejected as incomplete.

`scripts/seed-demo.ts` (Phase 1) produces a demo account with a populated
garage, past jobs with before/after photos, an active subscription, and a
bookable future slot. Square stays in sandbox for the reviewer credentials.

Building it now also gives us development fixtures, so it is not
submission-only overhead.

---

## Privacy labels and Play Data Safety

Keep the field-level inventory in `DATA_MODEL.md` current. Filling these forms
is trivial with a current inventory and miserable without one.

Collected today or planned: name, email, phone, service address, precise
location, vehicle details including VIN, vehicle photography, and payment
tokens (never raw card data — Square holds those).

---

## PWA / beta constraints

These shape the product now and mostly disappear at port time.

- **Web push on iOS requires Home Screen installation** and permission granted
  from the installed instance. It does not work in a Safari tab. Email and SMS
  are the reliable reminder channels during beta; push is an enhancement.
- **No background execution.** Geofenced arrival notifications and background
  route tracking are unavailable. The tech flow is built around explicit taps.
- **No install prompt on iOS.** Safari has no `beforeinstallprompt`; the
  in-app instruction sheet covers it and hides itself in standalone mode.
- **Storage eviction.** Home Screen apps are exempt from Safari's seven-day
  eviction, but the offline queue is designed to survive data loss regardless.
- **`noindex`** is set in `index.html` and must be removed before launch.

## Platform parity

The Liquid Glass nav is the most iOS-flavoured element in the design.
`backdrop-filter` is well supported in Safari and Chrome, so it works on the
web today. At port time Android gets the same floating capsule with
Material-style blur and elevation — not a degraded copy. No platform-exclusive
feature without flagging it first.
