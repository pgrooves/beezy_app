# Progress ledger

The running record of where the build is, what is waiting on whom, and what
comes next. It exists so that no thread starts cold and no outstanding item
is forgotten between sessions.

**Every working session reads this first and updates it before finishing.**
Tick items off with the date rather than deleting them, add anything new the
moment it is discovered, and keep the "Next up" section true. Reasoning
belongs in [DECISIONS.md](DECISIONS.md); this file links to it rather than
repeating it.

_Last updated: 2026-10-30 — Chauffeur C1 (front door) on main; C2 (trip builder preview on sample rates) built on branch `chauffeur-c2`. Phase 4 is still next for Detailing; the credentials handover is unchanged._

---

## Phases

| Phase | Scope | State |
|---|---|---|
| 1 | Repo, PWA pipeline, CI → Pages, Supabase base schema, docs | Done |
| 2 | Navigable shell on fixtures | Done |
| 3 | Supabase auth, real data, account deletion | **Done and deployed.** Sign-in waits only on the credentials handover below |
| 4 | Square deposits, Google Calendar, confirmation email | Next — can be built before the credentials arrive (see below) |
| 5 | Today, Schedule, Jobs pipeline, Clients, photo checklists | |
| 6 | Subscriptions | |
| 7 | Reporting | |
| 8 | Push, SMS, referrals, production Square, store submission | |

### Chauffeur track ([DECISIONS.md#0024](DECISIONS.md))

A second line of business behind a front door at launch. Sizes are relative.

