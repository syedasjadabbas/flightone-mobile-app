// Copied from the web app's client/lib/inventory/displayNames.ts — keep the two in step.
/**
 * Display names from reference data for codes that came back from suppliers
 * (airline IATA → "Gulf Air", airport IATA → "Istanbul") — see resolveDisplayNames. Client-safe: the server
 * fills it after a search, and the browser fills it from the results panel, so
 * iataToPlace / airlineDisplayName read the same names everywhere.
 */
export type DisplayNames = {
  airlines: Record<string, string>;
  /** Airport code → city (what travellers recognise: SAW → Istanbul). */
  places: Record<string, string>;
};

const airlines = new Map<string, string>();
/** Reverse: upper-cased airline name → code, so a resolved name still maps back (logos, filters). */
const airlineCodes = new Map<string, string>();
const places = new Map<string, string>();

export function registerDisplayNames(names: Partial<DisplayNames> | null | undefined): void {
  for (const [code, name] of Object.entries(names?.airlines ?? {})) {
    airlines.set(code.toUpperCase(), name);
    airlineCodes.set(name.toUpperCase(), code.toUpperCase());
  }
  for (const [code, name] of Object.entries(names?.places ?? {})) places.set(code.toUpperCase(), name);
}

export function registeredAirlineName(code: string): string | undefined {
  return airlines.get(code.toUpperCase());
}

export function registeredAirlineCode(name: string): string | undefined {
  return airlineCodes.get(name.trim().toUpperCase());
}

export function registeredPlaceName(code: string): string | undefined {
  return places.get(code.toUpperCase());
}

/** Names already known for these codes (used to ship them with a results panel). */
export function displayNamesFor(codes: { airlines: Iterable<string>; places: Iterable<string> }): DisplayNames {
  const out: DisplayNames = { airlines: {}, places: {} };
  for (const c of codes.airlines) {
    const n = airlines.get(c.toUpperCase());
    if (n) out.airlines[c.toUpperCase()] = n;
  }
  for (const c of codes.places) {
    const n = places.get(c.toUpperCase());
    if (n) out.places[c.toUpperCase()] = n;
  }
  return out;
}
