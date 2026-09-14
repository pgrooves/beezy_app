/**
 * Brand asset pipeline.
 *
 * Sources live in assets/brand-src/ — committed, but outside public/ so the
 * full-resolution masters never ship to the Pages site:
 *   logo-screenshot.png   white stacked lockup on solid black (iPhone screenshot)
 *   logo-horizontal.webp  white horizontal lockup, already transparent
 *   photos/*.webp         portfolio photography, straight from the live site
 *
 * Every output under public/ is generated, so this script is safe to re-run:
 * it never reads a file it has written.
 *
 * The screenshot is pure white artwork on pure black, so its luminance channel
 * is an exact alpha mask. We lift that mask once and recolour it for every
 * output, rather than shipping a flattened raster per theme.
 *
 * Run: npm run brand
 */
import sharp from 'sharp';
import { mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Sources live outside public/ so they are never published to the Pages site.
const SRC_SCREENSHOT = 'assets/brand-src/logo-screenshot.png';
const SRC_HORIZONTAL = 'assets/brand-src/logo-horizontal.webp';
const OUT = 'public/brand';
const ICONS = 'public/icons';
const SRC_PHOTOS = 'assets/brand-src/photos';
const PHOTOS = 'public/brand/photos';

/**
 * Logos render at most ~240px wide, so ship 2x that and no more. The full
 * 933px master only exists to cut icons from.
 */
const LOGO_WIDTH = 560;
/** Gallery photography ceiling. Free-tier storage runs out on photos first. */
const PHOTO_WIDTH = 1200;
const THUMB_WIDTH = 400;

/** Brand tokens duplicated from src/theme/tokens.ts. Keep in sync. */
const INK = { r: 0x11, g: 0x11, b: 0x11 };
const PAPER = { r: 0xff, g: 0xff, b: 0xff };
const CANVAS_DARK = '#0A0A0A';

/** Ignore the home-indicator strip at the bottom of the screenshot. */
const CHROME_STRIP_PX = 160;
/** Luminance above which a pixel counts as artwork. */
const INK_THRESHOLD = 40;

const out = (...p) => join(...p);
const ensure = (file) => mkdirSync(dirname(file), { recursive: true });

/** Bounding box of non-black pixels, optionally restricted to a y-range. */
function bbox(grey, width, height, { top = 0, bottom = height - 1 } = {}) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = top; y <= bottom; y++) {
    for (let x = 0; x < width; x++) {
      if (grey[y * width + x] > INK_THRESHOLD) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('no artwork found in range');
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** Contiguous runs of rows that contain artwork. */
function inkBands(grey, width, height, bottomLimit) {
  const bands = [];
  let start = null;
  for (let y = 0; y < bottomLimit; y++) {
    let has = false;
    for (let x = 0; x < width; x++) {
      if (grey[y * width + x] > INK_THRESHOLD) { has = true; break; }
    }
    if (has && start === null) start = y;
    if (!has && start !== null) { bands.push([start, y - 1]); start = null; }
  }
  if (start !== null) bands.push([start, bottomLimit - 1]);
  return bands;
}

/**
 * Turn white-on-black artwork into a transparent PNG tinted to `colour`.
 * Luminance becomes alpha, so antialiased edges survive the recolour.
 */
async function maskToTransparent(region, colour) {
  const { data, info } = await region.greyscale().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < data.length; i++) {
    rgba[i * 4] = colour.r;
    rgba[i * 4 + 1] = colour.g;
    rgba[i * 4 + 2] = colour.b;
    rgba[i * 4 + 3] = data[i];
  }
  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } });
}

/** Recolour an already-transparent white asset, preserving its alpha. */
async function recolour(file, colour) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i] = colour.r;
    data[i + 1] = colour.g;
    data[i + 2] = colour.b;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
}

/**
 * Compose a square icon: artwork centred on `background`, scaled so its wider
 * axis fills `coverage` of the canvas.
 */
async function squareIcon(markPng, size, background, coverage) {
  const meta = await sharp(markPng).metadata();
  const box = Math.round(size * coverage);
  const scale = Math.min(box / meta.width, box / meta.height);
  const w = Math.max(1, Math.round(meta.width * scale));
  const h = Math.max(1, Math.round(meta.height * scale));
  const mark = await sharp(markPng).resize(w, h, { fit: 'fill' }).png().toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: mark, gravity: 'centre' }])
    .png();
}

