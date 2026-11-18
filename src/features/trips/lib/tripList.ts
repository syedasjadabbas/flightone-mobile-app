import type { JourneyWatch } from "../api/types";

/** The three views on the Trips screen. "upcoming" includes trips in progress. */
export type TripView = "upcoming" | "past" | "cancelled";

export function tripView(w: JourneyWatch): TripView {
  if (w.phase === "CANCELLED" || w.status === "CANCELLED") return "cancelled";
  if (w.phase === "COMPLETED" || w.status === "COMPLETED") return "past";
  return "upcoming";
}

/** First travel day as "YYYY-MM-DD" (flight departure or hotel check-in), or null. */
export function tripDay(w: JourneyWatch): string | null {
  const items = w.itinerary ?? [];
  const flight = items.find((i) => i.kind === "FLIGHT");
  const stay = items.find((i) => i.kind === "HOTEL");
  const day =
    flight?.departDate ??
    flight?.departAt?.slice(0, 10) ??
    w.summary?.firstDepartDate ??
    stay?.checkInDate?.slice(0, 10) ??
    w.departAt?.slice(0, 10) ??
    null;
  return day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/** Today in the traveller's own calendar, as "YYYY-MM-DD". */
export function localToday(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

/** Whole days from `today` to `day` (both "YYYY-MM-DD"). */
export function daysUntil(day: string, today: string): number {
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

/** "Today", "Tomorrow", "In 5 days", "In 3 weeks" — null when past or unknown. */
export function countdownLabel(day: string | null, today: string): string | null {
  if (!day) return null;
  const n = daysUntil(day, today);
  if (n < 0) return null;
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n < 14) return `In ${n} days`;
  if (n < 60) return `In ${Math.round(n / 7)} weeks`;
  return `In ${Math.round(n / 30)} months`;
}

/** Upcoming soonest-first; past and cancelled most-recent-first. Undated trips go last. */
export function sortTrips(list: JourneyWatch[], view: TripView): JourneyWatch[] {
  const dir = view === "upcoming" ? 1 : -1;
  return [...list].sort((a, b) => {
    const da = tripDay(a);
    const db = tripDay(b);
    if (da === db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da < db ? -dir : dir;
  });
}

export type TripSection = { key: string; title: string; data: JourneyWatch[] };

/** Group (already sorted) trips into month sections: "December 2026", …, "Date to be confirmed". */
export function groupByMonth(list: JourneyWatch[]): TripSection[] {
  const sections: TripSection[] = [];
  for (const w of list) {
    const day = tripDay(w);
    const key = day ? day.slice(0, 7) : "undated";
    let s = sections.find((x) => x.key === key);
    if (!s) {
      const title = day
        ? new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
        : "Date to be confirmed";
      s = { key, title, data: [] };
      sections.push(s);
    }
    s.data.push(w);
  }
  return sections;
}

/** Short date for a row: "Sat 26 Dec". */
export function shortDay(day: string | null): string | null {
  if (!day) return null;
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** Search across route, airline/hotel, city and booking reference. */
export function matchesQuery(w: JourneyWatch, headline: { route: string; sub: string }, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const stay = (w.itinerary ?? []).find((i) => i.kind === "HOTEL");
  const hay = [headline.route, headline.sub, w.booking?.ticketRef, w.flightNumber, stay?.city, stay?.hotelName, ...(w.summary?.stops ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}
