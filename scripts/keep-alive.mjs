/**
 * Keeps the Supabase project from being auto-paused.
 *
 * Supabase pauses a free-tier project after a stretch of no activity, and a
 * paused project does not wake on its own — it needs someone to press restore
 * in the dashboard. For a beta that testers open irregularly that is a real
 * failure mode: the tester taps the icon, every query 503s, and the app looks
 * broken. A read every few days resets that timer.
 *
 * This is deliberately NOT part of the app. It is a standalone Node script run
 * by .github/workflows/keep-alive.yml on a schedule, so nothing here can reach
 * the bundle, the deploy pipeline, or a user's session. The app does not know
 * it exists.
 *
 * WHAT IT READS. `public.services`, one row, one column. That table already has
 * an anon-readable policy ("services: public read" — the menu is browsable
 * signed out, see 0002_private_schema_helpers.sql), so this needs no migration,
 * no new table and no new grant. A dedicated `keep_alive` table would mean
 * widening the schema and writing a fresh RLS policy for the anon role to earn
 * exactly the same round-trip, which is more surface area for no gain.
 *
 * WHY RAW FETCH, not @supabase/supabase-js. One unauthenticated GET against
 * PostgREST is precisely what the client would issue underneath. Going direct
 * keeps the workflow to a checkout and a `node` invocation — no `npm ci`, no
 * lockfile coupling, so a dependency problem can never be what pauses the
 * database.
 *
 * Run: npm run keep-alive   (reads .env locally; env vars in CI)
 */

const TABLE = 'services';
const ATTEMPTS = 3;
const TIMEOUT_MS = 10_000;
const BACKOFF_MS = [2_000, 8_000];

// Local convenience only: in CI the values arrive as real environment
// variables and there is no .env to read. Never fatal — a missing file here
// just means we fall through to process.env, which is the CI path anyway.
try {
  process.loadEnvFile('.env');
} catch {
  // no .env, or a Node without loadEnvFile; env vars are the source of truth.
}

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // A misconfigured job is not a transient failure and retrying cannot fix it.
  console.error(
    'keep-alive: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.\n' +
      'In CI they come from GitHub (Settings -> Secrets and variables ->\n' +
      'Actions), from EITHER the Variables or the Secrets tab -- the workflow\n' +
      'reads both. Note this is GitHub\'s store, not the Supabase dashboard\'s\n' +
      'edge function secrets, which Actions cannot read.',
  );
  process.exit(1);
}

/** Host only — the key is never printed, and the full URL adds nothing. */
const host = URL.parse(url)?.host ?? url;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One round-trip. Resolves with the row count; throws on anything else. */
const ping = async () => {
  const response = await fetch(`${url}/rest/v1/${TABLE}?select=id&limit=1`, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      accept: 'application/json',
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    // PostgREST puts a readable reason in the body; a status alone does not
    // distinguish a paused project from a revoked key.
    const detail = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} ${response.statusText} ${detail}`.trim());
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows.length : 0;
};

const started = Date.now();

for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  try {
    // An empty table would still have reached Postgres, so row count is
    // reported rather than asserted — this measures reachability, not data.
    const rows = await ping();
    console.log(`keep-alive: ok — ${host}/${TABLE}, ${rows} row(s), ${Date.now() - started}ms`);
    process.exit(0);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    if (attempt < ATTEMPTS) {
      const wait = BACKOFF_MS[attempt - 1];
      // stderr, one line, only on a retry: a healthy run stays a single line
      // of output so the log is worth reading when it is not.
      console.error(`keep-alive: attempt ${attempt}/${ATTEMPTS} failed (${reason}) — retrying in ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }

    // Exhausted. Fail loudly *here*, where the only thing listening is this
    // job's own run history — the app and the deploy pipeline never see it.
    // A keep-alive that exits 0 on failure is the worst of both worlds: the
    // database pauses anyway and nothing ever said so.
    console.error(
      `keep-alive: FAILED after ${ATTEMPTS} attempts against ${host} — ${reason}\n` +
        'The pause timer is no longer being reset. Check that the project is not\n' +
        'already paused, and that the anon key in the repository variables is current.',
    );
    process.exit(1);
  }
}
