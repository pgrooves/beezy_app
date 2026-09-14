/**
 * Asserts every image the app actually renders was actually built.
 *
 * A photo path in the fixtures is just a string; nothing at build time notices
 * when it points at a file that was never added. The result is a gallery of
 * broken tiles, which is the kind of thing that reaches a tester before it
 * reaches anyone else.
 *
 * This imports the fixtures rather than grepping them, so it checks the data
 * the app will really render — a path held in a pending list, or commented
 * out, is correctly ignored, and a new field carrying an image is picked up
 * without anyone remembering to update a regex. (Node >=22.18 strips the
 * TypeScript types on import; src/core has no browser dependencies by design.)
 *
 * Run: npm run check:assets   (after npm run build)
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const fixtures = await import('../src/core/fixtures.ts');

const referenced = new Map(); // path -> where it came from

const note = (path, source) => {
  if (typeof path === 'string' && path.startsWith('brand/')) {
    referenced.set(path, source);
  }
};

for (const photo of fixtures.PHOTOS) note(photo.url, `PHOTOS/${photo.id}`);
for (const service of fixtures.SERVICES) note(service.imageUrl, `SERVICES/${service.slug}`);
for (const vehicle of fixtures.VEHICLES) note(vehicle.photoUrl, `VEHICLES/${vehicle.id}`);

const missing = [...referenced].filter(([path]) => !existsSync(join(DIST, path)));

for (const [path, source] of [...referenced].sort()) {
  if (!missing.some(([m]) => m === path)) console.log(`  ok   ${path}  (${source})`);
}

if (missing.length) {
  console.error(`\n${missing.length} referenced image(s) were never built:`);
  for (const [path, source] of missing) console.error(`  - ${path}  (${source})`);
  console.error(
    '\nAdd the source to assets/brand-src/photos/ and run `npm run brand`,\n' +
      'or remove the reference from src/core/fixtures.ts.',
  );
  process.exit(1);
}

const pending = fixtures.PENDING_WORK_PHOTOS?.length ?? 0;
console.log(`\nall ${referenced.size} referenced images present`);
if (pending) {
  console.log(`${pending} photo(s) waiting on source files in PENDING_WORK_PHOTOS`);
}
