/**
 * Validates the built PWA in dist/.
 *
 * Lighthouse removed its PWA category in v12, so `installable-manifest`,
 * `service-worker`, `maskable-icon`, `apple-touch-icon` and `themed-omnibox`
 * no longer exist as audits. Rather than pin CI to an end-of-life Lighthouse,
 * we assert the invariants directly — which is more precise anyway, because it
 * checks the things that actually break installation on a tester's phone and
 * names the exact file when one is missing.
 *
 * Run: npm run check:pwa   (after npm run build)
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const problems = [];
const checks = [];

const ok = (label) => checks.push(`  ok   ${label}`);
const fail = (label, detail) => {
  problems.push(`${label}${detail ? ` — ${detail}` : ''}`);
  checks.push(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
};

function read(path) {
  const full = join(DIST, path);
  return existsSync(full) ? readFileSync(full, 'utf8') : null;
}

// --- manifest --------------------------------------------------------------

const manifestRaw = read('manifest.webmanifest');
let manifest = null;
if (!manifestRaw) {
  fail('manifest.webmanifest exists');
} else {
  try {
    manifest = JSON.parse(manifestRaw);
    ok('manifest.webmanifest parses');
  } catch (err) {
    fail('manifest.webmanifest parses', err.message);
  }
}

if (manifest) {
  // Without these a browser will not offer to install the app at all.
  for (const field of ['name', 'short_name', 'start_url', 'scope', 'display', 'icons']) {
    if (manifest[field]) ok(`manifest.${field}`);
    else fail(`manifest.${field} is set`);
  }

  if (manifest.display === 'standalone') ok('display is standalone');
  else fail('display is standalone', `found "${manifest.display}"`);

  // Both are required for the splash screen and the OS chrome to match.
  for (const field of ['theme_color', 'background_color']) {
    if (manifest[field]) ok(`manifest.${field}`);
    else fail(`manifest.${field} is set`);
  }

  const icons = manifest.icons ?? [];
  for (const size of ['192x192', '512x512']) {
    if (icons.some((i) => i.sizes === size)) ok(`icon ${size} declared`);
    else fail(`icon ${size} declared`, 'required for installability');
  }

  // Android crops icons to a circle; without a maskable icon it crops the
  // square one and clips the artwork.
  const maskable = icons.filter((i) => i.purpose === 'maskable');
  if (maskable.length) ok(`maskable icons declared (${maskable.length})`);
  else fail('a maskable icon is declared');

  // A declared icon that 404s is worse than none: the install prompt fails
  // silently. Check every one actually shipped.
  const base = manifest.scope ?? '/';
  let missing = 0;
  for (const icon of icons) {
    const rel = icon.src.startsWith(base) ? icon.src.slice(base.length) : icon.src.replace(/^\//, '');
    if (!existsSync(join(DIST, rel))) {
      fail(`icon file present: ${icon.src}`);
      missing++;
    }
  }
  if (!missing) ok(`all ${icons.length} declared icon files exist`);

  if (manifest.start_url?.startsWith(base)) ok('start_url is inside scope');
  else fail('start_url is inside scope', `${manifest.start_url} vs ${base}`);

  // Pages serves a project site at /<repo>/ and those paths are
  // case-sensitive, so a base that differs from the repository name even in
  // case makes every asset 404 while the deploy job reports success. Skipped
  // when BASE_PATH is set, which is the deliberate custom-domain override.
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (process.env.BASE_PATH) {
    ok(`base path overridden (BASE_PATH=${process.env.BASE_PATH})`);
  } else if (!repoName) {
    ok('base path matches repo name (skipped: no GITHUB_REPOSITORY)');
  } else if (base === `/${repoName}/`) {
    ok(`base path matches repo name (${base})`);
  } else {
    fail('base path matches repo name', `scope ${base} vs /${repoName}/ — Pages paths are case-sensitive`);
  }
}

// --- service worker --------------------------------------------------------

if (read('sw.js')) ok('service worker emitted');
else fail('sw.js exists');

// --- index.html ------------------------------------------------------------

const html = read('index.html');
if (!html) {
  fail('index.html exists');
} else {
  const expectations = [
    [/rel="apple-touch-icon"/, 'apple-touch-icon link (iOS Home Screen icon)'],
    [/name="theme-color"[^>]*prefers-color-scheme:\s*light/, 'theme-color for light'],
    [/name="theme-color"[^>]*prefers-color-scheme:\s*dark/, 'theme-color for dark'],
    [/viewport-fit=cover/, 'viewport-fit=cover (safe-area support)'],
    [/name="apple-mobile-web-app-capable"/, 'apple-mobile-web-app-capable'],
    [/rel="manifest"/, 'manifest link'],
  ];
  for (const [re, label] of expectations) {
    if (re.test(html)) ok(label);
    else fail(label);
  }

  // The beta is a closed test on a public URL.
  if (/name="robots"[^>]*noindex/.test(html)) ok('noindex (remove before launch)');
  else fail('noindex is set', 'the beta must stay out of search');

  const appleIcon = read('icons/apple-touch-icon.png');
  if (appleIcon !== null) ok('apple-touch-icon file exists');
  else fail('apple-touch-icon file exists');

  // A relative href resolves against the current URL, so on a deep link the
  // icons 404 and iOS gets nothing to put on the Home Screen. They must carry
  // the base path.
  const relativeIcons = [...html.matchAll(/<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => /href="\.{0,2}\//.test(tag) === false || /href="\.\//.test(tag));
  if (relativeIcons.length === 0) ok('icon links are base-absolute');
  else fail('icon links are base-absolute', relativeIcons.join(' '));
}

// --- Liquid Glass -----------------------------------------------------------

// The minifier once emitted ONLY `-webkit-backdrop-filter` for the glass
// classes and dropped the standard property. Chromium supports the standard
// one and not the prefix, so every glass surface lost its blur and nothing
// failed — the app just quietly stopped looking like itself.
const cssFile = readdirSync(join(DIST, 'assets')).find((f) => f.endsWith('.css'));
if (!cssFile) {
  fail('a stylesheet was emitted');
} else {
  const css = readFileSync(join(DIST, 'assets', cssFile), 'utf8');
  for (const cls of ['glass', 'glass-sheet', 'glass-header']) {
    const rule = css.match(new RegExp(`\\.${cls}\\{[^}]*\\}`));
    if (!rule) {
      fail(`.${cls} rule present`);
      continue;
    }
    // Standard property, not preceded by a vendor prefix.
    if (/(^|[;{])backdrop-filter:blur/.test(rule[0])) ok(`.${cls} keeps unprefixed backdrop-filter`);
    else fail(`.${cls} keeps unprefixed backdrop-filter`, 'Chromium renders no blur without it');
  }
}

// --- SPA fallback ----------------------------------------------------------

// GitHub Pages does no SPA rewriting; without this, every deep link 404s.
const notFound = read('404.html');
if (notFound === null) fail('404.html exists', 'deep links will 404 on Pages');
else if (notFound === html) ok('404.html matches index.html (SPA fallback)');
else fail('404.html matches index.html', 'stale copy');

// --- report ----------------------------------------------------------------

console.log(checks.join('\n'));
if (problems.length) {
  console.error(`\n${problems.length} PWA check(s) failed:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`\nall ${checks.length} PWA checks passed`);