| Step | Scope | Size | State |
|---|---|---|---|
| C1 | Front door, line switch, Detailing home at `/detailing`, Chauffeur placeholder | S | **Done 2026-10-30**, on main |
| C2 | Chauffeur customer screens on fixtures: trip builder, live estimate, review ([#0025](DECISIONS.md)) | M | **Built 2026-10-30** on branch `chauffeur-c2` |
| C3 | `business_line`, `trips`, `trip_stops`, `fleet_vehicles`, `rate_cards` + RLS; `quote-trip` and `places` edge functions | L | Waits on the questions below and a Google Maps billing account |
| C4 | Dispatch on Today: lanes per person and vehicle, conflict check, calendar sync per line | M | Waits on Phase 4 calendar sync |
| C5 | Chauffeur's view, live trip status, "on location" text | M | Waits on Phase 8 SMS |

---

## Waiting on Trey and Brandon's credentials handover

Nothing below can be done by Claude: each needs a login only Trey or
Brandon holds. Until items 1 and 2 are done, **nobody can sign in to the
app** — the code, database and deploy are ready and waiting.

- [ ] **1a. Temporary sender (decided 2026-10-01):** sign-in emails send
      from `pocketgroovespublishing@gmail.com` with sender name `Beezy`, via
      Gmail SMTP (`smtp.gmail.com`, port 587, app password from that
      account) until the handover. Trey sets this up; tick when a code email
      has arrived. Steps in the conversation summary and in
      `supabase/templates/README.md`.
- [ ] **1. Permanent sender at the handover.** Replace the temporary Gmail
      SMTP with Beezy's own address. Options: the Beezy Gmail
      (`beezyluxurydetailing@gmail.com`, app password from that account), or
      a domain-verified service such as Resend (needs DNS access — see
      *Open — Outbound email sending domain* in DECISIONS.md). Supabase →
      Authentication → Emails → SMTP Settings; the templates need no change.
      [DECISIONS.md#0021](DECISIONS.md)
- [ ] **2. Paste in the branded sign-in emails.** Ready in
      `supabase/templates/` (see its README): Beezy logo, the code in large
      type, no link, no mention of Supabase. Only editable once SMTP is on.
      Set the SMTP sender name to `Beezy`. Until then Supabase sends its own
      unbranded email with a link instead of a code, which the app cannot
      use — seen 2026-10-01 when Trey first tried to sign in.
- [x] _Trey's account created as owner on first sign-in attempt, 2026-10-01 (confirmed in `profiles`)._
- [ ] **3. Transfer ownership to Brandon** when ready. Trey's invite is
      `owner` today (`tester_allowlist`). Add Brandon's email to the
      allowlist with role `owner`; once Brandon has signed in, set Trey's
      profile role as agreed. Role changes are SQL or an edge function only
      — the app cannot change roles ([DECISIONS.md#0020](DECISIONS.md)).
- [ ] **4. Invite the beta testers.** Insert their emails (lower-case) into
      `tester_allowlist`; role defaults to `customer`.

## Waiting on Trey (no credentials needed)

- [x] **5. Run the anonymisation trigger SQL** — _done 2026-10-01 by Trey; trigger `profiles_anonymise_bookings` confirmed live and enabled._ in the Supabase SQL editor
      (https://supabase.com/dashboard/project/bdbarnvjktpfdogcfjvx/sql/new).
      The Supabase MCP connector cannot run it from a session — it holds any
      statement that deletes rows for a confirmation that never arrives
      ([DECISIONS.md#0023](DECISIONS.md)). Copy it from
      `supabase/manual/0005_part7_anonymise.sql` (raw on GitHub), not from a
      chat: phones turn `old.id` into a link and indentation into
      non-breaking spaces, which failed on 2026-10-01 with a syntax error at
      "before". Not blocking: in-app deletion
      already anonymises; only dashboard deletions would skip it. After it
      runs, a session should confirm the trigger exists.

## Waiting on Trey and Brandon: Chauffeur (blocks C3)

- [x] _Merge C1 — done 2026-10-30 at Trey's request. Testers now see the
      front door, with Chauffeur shown as *Coming soon*._
- [ ] **Own vehicles, or a partner operator at first?** Decides whether
      Fleet is a real screen or a list of classes.
- [ ] **The vehicles:** make and model, seats, bag space, how many.
- [ ] **Rates:** hourly and minimum hours per class, airport flat rate,
      extra-stop fee, after-hours fee, gratuity included or added.
- [ ] **Permits and insurance.** New Orleans for-hire permits (CPNC per
      vehicle, permit per driver, via the Ground Transportation Bureau, as
      we understand it) and commercial auto cover. Confirm before any paid
      trip.
- [ ] **Service area** (MSY and Greater New Orleans only?), **name and
      mark** ("Beezy Chauffeur" under the current logo?), **cancellation and
      wait-time policy**, and who drives at launch.

## After the handover, verify

- [ ] Sign in as `trey@pgrooves.com` on an installed iPhone: code arrives,
      iOS offers it above the keyboard, the app opens on Today as owner.
- [ ] A tester signs in, adds a car, books with photos; the request shows
      on Today; Confirm changes it to Confirmed on the tester's side.
- [ ] Delete a throwaway tester account in the app: photos gone from the
      bucket, any completed booking anonymised.
- [ ] VIN **Look up** works against NHTSA from a real phone (never
      verified: the build sandbox cannot reach vpic.nhtsa.dot.gov).

---

## Next up: Phase 4

Buildable now, with test or sandbox credentials where a real login is not
yet available:

- **Square deposits.** An edge function that **recomputes the price from
  `services` server-side and refuses a mismatch** before charging; the
  stored booking price is the customer's own estimate
  ([DECISIONS.md#0023](DECISIONS.md), item 3). `payments` must join the
  anonymised set in `delete-account` and the deletion trigger.
- **Google Calendar** sync of confirmed bookings.
- **Confirmation email** to the customer when Beezy confirms (same SMTP
  decision as item 1).

Chauffeur C3 waits on the questions above. Nothing else on the Chauffeur
track is buildable until they are answered, except polish to the C2 preview.

## Things a new session should know

- **Supabase MCP and destructive SQL.** `apply_migration` / `execute_sql`
  time out on any `DROP` or row-deleting statement (they wait on a
  confirmation a remote session cannot give). Write migrations with
  `ALTER` / `CREATE OR REPLACE`; anything that must delete goes to Trey as
  a paste-in, recorded above.
- **The `SUPABASE_SERVICE_ROLE_KEY` in the session environment belongs to a
  different project** (Home Church App, ref `ibqkumxfltfiuqevviji`). Never
  use it against Beezy.
- **The sandbox cannot reach** `*.supabase.co` or `vpic.nhtsa.dot.gov`
  directly. Use the Supabase MCP for the database; the browser checks use
  `scripts/lib/fake-supabase.mjs`.
- **Live migration history** records 0005 as six parts
  (`bookings_photos_1…6`) plus `fk_indexes`; the repo files are the source
  of truth.
- **Before pushing:** `npm run typecheck && npm run lint && npm test`,
  `supabase/tests/run.sh` against a local Postgres, a build with
  `VITE_SUPABASE_ANON_KEY=tour`, then `node scripts/tour.mjs` against it
  ([TESTING.md](TESTING.md), [DECISIONS.md#0015](DECISIONS.md)).
- **Running the tour locally,** build with the real `VITE_SUPABASE_URL`
  (the fake intercepts that host, not any other) and copy `dist/404.html`
  to the server root as well: `npx serve` does not serve the app's own
  404 for deep links the way Pages does, and the booking flow starts in a
  fresh context with no service worker to cover for it.