async function main() {
  const meta = await sharp(SRC_SCREENSHOT).metadata();
  const grey = await sharp(SRC_SCREENSHOT).greyscale().raw().toBuffer();
  const usableHeight = meta.height - CHROME_STRIP_PX;

  const bands = inkBands(grey, meta.width, usableHeight, usableHeight);
  if (bands.length !== 3) {
    throw new Error(`expected car / BEEZY / tagline bands, found ${bands.length}`);
  }
  const [car, , tagline] = bands;

  // Icon mark drops the tagline: "LUXURY DETAILING" is unreadable at 60px.
  const markBox = bbox(grey, meta.width, usableHeight, { top: car[0], bottom: bands[1][1] });
  // Full lockup keeps it, for in-app headers and splash screens.
  const lockupBox = bbox(grey, meta.width, usableHeight, { top: car[0], bottom: tagline[1] });

  console.log(`mark   ${markBox.width}x${markBox.height} @ ${markBox.left},${markBox.top}`);
  console.log(`lockup ${lockupBox.width}x${lockupBox.height} @ ${lockupBox.left},${lockupBox.top}`);

  // ---- Transparent logo variants -------------------------------------------
  const variants = [
    ['logo-stacked-white.png', lockupBox, PAPER],
    ['logo-stacked-ink.png', lockupBox, INK],
    ['logo-mark-white.png', markBox, PAPER],
    ['logo-mark-ink.png', markBox, INK],
  ];
  // Full-resolution masters stay out of public/ — they exist only to cut icons
  // and the display-sized variants below.
  const masters = {};
  for (const [name, box, colour] of variants) {
    const img = await maskToTransparent(sharp(SRC_SCREENSHOT).extract(box), colour);
    const buf = await img.png({ compressionLevel: 9 }).toBuffer();
    masters[name] = buf;

    const file = out(OUT, name);
    ensure(file);
    // Quantise: this is flat line art, so a small palette is lossless in
    // practice and cuts the file by roughly an order of magnitude.
    await sharp(buf)
      .resize({ width: LOGO_WIDTH, withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true, colours: 64 })
      .toFile(file);
    console.log(`  ${name}`);
  }

  const horizIn = out(OUT, 'logo-horizontal-ink.png');
  ensure(horizIn);
  const horizOpts = { compressionLevel: 9, palette: true, colours: 64 };
  await (await recolour(SRC_HORIZONTAL, INK)).png(horizOpts).toFile(horizIn);
  await sharp(SRC_HORIZONTAL).png(horizOpts).toFile(out(OUT, 'logo-horizontal-white.png'));
  console.log('  logo-horizontal-{ink,white}.png');

  // ---- App icons -----------------------------------------------------------
  // Cut from the full-resolution master, not the display-sized file.
  const markWhite = masters['logo-mark-white.png'];
  ensure(out(ICONS, 'x'));

  // Standard icons: generous coverage, dark canvas (the brand is black).
  const sizes = [16, 32, 48, 64, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512, 1024];
  for (const size of sizes) {
    const icon = await squareIcon(markWhite, size, CANVAS_DARK, 0.74);
    await icon.toFile(out(ICONS, `icon-${size}.png`));
  }
  console.log(`  icons: ${sizes.join(', ')}`);

  // Maskable: Android crops to a circle/squircle. Keep art inside the 80%
  // safe zone with margin to spare.
  for (const size of [192, 512]) {
    const icon = await squareIcon(markWhite, size, CANVAS_DARK, 0.56);
    await icon.toFile(out(ICONS, `maskable-${size}.png`));
  }
  console.log('  maskable: 192, 512');

  // Apple touch icon must be opaque and unrounded; iOS applies the squircle.
  await sharp(out(ICONS, 'icon-180.png')).toFile(out(ICONS, 'apple-touch-icon.png'));

  // ---- iOS splash screens --------------------------------------------------
  // Portrait only; the app is locked to portrait.
  const splashes = [
    [1179, 2556, 'iPhone 15/14 Pro'],
    [1290, 2796, 'iPhone 15/14 Pro Max'],
    [1170, 2532, 'iPhone 13/12'],
    [1125, 2436, 'iPhone X/XS/11 Pro'],
    [1242, 2688, 'iPhone XS Max/11 Pro Max'],
    [828, 1792, 'iPhone XR/11'],
    [750, 1334, 'iPhone SE/8'],
    [1536, 2048, 'iPad'],
    [1668, 2388, 'iPad Pro 11'],
    [2048, 2732, 'iPad Pro 12.9'],
  ];
  const lockupWhite = masters['logo-stacked-white.png'];
  const lockupMeta = await sharp(lockupWhite).metadata();
  for (const [w, h] of splashes) {
    const target = Math.round(Math.min(w, h) * 0.52);
    const scale = target / lockupMeta.width;
    const mark = await sharp(lockupWhite)
      .resize(target, Math.round(lockupMeta.height * scale))
      .png()
      .toBuffer();
    await sharp({ create: { width: w, height: h, channels: 4, background: CANVAS_DARK } })
      .composite([{ input: mark, gravity: 'centre' }])
      .png({ compressionLevel: 9, palette: true, colours: 32 })
      .toFile(out(ICONS, `splash-${w}x${h}.png`));
  }
  console.log(`  splashes: ${splashes.length}`);

  // Favicon: the browser tab is small, so use the mark alone at high coverage.
  const ico = await squareIcon(markWhite, 32, CANVAS_DARK, 0.86);
  await ico.toFile(out('public', 'favicon.png'));
  console.log('  favicon.png');

  // ---- Photography ---------------------------------------------------------
  // Squarespace serves 1500px originals. Free-tier storage and a phone on
  // cellular both care, so cap the long edge and cut a thumbnail for grids.
  // Accept whatever comes off a phone — jpg, png, heic — and always emit
  // webp. Filtering on '.webp' alone silently skipped every real upload.
  const photos = readdirSync(SRC_PHOTOS).filter((f) =>
    /\.(webp|jpe?g|png|heic|heif)$/i.test(f),
  );
  ensure(out(PHOTOS, 'x'));
  for (const name of photos) {
    const src = out(SRC_PHOTOS, name);
    const stem = name.replace(/\.[^.]+$/, '');
    // rotate() applies the EXIF orientation: a photo shot in portrait on a
    // phone is often stored landscape with a rotation flag, and dropping it
    // lands the car on its side.
    await sharp(src)
      .rotate()
      .resize({ width: PHOTO_WIDTH, withoutEnlargement: true })
      .webp({ quality: 76 })
      .toFile(out(PHOTOS, `${stem}.webp`));
    await sharp(src)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: 70 })
      .toFile(out(PHOTOS, `${stem}.thumb.webp`));
  }
  console.log(`  photos: ${photos.length} full + thumbnails`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
