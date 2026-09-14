/**
 * Renders the built app at phone size in both colour schemes and reports any
 * console errors or failed requests.
 *
 * Catches the class of problem that unit tests cannot see — a CSS class
 * colliding with a Tailwind utility, an asset 404 under the Pages base path,
 * a theme that does not actually switch.
 *
 * Usage:
 *   npm run build
 *   npx serve dist -l 4173
 *   node scripts/screenshot.mjs http://localhost:4173/ ./shots
 *
 * Needs a Chromium. Set CHROMIUM_PATH if it is not on the default path.
 */
import { mkdirSync } from 'node:fs';
import { launchChromium, assertGlassComposites } from './lib/browser.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const outDir = process.argv[3] ?? 'shots';

mkdirSync(outDir, { recursive: true });

const browser = await launchChromium();
await assertGlassComposites(browser);
let failed = false;

for (const colorScheme of ['light', 'dark']) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 }, // iPhone 15 Pro, logical px
    deviceScaleFactor: 2,
    colorScheme,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  const problems = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  page.on('pageerror', (e) => problems.push(String(e)));
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/app-${colorScheme}.png` });

  const state = await page.evaluate(() => {
    const logo = document.querySelector('main img');
    return {
      bodyBg: getComputedStyle(document.body).backgroundColor,
      logo: logo?.getAttribute('src'),
      // naturalWidth of 0 means the image is referenced but never loaded.
      logoLoaded: (logo instanceof HTMLImageElement ? logo.naturalWidth : 0) > 0,
    };
  });

  console.log(`\n${colorScheme}: bg ${state.bodyBg}`);
  console.log(`  logo ${state.logo} ${state.logoLoaded ? 'loaded' : 'NOT LOADED'}`);
  if (!state.logoLoaded) failed = true;
  if (problems.length) {
    failed = true;
    console.log('  problems:');
    for (const p of problems.slice(0, 10)) console.log(`    ${p}`);
  }

  await context.close();
}

await browser.close();
console.log(`\n${failed ? 'FAILED' : 'ok'} — screenshots in ${outDir}/`);
process.exit(failed ? 1 : 0);
