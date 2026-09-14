/**
 * Renders the app under candidate display typefaces so they can be compared
 * as the real thing rather than as specimens.
 *
 * Overrides --font-display on the built app and screenshots the same screens
 * for each candidate, so nothing but the typeface changes between shots.
 *
 * Usage: node scripts/font-trial.mjs <baseUrl> <outDir>
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const baseUrl = (process.argv[2] ?? 'http://localhost:4182/beezy_app/').replace(/\/$/, '');
const outDir = process.argv[3] ?? '/tmp/fonts';
const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

/**
 * Candidates, all Google-hosted so the trial needs no local files.
 *
 * The wordmark is a high-contrast Didone, so these are chosen to *contrast*
 * with it rather than imitate it — a geometric sans under a serif mark is the
 * standard luxury pairing. `stack` is what --font-display becomes.
 */
const CANDIDATES = [
  {
    id: '0-syne',
    name: 'Syne 400',
    note: 'Baseline. Syne has no weight below 400.',
    file: 'syne-caps',
    stack: "'Trial syne-caps', sans-serif",
    weight: 400,
    tracking: '0.06em',
    uppercase: true,
  },
  {
    id: '1-josefin',
    name: 'Josefin Sans 300',
    note: 'Art-deco geometric. Round bowls, low x-height.',
    file: 'josefin',
    stack: "'Trial josefin', sans-serif",
    weight: 300,
    tracking: '0.10em',
    uppercase: true,
  },
  {
    id: '2-bigshoulders',
    name: 'Big Shoulders 300',
    note: 'The most compact here. Condensed and tall.',
    file: 'bigshoulders',
    stack: "'Trial bigshoulders', sans-serif",
    weight: 300,
    tracking: '0.08em',
    uppercase: true,
  },
  {
    id: '3-unbounded',
    name: 'Unbounded 200',
    note: 'Closest to Syne quirk, and it goes properly thin.',
    file: 'unbounded',
    stack: "'Trial unbounded', sans-serif",
    weight: 200,
    tracking: '0.04em',
    uppercase: true,
  },
  {
    id: '4-gruppo',
    name: 'Gruppo',
    note: 'Single thin weight. Deco, wide curves.',
    file: 'gruppo',
    stack: "'Trial gruppo', sans-serif",
    weight: 400,
    tracking: '0.10em',
    uppercase: true,
  },
  {
    id: '5-tenor',
    name: 'Tenor Sans',
    note: 'Quiet luxury. Built for light caps.',
    file: 'tenor',
    stack: "'Trial tenor', sans-serif",
    weight: 400,
    tracking: '0.12em',
    uppercase: true,
  },
  {
    id: '6-leaguespartan',
    name: 'League Spartan 300',
    note: 'Geometric circles, tighter and more solid.',
    file: 'leaguespartan',
    stack: "'Trial leaguespartan', sans-serif",
    weight: 300,
    tracking: '0.08em',
    uppercase: true,
  },
  {
    id: '7-sairacond',
    name: 'Saira Condensed 300',
    note: 'Narrow and economical. Fits long titles.',
    file: 'sairacond',
    stack: "'Trial sairacond', sans-serif",
    weight: 300,
    tracking: '0.08em',
    uppercase: true,
  },
];

const SCREENS = [
  ['home', '/'],
  ['book', '/book/condition'],
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath });

for (const font of CANDIDATES) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
    isMobile: true,
    hasTouch: true,
    // The app's service worker intercepts the trial font requests and fails
    // them. Caching is irrelevant to a typeface comparison, so block it.
    serviceWorkers: 'block',
  });

  // Self-hosted from ./fonttrial/, not linked from Google: a <link> to
  // fonts.googleapis.com registered no faces at all here, so every candidate
  // rendered as the same fallback and only the weight/tracking overrides
  // differed. The trial looked like it worked.
  await context.addInitScript(
    ({ file, stack, weight, tracking, uppercase, fontUrl }) => {
      const apply = () => {
        const style = document.createElement('style');
        style.textContent = `
          ${file ? `@font-face { font-family: 'Trial ${file}'; src: url('${fontUrl}') format('woff2'); font-weight: 100 900; font-display: block; }` : ''}
          :root { --font-display: ${stack}; }
          .font-display, h1, h2 {
            font-weight: ${weight};
            letter-spacing: ${tracking};
            ${uppercase ? 'text-transform: uppercase; line-height: 1.15;' : ''}
          }
        `;
        document.head.appendChild(style);
      };
      if (document.head) apply();
      else document.addEventListener('DOMContentLoaded', apply);
    },
    {
      ...font,
      // Absolute, so it resolves the same from a nested route as from the root.
      fontUrl: font.file ? new URL(`fonttrial/${font.file}.woff2`, `${baseUrl}/`).pathname : null,
    },
  );

  for (const [screen, path] of SCREENS) {
    const page = await context.newPage();
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });

    // `document.fonts.ready` resolves before an injected stylesheet's faces
    // have arrived, so it is not enough on its own: two candidates rendered
    // byte-identical because both had silently fallen back. Load the family
    // explicitly and confirm it is available before shooting.
    if (font.file) {
      const family = `Trial ${font.file}`;
      // `document.fonts.check()` returns true for a family that never loaded,
      // so it proves nothing. Measure instead: if the text is the same width
      // as the generic fallback, the face did not apply.
      const measured = await page.evaluate(
        async ([family, weight]) => {
          await document.fonts.load(`${weight} 64px "${family}"`);
          await document.fonts.ready;
          const span = document.createElement('span');
          span.style.cssText = 'position:absolute;visibility:hidden;font-size:64px;white-space:nowrap';
          span.style.fontWeight = String(weight);
          span.textContent = 'Marcus Beezy Handling';
          document.body.appendChild(span);
          span.style.fontFamily = 'sans-serif';
          const fallback = span.getBoundingClientRect().width;
          span.style.fontFamily = `"${family}", sans-serif`;
          const actual = span.getBoundingClientRect().width;
          span.remove();
          return { fallback, actual, faces: [...document.fonts].filter((f) => f.family === family).length };
        },
        [family, font.weight],
      );
      if (measured.faces === 0 || Math.abs(measured.fallback - measured.actual) < 1) {
        throw new Error(
          `${font.name} did not apply (faces=${measured.faces}, width ${measured.actual} vs fallback ${measured.fallback})`,
        );
      }
    }

    await page.waitForTimeout(300);
    await page.screenshot({ path: `${outDir}/${font.id}-${screen}.png` });
    await page.close();
  }

  console.log(`  ${font.name.padEnd(18)} ${font.note}`);
  await context.close();
}

await browser.close();
console.log(`\n${CANDIDATES.length} candidates -> ${outDir}`);
