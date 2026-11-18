/** Pure search + date helpers for the Book screen (no app imports, so node --test can load them). */
export type Airport = { code: string; city: string; label: string };

/** Match by code ("dxb"), city ("dub") or airport name; exact code first, then city prefix, then contains. */
export function searchAirports(all: Airport[], query: string, exclude?: string): Airport[] {
  const q = query.trim().toLowerCase();
  const list = all.filter((a) => a.code !== exclude);
  if (!q) return list;
  const score = (a: Airport) => {
    if (a.code.toLowerCase() === q) return 0;
    if (a.city.toLowerCase().startsWith(q)) return 1;
    if (a.code.toLowerCase().startsWith(q)) return 2;
    if (a.city.toLowerCase().includes(q) || a.label.toLowerCase().includes(q)) return 3;
    return 9;
  };
  return list
    .map((a) => ({ a, s: score(a) }))
    .filter((x) => x.s < 9)
    .sort((x, y) => x.s - y.s)
    .map((x) => x.a);
}

/** "Fri, 12 Dec" from "2026-12-12". */
export function tileDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** Whole nights/days between two ISO dates. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
