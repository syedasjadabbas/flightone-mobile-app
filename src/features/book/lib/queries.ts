/**
 * The sentences the web app's Flights / Stays / Cars forms hand to Ava
 * (`app/flights`, `app/stays`, `app/cars`). Kept word-for-word so Ava parses
 * them the same way.
 */

export const AIRPORTS = [
  { city: "Lahore", code: "LHE" },
  { city: "Karachi", code: "KHI" },
  { city: "Islamabad", code: "ISB" },
  { city: "Dubai", code: "DXB" },
  { city: "London", code: "LHR" },
  { city: "Istanbul", code: "IST" },
  { city: "Bangkok", code: "BKK" },
  { city: "Jeddah", code: "JED" },
  { city: "New York", code: "JFK" },
  { city: "Tokyo", code: "HND" },
  { city: "Doha", code: "DOH" },
] as const;

export const CABINS = ["economy", "premium", "business"] as const;

export function isoDateFromToday(days: number, today = new Date()): string {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + days));
  return d.toISOString().slice(0, 10);
}

export function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

export function flightQuery(f: {
  tripType: "roundtrip" | "oneway";
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  passengers: number;
  cabin: string;
}): string {
  return f.tripType === "roundtrip" && f.returnDate
    ? `Roundtrip flights from ${f.origin} to ${f.destination} departing ${f.departureDate} returning ${f.returnDate} for ${f.passengers} passenger in ${f.cabin}`
    : `One-way flight from ${f.origin} to ${f.destination} departing ${f.departureDate} for ${f.passengers} passenger in ${f.cabin}`;
}

export function staysQuery(s: { destination: string; checkIn: string; checkOut: string; guests: number; rooms: number }): string {
  const roomsText = s.rooms > 1 ? ` in ${s.rooms} rooms` : "";
  return `Hotels in ${s.destination} checking in ${s.checkIn} checking out ${s.checkOut} for ${s.guests} guests${roomsText}`;
}

export function carsQuery(c: { city: string; pickupDate: string; dropoffDate: string; sameReturn: boolean; dropoffCity: string }): string {
  let query = `Rental cars in ${c.city} from ${c.pickupDate} to ${c.dropoffDate}`;
  const dropoff = c.dropoffCity.trim();
  if (!c.sameReturn && dropoff) query += `, dropping off at ${dropoff}`;
  return query;
}
