/**
 * Walks the built shell and screenshots every screen in both themes.
 *
 * Catches what unit tests cannot see: a route that 404s, an asset that fails
 * under the Pages base path, a layout that breaks at phone width, a screen
 * that renders blank because a fixture lookup missed.
 *
 * Usage:
 *   npm run build && npx serve site -l 4173   # site/<repo>/ mirrors Pages
 *   node scripts/tour.mjs http://localhost:4173/beezy_app/ ./shots
 */
import { mkdirSync } from 'node:fs';
import { launchChromium, assertGlassComposites } from './lib/browser.mjs';

const baseUrl = (process.argv[2] ?? 'http://localhost:4173/beezy_app/').replace(/\/$/, '');
const outDir = process.argv[3] ?? 'shots';
const only = process.env.ONLY;

/** role is applied before load, so guarded routes resolve. */
const SCREENS = [
  ['home', '/', 'customer'],
  ['garage', '/garage', 'customer'],
  ['garage-vehicle', '/garage/veh-002', 'customer'],
  ['gallery', '/gallery', 'customer'],
  ['plan', '/plan', 'customer'],
  ['invoices', '/invoices', 'customer'],
  ['about', '/about', 'customer'],
  ['service-area', '/service-area', 'customer'],
  ['faq', '/faq', 'customer'],
  ['referral', '/referral', 'customer'],
  ['profile', '/settings/profile', 'customer'],
  ['admin-today', '/admin', 'owner'],
  ['admin-schedule', '/admin/schedule', 'owner'],
  ['admin-jobs', '/admin/jobs', 'owner'],
  ['admin-job', '/admin/jobs/bk-202', 'owner'],
  ['admin-clients', '/admin/clients', 'owner'],
  ['admin-client', '/admin/clients/cli-001', 'owner'],
  ['admin-reporting', '/admin/reporting', 'owner'],
  ['admin-subscribers', '/admin/subscribers', 'owner'],
  ['admin-services', '/admin/services', 'owner'],
  ['admin-team', '/admin/team', 'owner'],
  ['admin-expenses', '/admin/expenses', 'owner'],
  ['admin-mileage', '/admin/mileage', 'owner'],
  ['admin-integrations', '/admin/integrations', 'owner'],
  ['tech-today', '/admin', 'tech'],
];

mkdirSync(outDir, { recursive: true });
const browser = await launchChromium();
// Before anything is captured: prove the glass is actually blurring. A tour
// whose screenshots silently lost every backdrop-filter is worse than no tour.
console.log(`  ok   glass composites (stripe range ${await assertGlassComposites(browser)})`);
const failures = [];

for (const scheme of ['light', 'dark']) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    colorScheme: scheme,
    isMobile: true,
    hasTouch: true,
    baseURL: baseUrl,
  });

  for (const [name, path, role] of SCREENS) {
    if (only && !name.includes(only)) continue;
    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push(String(e)));
    page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));
    page.on('response', (r) => {
      if (r.status() < 400) return;
      // GitHub Pages has no SPA rewrite: a deep link returns 404.html with a
      // 404 status, and the router takes over from there. That is expected and
      // is what dist/404.html exists for. A failing SUBRESOURCE is not.
      if (r.request().resourceType() === 'document') return;
      problems.push(`${r.status()} ${r.url()}`);
    });
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      // The console echo of the navigation 404 above, which carries no URL.
      if (/Failed to load resource.*404/.test(m.text())) return;
      problems.push(m.text());
    });

    // Seed the role before the app boots, so a guarded route is not bounced.
    await page.addInitScript((r) => {
      try {
        window.localStorage.setItem('beezy.devRole', r);
      } catch {
        /* ignore */
      }
    }, role);

    await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(350);

    const { text, mounted } = await page.evaluate(() => ({
      text: document.body.innerText.trim(),
      // The app always mounts into #root. A static server's own error page has
      // no such element, so this distinguishes "the app rendered" from "the
      // server handed us something that merely has words on it" — a length
      // check alone lets a 404 page pass as a screen.
      mounted: (document.getElementById('root')?.childElementCount ?? 0) > 0,
    }));
    const url = page.url();

    if (!mounted) problems.push('app did not mount (#root empty or missing)');
    else if (text.length < 40) problems.push(`near-empty render (${text.length} chars)`);
    if (!url.endsWith(path) && path !== '/') problems.push(`redirected to ${url}`);

    if (scheme === 'light') {
      await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
    }

    if (problems.length) {
      failures.push({ name, scheme, problems: problems.slice(0, 3) });
      console.log(`  FAIL ${name} (${scheme})`);
      for (const p of problems.slice(0, 3)) console.log(`        ${p}`);
    } else {
      console.log(`  ok   ${name} (${scheme})`);
    }
    await page.close();
  }
  await context.close();
}

