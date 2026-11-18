import type { OfferCard } from "../types";

/** Same sort choices as the web's results rail. "angle" keeps Ava's recommended order. */
export type SortKey = "angle" | "price" | "duration";
export const SORTS: { key: SortKey; label: string }[] = [
  { key: "angle", label: "Recommended" },
  { key: "price", label: "Cheapest" },
  { key: "duration", label: "Quickest" },
];

export type StopsKey = 0 | 1 | 2; // 2 = "2+ stops"
export type TimeKey = "morning" | "afternoon" | "evening" | "night";
export const TIMES: { key: TimeKey; label: string; hint: string }[] = [
  { key: "morning", label: "Morning", hint: "05:00–11:59" },
  { key: "afternoon", label: "Afternoon", hint: "12:00–16:59" },
  { key: "evening", label: "Evening", hint: "17:00–20:59" },
  { key: "night", label: "Night", hint: "21:00–04:59" },
];

export type Filters = {
  stops: StopsKey[];
  airlines: string[];
  times: TimeKey[];
  maxPriceMinor: number | null;
  baggage: boolean;
  refundable: boolean;
  /** Hotels */
  minStars: number;
  breakfast: boolean;
};

export const NO_FILTERS: Filters = {
  stops: [],
  airlines: [],
  times: [],
  maxPriceMinor: null,
  baggage: false,
  refundable: false,
  minStars: 0,
  breakfast: false,
};

export function activeFilterCount(f: Filters): number {
  return (
    (f.stops.length ? 1 : 0) +
    (f.airlines.length ? 1 : 0) +
    (f.times.length ? 1 : 0) +
    (f.maxPriceMinor != null ? 1 : 0) +
    (f.baggage ? 1 : 0) +
    (f.refundable ? 1 : 0) +
    (f.minStars ? 1 : 0) +
    (f.breakfast ? 1 : 0)
  );
}

export function stopsKey(stops: number): StopsKey {
  return stops <= 0 ? 0 : stops === 1 ? 1 : 2;
}

/** "05:40" → "morning". Unknown times match no window. */
export function timeKey(hhmm: string | null | undefined): TimeKey | null {
  const m = hhmm ? /^(\d{1,2}):(\d{2})/.exec(hhmm) : null;
  if (!m) return null;
  const h = Number(m[1]);
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

export function applyFilters(offers: OfferCard[], f: Filters): OfferCard[] {
  return offers.filter((o) => {
    if (f.maxPriceMinor != null && o.priceMinor > f.maxPriceMinor) return false;
    const fl = o.flight;
    if (fl) {
      if (f.stops.length && !f.stops.includes(stopsKey(fl.stops))) return false;
      if (f.airlines.length && !f.airlines.includes(fl.airline)) return false;
      if (f.times.length) {
        const t = timeKey(fl.departTimeLocal);
        if (!t || !f.times.includes(t)) return false;
      }
      if (f.baggage && !(fl.baggageKg && fl.baggageKg > 0)) return false;
      if (f.refundable && fl.refundable !== true) return false;
    }
    const h = o.hotel;
    if (h) {
      if (f.minStars && h.stars < f.minStars) return false;
      if (f.breakfast && !h.breakfastIncluded) return false;
      if (f.refundable && h.refundable !== true) return false;
    }
    return true;
  });
}

export function sortOffers(offers: OfferCard[], key: SortKey): OfferCard[] {
  if (key === "angle") return offers;
  const list = [...offers];
  if (key === "price") return list.sort((a, b) => a.priceMinor - b.priceMinor);
  return list.sort((a, b) => (a.flight?.durationMinutes ?? Infinity) - (b.flight?.durationMinutes ?? Infinity));
}

/** What the filter sheet can offer for these results (only choices that would match something). */
export function facets(offers: OfferCard[]) {
  const airlines = new Map<string, number>();
  const stops = new Set<StopsKey>();
  const times = new Set<TimeKey>();
  let min = Infinity;
  let max = 0;
  let anyBaggage = false;
  let anyRefundable = false;
  let anyBreakfast = false;
  const stars = new Set<number>();
  for (const o of offers) {
    min = Math.min(min, o.priceMinor);
    max = Math.max(max, o.priceMinor);
    if (o.flight) {
      airlines.set(o.flight.airline, (airlines.get(o.flight.airline) ?? 0) + 1);
      stops.add(stopsKey(o.flight.stops));
      const t = timeKey(o.flight.departTimeLocal);
      if (t) times.add(t);
      if (o.flight.baggageKg) anyBaggage = true;
      if (o.flight.refundable) anyRefundable = true;
    }
    if (o.hotel) {
      stars.add(o.hotel.stars);
      if (o.hotel.breakfastIncluded) anyBreakfast = true;
      if (o.hotel.refundable) anyRefundable = true;
    }
  }
  return {
    airlines: [...airlines.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    stops: [...stops].sort(),
    times: TIMES.filter((t) => times.has(t.key)).map((t) => t.key),
    priceMin: Number.isFinite(min) ? min : 0,
    priceMax: max,
    anyBaggage,
    anyRefundable,
    anyBreakfast,
    stars: [...stars].sort(),
    isHotel: offers.some((o) => o.hotel) && !offers.some((o) => o.flight),
  };
}

/** Cheapest offer (for the summary line in the chat). */
export function cheapest(offers: OfferCard[]): OfferCard | null {
  return offers.reduce<OfferCard | null>((best, o) => (!best || o.priceMinor < best.priceMinor ? o : best), null);
}
