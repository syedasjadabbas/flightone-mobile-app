// Copied from the web app's client/lib/bookings/bookability.ts — keep the two in step.
/**
 * Whether checkout can book an offer online, decided BEFORE the customer starts
 * checkout. The audit found TPConnects fares let customers enter passport details
 * and only then said "search-only", leaving a dead QUOTED booking behind.
 */
import type { ItinerarySummary, OfferCard } from "@/features/ava/types";

/** Why checkout can't book this offer online (button label + explanation), or null when it can. */
export function bookingBlocked(
  offer: Pick<OfferCard, "bookable" | "metadata">,
): { label: string; reason: string; agentRequest?: boolean } | null {
  if (offer.metadata?.construction === "multiple_tickets") {
    // Each leg is its own airline booking; online checkout handles one at a time, so the
    // customer asks an agent to book the set (a support case carrying the whole trip).
    return {
      label: "Request agent booking",
      reason: "This trip is several separate tickets, so a FlightOne agent books it for you — usually within a few hours.",
      agentRequest: true,
    };
  }
  if (offer.bookable === false) {
    return {
      label: "Online booking opens soon",
      reason: "This is a live fare, but online booking for it isn't open yet — a FlightOne agent can book it for you.",
    };
  }
  return null;
}

/** Same decision for a multi-city trip card, before it becomes an offer. */
export function tripBookingBlocked(
  itinerary: Pick<ItinerarySummary, "construction" | "legs">,
): { label: string; reason: string; agentRequest?: boolean } | null {
  return bookingBlocked({
    metadata: { construction: itinerary.construction },
    ...(itinerary.legs?.some((l) => l.bookable === false) ? { bookable: false } : {}),
  });
}

/** The support-case note an agent books a separate-ticket trip from. */
export function agentBookingNote(itinerary: Pick<ItinerarySummary, "legs" | "totalPrice">): string {
  const legs = (itinerary.legs ?? []).map(
    (l) => `${l.originCode}→${l.destinationCode} ${l.departureDate ?? ""} ${l.flightNumber ?? l.airlineCode ?? ""}`.trim(),
  );
  return `Please book this separate-ticket trip (${itinerary.totalPrice}): ${legs.join("; ")}`.slice(0, 1000);
}
