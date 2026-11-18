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

export function starterRoutes(today = new Date()): StarterRoute[] {
  const base = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const at = (days: number) => new Date(base + days * DAY_MS);
  const oneWay = at(21);
  const [out, back] = [at(28), at(42)];
  const [m1, m2, m3] = [at(35), at(39), at(44)];
  const range = m1.getUTCMonth() === m3.getUTCMonth() ? `${day(m1)}–${short(m3)}` : `${short(m1)}–${short(m3)}`;
  return [
    {
      title: "Lahore → Dubai",
      subtitle: `Cheapest one-way · ${short(oneWay)}`,
      prompt: `Cheapest Lahore to Dubai on ${long(oneWay)}`,
    },
    {
      title: "Lahore ⇄ London",
      subtitle: `Round trip · ${short(out)} – ${short(back)}`,
      prompt: `Round trip Lahore to London, out ${long(out)} back ${long(back)}`,
    },
    {
      title: "London & Paris",
      subtitle: `Multi-city Europe · ${range}`,
      prompt: `Multi-city: Lahore to London on ${long(m1)}, London to Paris on ${long(m2)}, Paris back to Lahore on ${long(m3)}`,
    },
  ];
}
