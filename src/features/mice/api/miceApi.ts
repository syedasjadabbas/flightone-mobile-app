import { baseApi } from "@/core/api/baseApi";

/** MICE types — same as the web's `client/lib/api/mice.api.ts` (fields the app uses). */
export type MiceEventType = "MEETING" | "INCENTIVE" | "CONFERENCE" | "EXHIBITION";
export type MiceEvent = {
  id: string;
  name: string;
  type: MiceEventType;
  venue: string | null;
  startsAt: string;
  endsAt: string;
  budgetMinor: number | null;
  currency: string | null;
  groupId: string | null;
  myRole?: "MANAGER" | "DELEGATE" | string;
};
export type MiceEventEnquiry = {
  id: string;
  eventId: string | null;
  name: string;
  type: MiceEventType;
  status: "SUBMITTED" | "IN_REVIEW" | "CANCELLED";
  destination: string;
  eventStartsAt: string;
  eventEndsAt: string;
  attendeeCount: number;
  createdAt: string;
  fulfilmentNote?: string;
};
export type CreateMiceEnquiryBody = {
  name: string;
  type: MiceEventType;
  organization?: string;
  destination: string;
  origin?: string;
  eventStartsAt: string;
  eventEndsAt: string;
  attendeeCount: number;
  budgetMinor?: number;
  currency?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  flightsRequired?: boolean;
  hotelsRequired?: boolean;
  transfersRequired?: boolean;
  meetingSpaceRequired?: boolean;
  cateringRequired?: boolean;
  visaAssistanceRequired?: boolean;
  notes?: string;
  idempotencyKey?: string;
};
export type MiceDelegate = { id: string; userId?: string | null; fullName: string; email?: string | null; registrationStatus?: string; badgeCode?: string | null };
export type MiceSession = { id: string; title: string; track?: string | null; speakers?: string | null; startsAt: string; endsAt: string; location?: string | null };

export const miceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    miceEnquiries: build.query<{ items: MiceEventEnquiry[] }, void>({ query: () => "/mice/enquiries", providesTags: ["Mice"] }),
    createMiceEnquiry: build.mutation<MiceEventEnquiry, CreateMiceEnquiryBody>({
      query: (body) => ({ url: "/mice/enquiries", method: "POST", body }),
      invalidatesTags: ["Mice"],
    }),
    cancelMiceEnquiry: build.mutation<MiceEventEnquiry, { id: string; reason?: string }>({
      query: ({ id, ...body }) => ({ url: `/mice/enquiries/${id}/cancel`, method: "POST", body }),
      invalidatesTags: ["Mice"],
    }),
    miceEvents: build.query<MiceEvent[], void>({ query: () => "/mice/events", providesTags: ["Mice"] }),
    createMiceEvent: build.mutation<MiceEvent, { name: string; type: MiceEventType; startsAt: string; endsAt: string; venue?: string; autoCreateGroup?: boolean }>({
      query: (body) => ({ url: "/mice/events", method: "POST", body }),
      invalidatesTags: ["Mice"],
    }),
    miceEvent: build.query<MiceEvent, string>({
      query: (id) => `/mice/events/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Mice" as const, id }],
    }),
    miceDelegates: build.query<MiceDelegate[], string>({
      query: (id) => `/mice/events/${id}/delegates`,
      providesTags: (_r, _e, id) => [{ type: "Mice" as const, id }],
    }),
    addMiceDelegate: build.mutation<MiceDelegate, { id: string; fullName: string; email: string }>({
      query: ({ id, ...body }) => ({ url: `/mice/events/${id}/delegates`, method: "POST", body }),
      invalidatesTags: ["Mice"],
    }),
    registerForEvent: build.mutation<MiceDelegate, string>({
      query: (id) => ({ url: `/mice/events/${id}/register`, method: "POST", body: {} }),
      invalidatesTags: ["Mice"],
    }),
    miceSessions: build.query<MiceSession[], string>({
      query: (id) => `/mice/events/${id}/sessions`,
      providesTags: (_r, _e, id) => [{ type: "Mice" as const, id }],
    }),
    addMiceSession: build.mutation<MiceSession, { id: string; title: string; startsAt: string; endsAt: string; location?: string }>({
      query: ({ id, ...body }) => ({ url: `/mice/events/${id}/sessions`, method: "POST", body }),
      invalidatesTags: ["Mice"],
    }),
  }),
});

export const {
  useMiceEnquiriesQuery,
  useCreateMiceEnquiryMutation,
  useCancelMiceEnquiryMutation,
  useMiceEventsQuery,
  useCreateMiceEventMutation,
  useMiceEventQuery,
  useMiceDelegatesQuery,
  useAddMiceDelegateMutation,
  useRegisterForEventMutation,
  useMiceSessionsQuery,
  useAddMiceSessionMutation,
} = miceApi;
