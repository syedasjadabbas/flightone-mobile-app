/**
 * Builds the app icon set from the FlightOne logo's suitcase mark
 * ("One" suitcase + cloud + sparkle, from the web app's logo-dark.png):
 *
 *   assets/icon.png                     1024² iOS / store icon (opaque, sky gradient)
 *   assets/android-icon-background.png  1024² sky gradient (adaptive icon background)
 *   assets/android-icon-foreground.png  1024² mark inside the adaptive safe zone (transparent)
 *   assets/android-icon-monochrome.png  1024² single-colour mark (Android 13 themed icons)
 *   assets/favicon.png                  48² web favicon
 *
 * Run from the mobile repo:  node scripts/build-app-icon.mjs [path-to-web-repo]
 * It borrows `sharp` and the logo from the web repo (no extra dependency here).
 */
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const webRepo = resolve(process.argv[2] ?? "../flightone");
const sharp = createRequire(join(webRepo, "client", "package.json"))("sharp");
const logo = join(webRepo, "client", "public", "images", "logo-dark.png");
const assets = resolve("assets");
const SIZE = 1024;

// The suitcase mark is the right-hand part of the 878×284 wordmark.
const cut = await sharp(logo).extract({ left: 560, top: 0, width: 318, height: 284 }).png().toBuffer();
const mark = await sharp(cut).trim().png().toBuffer();

const sky = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#F4F9FC"/>
        <stop offset="1" stop-color="#CDE5F2"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.38" r="0.55">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.9"/>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#glow)"/>
  </svg>`,
);

/** The mark scaled to `width` px, centred on a transparent square canvas (nudged up a touch). */
async function markOnCanvas(width, { lift = 0.02, tint } = {}) {
  let m = sharp(mark).resize({ width });
  if (tint) {
    // Single colour: keep only the shape (alpha) and paint it.
    const { data, info } = await m.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      data[i] = tint[0];
      data[i + 1] = tint[1];
      data[i + 2] = tint[2];
    }
    m = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  }
  const buf = await m.png().toBuffer();
  const meta = await sharp(buf).metadata();
  const left = Math.round((SIZE - meta.width) / 2);
  const top = Math.round((SIZE - meta.height) / 2 - SIZE * lift);
  return sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: buf, left, top }])
    .png()
    .toBuffer();
}

const background = await sharp(sky).png().toBuffer();

// iOS / store: opaque, mark ~62% of the width.
const iosMark = await markOnCanvas(Math.round(SIZE * 0.62));
// (Apple rejects app icons with an alpha channel, so flatten and drop it.)
const iosIcon = await sharp(background).composite([{ input: iosMark }]).png().toBuffer();
await sharp(iosIcon).flatten({ background: "#F4F9FC" }).removeAlpha().png().toFile(join(assets, "icon.png"));

// Android adaptive icon: the launcher crops to a circle/squircle inside the middle 66%,
// so the mark stays within ~52% of the canvas.
await sharp(background).toFile(join(assets, "android-icon-background.png"));
await sharp(await markOnCanvas(Math.round(SIZE * 0.52))).toFile(join(assets, "android-icon-foreground.png"));
await sharp(await markOnCanvas(Math.round(SIZE * 0.52), { tint: [0, 0, 0] })).toFile(join(assets, "android-icon-monochrome.png"));

// Web favicon.
await sharp(join(assets, "icon.png")).resize(48, 48).png().toFile(join(assets, "favicon.png"));

console.log("built icon.png, android-icon-{background,foreground,monochrome}.png, favicon.png");