// ---------------------------------------------------------------------------
// Booking flow, walked rather than deep-linked
// ---------------------------------------------------------------------------
//
// The layout redirects a deep link into a later step back to the first
// unfinished one, so the only honest way to see these screens is to fill the
// flow in — which also tests that it actually works end to end.

const bookingContext = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  colorScheme: 'light',
  isMobile: true,
  hasTouch: true,
});
const page = await bookingContext.newPage();
const flowProblems = [];
page.on('pageerror', (e) => flowProblems.push(String(e)));

const shot = (name) => page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
const advance = async () => {
  const button = page.getByRole('button', { name: /^(Continue|Done)$/ });
  if (await button.isDisabled()) throw new Error('Continue is disabled — step not satisfied');
  await button.click();
  await page.waitForTimeout(300);
};

try {
  await page.goto(`${baseUrl}/book/service`, { waitUntil: 'networkidle' });
  await shot('book-1-service');
  await page.getByText('Express Wash').first().click();
  await advance();

  await shot('book-2-vehicle');
  await page.getByText('Porsche Macan').first().click();
  await advance();

  await shot('book-3-condition-empty');
  // Two photos is the floor the step enforces.
  await page.getByRole('button', { name: /exterior/i }).click();
  await page.getByRole('button', { name: /front seats/i }).click();
  await page.getByText('Heavy', { exact: false }).first().click();
  await shot('book-3-condition');
  await advance();

  await page.getByPlaceholder('1428 Napoleon Ave').fill('1428 Napoleon Ave');
  await page.getByPlaceholder('70115').fill('70115');
  await shot('book-4-location');
  await advance();

  await page.locator('button').filter({ hasText: /AM|PM/ }).first().click();
  await shot('book-5-time');
  await advance();

  await shot('book-6-deposit');
  await page.getByText('Add a card').click();
  await page.waitForTimeout(200);
  await shot('book-6-deposit-card');
  await advance();

  await shot('book-7-confirm');

  const confirmText = await page.evaluate(() => document.body.innerText);
  if (!/You.{0,3}re booked/i.test(confirmText)) {
    flowProblems.push('confirm screen did not render the booked state');
  }
  // The estimate must have survived every step, not reset along the way.
  if (!/\$\d/.test(confirmText)) flowProblems.push('confirm screen shows no price');
  console.log(flowProblems.length ? '  FAIL booking flow' : '  ok   booking flow (7 steps)');
  for (const p of flowProblems) console.log(`        ${p}`);
} catch (err) {
  flowProblems.push(String(err.message ?? err));
  console.log('  FAIL booking flow');
  console.log(`        ${err.message ?? err}`);
}
if (flowProblems.length) failures.push({ name: 'booking-flow', problems: flowProblems });
await bookingContext.close();

await browser.close();
console.log(
  failures.length ? `\n${failures.length} screen(s) with problems` : `\nall screens ok`,
);
process.exit(failures.length ? 1 : 0);
