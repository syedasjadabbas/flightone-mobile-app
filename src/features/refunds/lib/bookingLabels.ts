// Copied from the web app's client/app/refunds/_components/bookingLabels.ts — keep the two in step.
import { formatMinor } from "./refundFormat";

export type RefundableBookingItem = {
  bookingId: string;
  status: string;
  product: string;
  currency: string;
  eligible: boolean;
  eligibilityStatus: string;
  refundableMinor: number | null;
  confirmed: boolean;
  trip?: { stops: string[]; firstDate: string | null; hotelName: string | null; reference: string | null };
};

// Travellers recognise a booking by its trip, not its database id or internal codes.
export const STATUS_LABEL: Record<string, string> = {
  QUOTED: "Quote (unpaid)",
  RESERVED: "Held",
  TICKETED: "Ticketed",
  ACTIVE: "Ticketed",
};

export const ELIGIBILITY_LABEL: Record<string, string> = {
  ELIGIBLE: "Refundable",
  REQUIRES_HUMAN: "Agent review",
  DATA_UNAVAILABLE: "Agent review",
  NOT_ELIGIBLE: "Not refundable",
};

export function bookingWhat(b: Pick<RefundableBookingItem, "product" | "trip">): string {
  const what = b.trip?.hotelName ?? (b.trip?.stops?.length ? b.trip.stops.join(" → ") : null);
  return what ?? (b.product === "HOTEL" ? "Hotel stay" : "Flight");
}

export function bookingWhen(b: Pick<RefundableBookingItem, "trip">): string | null {
  if (!b.trip?.firstDate) return null;
  return new Date(`${b.trip.firstDate.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Plain-language refund hint — amounts only when the server confirmed them. */
export function refundHint(b: RefundableBookingItem): string {
  if (b.status === "QUOTED") return "Not paid — nothing to refund";
  if (b.confirmed && b.refundableMinor != null) {
    return `${formatMinor(b.refundableMinor, b.currency)} refundable`;
  }
  return "Refund amount confirmed by an agent";
}
