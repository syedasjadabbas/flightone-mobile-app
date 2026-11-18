import { PLACE_TO_IATA, airportLabel, iataToPlace } from "@/core/lib/places";
import { AIRPORTS } from "./queries";
import type { Airport } from "./airportSearch";

export { daysBetween, searchAirports, tileDate, type Airport } from "./airportSearch";


let cache: Airport[] | null = null;

/** Every airport Ava can search, popular ones (the old quick picks) first, then A–Z by city. */
export function allAirports(): Airport[] {
  if (cache) return cache;
  const popular: string[] = AIRPORTS.map((a) => a.code);
  const codes = new Set<string>([...popular, ...Object.values(PLACE_TO_IATA)]);
  const list = [...codes].map((code) => ({ code, city: iataToPlace(code), label: airportLabel(code) }));
  cache = list.sort((a, b) => {
    const pa = popular.indexOf(a.code);
    const pb = popular.indexOf(b.code);
    if (pa !== -1 || pb !== -1) return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
    return a.city.localeCompare(b.city);
  });
  return cache;
}

