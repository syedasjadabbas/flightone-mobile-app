import type { TravelPlan } from "../types";

/** What Ava is currently searching, read from her (otherwise opaque) travel plan. */
export type PlanSummary =
  | {
      kind: "flight";
      origin: string;
      destination: string;
      departureDate: string | null;
      returnDate: string | null;
      passengers: number;
      cabin: string;
    }
  | { kind: "hotel"; city: string; checkIn: string | null; checkOut: string | null; guests: number };

type Query = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : d);

/** The first search in the plan (a finished search, or a draft Ava is still asking about). */
export function planSummary(plan: TravelPlan | null | undefined): PlanSummary | null {
  if (!plan) return null;
  const draft = plan.draft as { searches?: { product?: string; query?: Query }[] } | undefined;
  const searches = (plan.searches as { product?: string; query?: Query }[] | undefined) ?? draft?.searches;
  const first = searches?.[0];
  const q = first?.query;
  if (!q) return null;
  if (first.product === "HOTEL") {
    const city = str(q.cityCode) ?? str(q.city);
    if (!city) return null;
    return { kind: "hotel", city, checkIn: str(q.checkInDate), checkOut: str(q.checkOutDate), guests: num(q.guests, 2) };
  }
  const origin = str(q.origin);
  const destination = str(q.destination);
  if (!origin || !destination) return null;
  return {
    kind: "flight",
    origin,
    destination,
    departureDate: str(q.departureDate),
    returnDate: str(q.returnDate),
    passengers: num(q.passengers, 1),
    cabin: str(q.cabinClass)?.toLowerCase() ?? "economy",
  };
}

/** "12 Dec" from "2026-12-12". */
export function chipDate(iso: string | null): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** "12 December 2026" — the wording sent to Ava when a chip changes a date. */
export function spokenDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function shiftDay(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const CABINS = [
  { key: "economy", label: "Economy" },
  { key: "premium_economy", label: "Premium economy" },
  { key: "business", label: "Business" },
  { key: "first", label: "First" },
] as const;

export function cabinLabel(key: string): string {
  return CABINS.find((c) => c.key === key)?.label ?? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
