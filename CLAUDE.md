# Working on Beezy

Booking and operations app for Beezy Luxury Detailing. React + TypeScript +
Vite PWA on GitHub Pages, Supabase behind it. Start with the README.

## Every session

1. **Read [`docs/PROGRESS.md`](docs/PROGRESS.md) first.** It is the progress
   ledger: phase status, everything waiting on Trey or Brandon, and what is
   next. Do not re-ask for anything it already records.
2. **Update it before you finish.** Tick completed items with the date, add
   anything new you discovered or that is now waiting on someone, and keep
   "Next up" true. Commit it with the work it describes.
3. Record *why* in [`docs/DECISIONS.md`](docs/DECISIONS.md), numbered, and
   link to it from the ledger rather than repeating the reasoning.

## Rules that CI enforces

- Browser globals only in `src/lib/platform`; `src/core` stays free of React,
  DOM and `import.meta` (DECISIONS.md#0001).
- No secrets anywhere: the repo is public and RLS is the security model
  (#0003). Every new table gets RLS and tests in `supabase/tests/rls.test.sql`
  in the same change.
- Migrations are numbered, never edited once applied, and documented in
  `docs/DATA_MODEL.md` in the same commit.
- Contrast pairs are asserted (#0008, #0018): `accent` and `danger` are
  fill-only, never text.
