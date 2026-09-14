/**
 * One place that launches Chromium for the screenshot harnesses.
 *
 * Exists because of a silent failure that invalidated every screenshot this
 * repo has ever produced: headless Chromium, launched plainly, renders
 * `backdrop-filter` as a no-op. The translucent fill still paints, so a glass
 * surface looks *plausible* — a pale wash over the content — and nothing
 * anywhere reports a problem. What it does not do is blur, which means every
 * judgement call made from those shots (fill opacity, rim brightness, whether
 * a label stays readable over a photo scrolling underneath) was made against a
 * render missing the one effect being judged.
 *
 * The blur comes back under SwiftShader's ANGLE backend. That is the whole
 * reason for the launch args below — do not drop them.
 */
import { chromium } from 'playwright-core';

const EXECUTABLE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

/**
 * Software GL. Without this Chromium composites on a path that discards
 * backdrop-filter entirely; `--enable-gpu` does NOT fix it (measured).
 */
const GL_ARGS = ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'];

/** Launch a Chromium that actually composites the glass. */
export async function launchChromium({ args = [], ...rest } = {}) {
  return chromium.launch({ executablePath: EXECUTABLE, args: [...GL_ARGS, ...args], ...rest });
}

/**
 * Prove the blur is compositing before trusting a single screenshot.
 *
 * Renders 6px black/white stripes under a pane carrying the app's own glass
 * recipe. Under a real blur(36px) the stripes average out to flat grey; with
 * the filter dropped they stay fully banded. Reading the pixels back is the
 * only honest check — `getComputedStyle` reports the filter either way, which
 * is exactly how this went unnoticed.
 *
 * Throws rather than warns: a harness that renders glass without glass is
 * worse than no harness, because its output looks fine.
 */
export async function assertGlassComposites(browser) {
  const page = await browser.newPage();
  try {
    await page.setContent(
      `<body style="margin:0">
         <div style="position:relative;width:300px;height:200px;
                     background:repeating-linear-gradient(90deg,#000 0 6px,#fff 6px 12px)">
           <div style="position:absolute;inset:60px 20px;
                       background:rgba(255,255,255,0.58);
                       backdrop-filter:blur(36px) saturate(1.5)"></div>
         </div>
       </body>`,
    );
    await page.waitForTimeout(250);
    const buf = await page.screenshot({ clip: { x: 40, y: 100, width: 200, height: 20 } });
    const { data } = await (await import('sharp')).default(buf).greyscale().raw().toBuffer({
      resolveWithObject: true,
    });
    let min = 255;
    let max = 0;
    for (const v of data) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    // Blurred lands around 5; unfiltered stripes measure ~97.
    const range = max - min;
    if (range > 20) {
      throw new Error(
        `backdrop-filter is not compositing (stripe range ${range}, expected < 20).\n` +
          'Every glass surface would screenshot without its blur. Check the\n' +
          'SwiftShader launch args in scripts/lib/browser.mjs.',
      );
    }
    return range;
  } finally {
    await page.close();
  }
}
