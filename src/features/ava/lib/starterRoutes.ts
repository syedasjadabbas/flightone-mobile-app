/**
 * Starter routes on the empty chat, dated a few weeks ahead so they never go
 * stale. Same as the web app's `chatQuickPrompts.ts`.
 */
const DAY_MS = 86_400_000;
const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
const day = (d: Date) => fmt(d, { day: "numeric" });
const short = (d: Date) => fmt(d, { day: "numeric", month: "short" });
const long = (d: Date) => fmt(d, { day: "numeric", month: "long" });

export interface StarterRoute {
  title: string;
  subtitle: string;
  prompt: string;
}

/**
 * `origin` is the traveller's city when the phone shares its location
 * (Lahore otherwise, the web's default). Destinations shift if you're already there.
 */
export function starterRoutes(today = new Date(), origin = "Lahore"): StarterRoute[] {
  const base = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const at = (days: number) => new Date(base + days * DAY_MS);
  const oneWay = at(21);
  const [out, back] = [at(28), at(42)];
  const [m1, m2, m3] = [at(35), at(39), at(44)];
  const range = m1.getUTCMonth() === m3.getUTCMonth() ? `${day(m1)}–${short(m3)}` : `${short(m1)}–${short(m3)}`;
  const near = (city: string, alt: string) => (origin.toLowerCase() === city.toLowerCase() ? alt : city);
  const sun = near("Dubai", "Istanbul");
  const far = near("London", "New York");
  const [eu1, eu2] = origin.toLowerCase() === "london" || origin.toLowerCase() === "paris" ? ["Rome", "Barcelona"] : ["London", "Paris"];
  return [
    {
      title: `${origin} → ${sun}`,
      subtitle: `Cheapest one-way · ${short(oneWay)}`,
      prompt: `Cheapest ${origin} to ${sun} on ${long(oneWay)}`,
    },
    {
      title: `${origin} ⇄ ${far}`,
      subtitle: `Round trip · ${short(out)} – ${short(back)}`,
      prompt: `Round trip ${origin} to ${far}, out ${long(out)} back ${long(back)}`,
    },
    {
      title: `${eu1} & ${eu2}`,
      subtitle: `Multi-city Europe · ${range}`,
      prompt: `Multi-city: ${origin} to ${eu1} on ${long(m1)}, ${eu1} to ${eu2} on ${long(m2)}, ${eu2} back to ${origin} on ${long(m3)}`,
    },
  ];
}
