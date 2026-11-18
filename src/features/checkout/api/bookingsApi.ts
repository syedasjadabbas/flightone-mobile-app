import { baseApi } from "@/core/api/baseApi";
import type { BookingDetail, BookingListItem, Companion, PayMethod, PaymentRow, TravellerProfile } from "./types";

/** Booking checkout endpoints (server `modules/bookings`, `modules/profile`). */
export const bookingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Offer card from Ava → QUOTED booking (server re-anchors the supplier snapshot). */
    quoteOffer: build.mutation<BookingDetail, Record<string, unknown>>({
      query: (offer) => ({ url: "/bookings/quote-offer", method: "POST", body: offer }),
    }),
    getBooking: build.query<BookingDetail, string>({
      query: (id) => `/bookings/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Fare" as const, id }],
    }),
    listBookings: build.query<{ items: BookingListItem[]; total?: number }, { page?: number; pageSize?: number } | void>({
      query: (params) => ({ url: "/bookings", params: params ?? undefined }),
      providesTags: ["Fare"],
    }),
    payBooking: build.mutation<
      PaymentRow,
      { id: string; method: PayMethod; paymentMethodToken?: string; accountNumber?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/bookings/${id}/pay`, method: "POST", body }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Fare" as const, id: arg.id }],
    }),
    reserveBooking: build.mutation<
      BookingDetail,
      { id: string; clientAmountMinor?: number; travellerSnapshot?: { givenName: string; surname: string } & Record<string, unknown> }
    >({
      query: ({ id, ...body }) => ({ url: `/bookings/${id}/reserve`, method: "POST", body }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Fare" as const, id: arg.id }],
    }),
    ticketBooking: build.mutation<BookingDetail, { id: string; clientAmountMinor?: number }>({
      query: ({ id, ...body }) => ({ url: `/bookings/${id}/ticket`, method: "POST", body }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Fare" as const, id: arg.id }],
    }),
    acceptPriceChange: build.mutation<BookingDetail, { id: string; acceptedAmountMinor: number }>({
      query: ({ id, acceptedAmountMinor }) => ({
        url: `/bookings/${id}/accept-price`,
        method: "POST",
        body: { acceptedAmountMinor },
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Fare" as const, id: arg.id }],
    }),
    myProfile: build.query<TravellerProfile, void>({
      query: () => "/profile",
      providesTags: ["Profile"],
    }),
    myCompanions: build.query<Companion[], void>({
      query: () => "/profile/companions",
      providesTags: ["ProfileCompanions"],
      transformResponse: (r: Companion[] | { items?: Companion[]; companions?: Companion[] }) =>
        Array.isArray(r) ? r : (r.items ?? r.companions ?? []),
    }),
  }),
});

export const {
  useQuoteOfferMutation,
  useGetBookingQuery,
  useListBookingsQuery,
  usePayBookingMutation,
  useReserveBookingMutation,
  useTicketBookingMutation,
  useAcceptPriceChangeMutation,
  useMyProfileQuery,
  useMyCompanionsQuery,
} = bookingsApi;
