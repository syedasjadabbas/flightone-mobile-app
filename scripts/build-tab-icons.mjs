/**
 * Builds the bottom tab bar icons.
 *
 * Shapes come from Lucide (the icon set the web app uses; ISC licence). Like
 * Apple's own tab bars, each tab has a pair:
 *   - idle:     Lucide outline
 *   - selected: the same shape, filled solid, with inner details cut out
 *               (the door in the house, the handle lines in the suitcase …)
 *
 * The native (Liquid Glass) tab bar takes images, so each icon is rendered to
 * black PNGs at @1x/@2x/@3x and the system tints them (template mode).
 *
 * Run from the mobile repo:  node scripts/build-tab-icons.mjs [path-to-web-repo]
 * It borrows `sharp` from the web repo's node_modules (no extra dependency here).
 */
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const webRepo = resolve(process.argv[2] ?? "../flightone");
const sharp = createRequire(join(webRepo, "client", "package.json"))("sharp");

const POINTS = 25; // Apple's recommended tab bar glyph size
const STROKE = 1.9; // a touch lighter than Lucide's 2, close to SF Symbols "regular"

const svg = (body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">${defs}${body}</svg>`;

/** Fill + stroke a shape, then punch holes through it with `cut` (drawn in black in a mask). */
const solid = (keep, cut = "") =>
  svg(
    `<g mask="url(#m)" fill="#000">${keep}</g>`,
    `<defs><mask id="m" maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28"><rect x="-2" y="-2" width="28" height="28" fill="#fff" stroke="none"/><g fill="#000" stroke="#000">${cut}</g></mask></defs>`,
  );

// Lucide shapes (lucide-react 1.47).
const L = {
  houseDoor: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",
  houseBody: "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  sparkle:
    "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
  plane:
    "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z",
  bagBody: "M6 20a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2",
  bagHandle: "M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14",
};

const ICONS = {
  home: {
    idle: svg(`<path d="${L.houseDoor}"/><path d="${L.houseBody}"/>`),
    // Solid house with the door cut out (runs past the bottom edge so it opens cleanly).
    selected: solid(`<path d="${L.houseBody}"/>`, `<path d="M15 23v-10a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v10z" stroke-width="0.6"/>`),
  },
  ava: {
    idle: svg(`<path d="${L.sparkle}"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>`),
    selected: svg(
      `<path d="${L.sparkle}" fill="#000"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2" fill="#000"/>`,
    ),
  },
  book: {
    idle: svg(`<path d="${L.plane}"/>`),
    selected: svg(`<path d="${L.plane}" fill="#000"/>`),
  },
  trips: {
    idle: svg(
      `<path d="${L.bagBody}"/><path d="${L.bagHandle}"/><path d="M10 20h4"/><circle cx="16" cy="20" r="2"/><circle cx="8" cy="20" r="2"/>`,
    ),
    // Solid case + wheels; the handle shows above it and as two cut lines through it.
    selected: solid(
      `<path d="${L.bagBody}z"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none"/><circle cx="16" cy="20" r="2"/><circle cx="8" cy="20" r="2"/>`,
      `<path d="M8 9.5v6M16 9.5v6" fill="none" stroke-width="1.6"/><path d="M5.5 19.2h13" fill="none" stroke-width="1.1"/>`,
    ),
  },
  more: {
    idle: svg(
      `<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>`,
    ),
    selected: svg(
      `<g fill="#000"><rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/></g>`,
    ),
  },
};

const out = resolve("assets/tabs");
mkdirSync(out, { recursive: true });

for (const [tab, states] of Object.entries(ICONS)) {
  for (const [state, source] of Object.entries(states)) {
    for (const scale of [1, 2, 3]) {
      const px = POINTS * scale;
      const suffix = scale === 1 ? "" : `@${scale}x`;
      const file = join(out, `${tab}${state === "selected" ? "-selected" : ""}${suffix}.png`);
      await sharp(Buffer.from(source), { density: 72 * (px / 24) }).resize(px, px).png().toFile(file);
    }
  }
  console.log(`built ${tab}`);
}
