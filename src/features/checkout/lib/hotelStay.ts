// Copied from the web app's client/lib/bookings/hotelStay.ts — keep the two in step.
/**
 * Hotel checkout: the stay a RateHawk booking was quoted for (supplierBookingRefs.stay),
 * the guest form RateHawk needs (every guest by name, per room), and the snapshot the
 * booking engine sends to ETG. Pure — no React, no fetch.
 */
import type { BookingDetail } from "../api/types";
import type { HotelRoomGuests } from "../api/types";

export type HotelStay = {
  hotelName: string;
  area?: string | null;
  city?: string | null;
  starRating?: number | null;
  imageUrl?: string | null;
  roomType?: string | null;
  meal?: string | null;
  breakfastIncluded?: boolean | null;
  payAtHotel?: { name: string; amount: string; currency: string }[] | null;
  cancellationDeadline?: string | null;
  cancellationPolicies?: { from: string | null; until: string | null; charge: string; currency?: string }[] | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  nights?: number | null;
  roomGuests: HotelRoomGuests[];
  residency?: string | null;
};

/** The stay on a hotel booking, or null for flights / bookings quoted before stays were stored. */
export function hotelStayOf(booking: Pick<BookingDetail, "product"> & { supplierBookingRefs?: unknown }): HotelStay | null {
  if (booking.product !== "HOTEL") return null;
  const refs = booking.supplierBookingRefs as { stay?: Partial<HotelStay> & { guests?: number; rooms?: number } } | null;
  const stay = refs?.stay;
  if (!stay?.hotelName) return null;
  const roomGuests =
    Array.isArray(stay.roomGuests) && stay.roomGuests.length
      ? stay.roomGuests
      : [{ adults: Math.max(1, Number(stay.guests) || 1), children: [] }];
  return { ...stay, hotelName: stay.hotelName, roomGuests };
}

/** ETG meal codes → what a guest reads. Never upgrades the meal (ETG display rule). */
export function mealLabel(meal?: string | null): string {
  if (!meal || meal === "nomeal") return "Room only";
  if (meal === "breakfast") return "Breakfast included";
  return meal.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export type HotelGuest = { firstName: string; lastName: string; isChild?: boolean; age?: number };
export type HotelGuestsForm = {
  rooms: { guests: HotelGuest[] }[];
  email: string;
  phone: string;
  /** Lead guest's passport country (ISO-2). */
  nationality: string;
};

/** One blank line per guest the rate was priced for; the lead guest prefilled from the profile. */
export function emptyHotelGuests(
  stay: HotelStay,
  lead?: { givenName?: string; surname?: string; email?: string; phone?: string; nationality?: string },
): HotelGuestsForm {
  const rooms = stay.roomGuests.map((r, roomIndex) => ({
    guests: [
      ...Array.from({ length: r.adults }, (_, i) =>
        roomIndex === 0 && i === 0
          ? { firstName: lead?.givenName ?? "", lastName: lead?.surname ?? "" }
          : { firstName: "", lastName: "" },
      ),
      ...r.children.map((age) => ({ firstName: "", lastName: "", isChild: true, age })),
    ],
  }));
  return {
    rooms,
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    nationality: (lead?.nationality || stay.residency || "").toUpperCase(),
  };
}

/** Every guest named, a way to reach the lead guest, and the nationality the price was for. */
export function validateHotelGuests(form: HotelGuestsForm, stay: HotelStay): string | null {
  const unnamed = form.rooms.some((r) => r.guests.some((g) => !g.firstName.trim() || !g.lastName.trim()));
  if (unnamed) return "Enter the first and last name of every guest, as on their passport.";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter the lead guest's email.";
  if (form.phone.replace(/\D/g, "").length < 7) return "Enter the lead guest's phone number.";
  const nationality = form.nationality.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(nationality)) return "Choose the lead guest's nationality (2-letter country code).";
  const priced = stay.residency?.toUpperCase();
  if (priced && nationality !== priced) {
    return `This price was checked for ${priced} passport holders. Open the hotel again from your search so it's priced for ${nationality}.`;
  }
  return null;
}

/** What reserve sends: the lead guest (contact) plus every room's guests for RateHawk. */
export function hotelTravellerSnapshot(
  form: HotelGuestsForm,
): { givenName: string; surname: string } & Record<string, unknown> {
  const lead = form.rooms[0]?.guests[0];
  return {
    givenName: lead?.firstName.trim() ?? "",
    surname: lead?.lastName.trim() ?? "",
    email: form.email.trim(),
    phone: form.phone.trim(),
    nationality: form.nationality.trim().toUpperCase(),
    rooms: form.rooms.map((r) => ({
      guests: r.guests.map((g) => ({
        firstName: g.firstName.trim(),
        lastName: g.lastName.trim(),
        ...(g.isChild ? { isChild: true, age: g.age } : {}),
      })),
    })),
  };
}

/** "2 adults, 1 child (3)" per room, for summaries. */
export function occupancyText(rooms: HotelRoomGuests[]): string {
  const adults = rooms.reduce((n, r) => n + r.adults, 0);
  const ages = rooms.flatMap((r) => r.children);
  const parts = [`${adults} adult${adults === 1 ? "" : "s"}`];
  if (ages.length) parts.push(`${ages.length} child${ages.length === 1 ? "" : "ren"} (${ages.join(", ")})`);
  return `${parts.join(", ")} · ${rooms.length} room${rooms.length === 1 ? "" : "s"}`;
}
