# Progress ledger

The running record of where the build is, what is waiting on whom, and what
comes next. It exists so that no thread starts cold and no outstanding item
is forgotten between sessions.

**Every working session reads this first and updates it before finishing.**
Tick items off with the date rather than deleting them, add anything new the
moment it is discovered, and keep the "Next up" section true. Reasoning
belongs in [DECISIONS.md](DECISIONS.md); this file links to it rather than
repeating it.

_Last updated: 2026-10-01 — Phase 3 deployed; anonymisation trigger live; Trey's account exists as owner. Only the credentials handover remains._

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

---

## Waiting on Trey and Brandon's credentials handover

Nothing below can be done by Claude: each needs a login only Trey or
Brandon holds. Until items 1 and 2 are done, **nobody can sign in to the
app** — the code, database and deploy are ready and waiting.

- [ ] **1. Choose the sign-in email sender and set up custom SMTP.**
      Supabase's built-in mailer only reaches the project's own team and
      sends a few emails an hour. Options, decided at the handover:
      the Beezy Gmail (`beezyluxurydetailing@gmail.com`, needs an app
      password from that account), Trey's `trey@pgrooves.com` (needs that
      provider's SMTP settings), or a domain-verified service such as
      Resend (needs DNS access — see *Open — Outbound email sending domain*
      in DECISIONS.md). Set in Supabase → Authentication → Emails → SMTP
      Settings. [DECISIONS.md#0021](DECISIONS.md)
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
