import { baseApi } from "@/core/api/baseApi";

/** Group travel types — same as the web's `client/lib/api/groups.api.ts` (fields the app uses). */
export type GroupType = "CORPORATE_TOUR" | "STUDENT" | "UMRAH_HAJJ" | "LEISURE" | "SPORTS" | "FAMILY" | "OTHER";
export type TravelGroup = {
  id: string;
  name: string;
  type: GroupType;
  createdByUserId: string;
  inviteCode: string;
  createdAt: string;
  myRole?: string | null;
  myStatus?: string | null;
  myMembership?: { role: string; status: string } | null;
};
export type GroupDateFlexibility = "EXACT" | "PLUS_MINUS_1" | "PLUS_MINUS_3" | "FLEXIBLE_WEEK";
export type GroupTravelRequest = {
  id: string;
  groupId: string | null;
  name: string;
  type: GroupType;
  status: "SUBMITTED" | "IN_REVIEW" | "CANCELLED";
  origin: string;
  destination: string;
  departureDate: string | null;
  returnDate: string | null;
  passengerCount: number;
  createdAt: string;
  fulfilmentNote?: string;
};
export type CreateGroupTravelRequestBody = {
  name: string;
  type: GroupType;
  origin: string;
  destination: string;
  departureDate?: string;
  returnDate?: string;
  flexibility: GroupDateFlexibility;
  passengerCount: number;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  organization?: string;
  seatingTogether?: boolean;
  baggageRequired?: boolean;
  airportTransfers?: boolean;
  accommodationRequired?: boolean;
  notes?: string;
  idempotencyKey?: string;
};
export type GroupMember = { id: string; userId: string; role: string; status: string; displayName: string | null; email: string | null };
export type GroupAnnouncement = { id: string; body: string; isEmergency: boolean; priority: number; createdAt: string };
/** voteCounts comes back keyed by option index (`{ "0": 3, "2": 1 }`); options with no votes are missing. */
export type GroupPoll = {
  id: string;
  question: string;
  options: string[];
  voteCounts: Record<string, number> | number[];
  myOptionIndex: number | null;
};
export type GroupItineraryItem = { shareId: string; booking: { id: string; status: string; product?: string; route?: string | null; itinerary?: unknown } };

export const groupsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    groups: build.query<TravelGroup[], void>({ query: () => "/groups", providesTags: ["Groups"] }),
    createGroup: build.mutation<TravelGroup, { name: string; type: GroupType }>({
      query: (body) => ({ url: "/groups", method: "POST", body }),
      invalidatesTags: ["Groups"],
    }),
    joinGroup: build.mutation<unknown, { inviteCode: string }>({
      query: (body) => ({ url: "/groups/join", method: "POST", body }),
      invalidatesTags: ["Groups"],
    }),
    respondInvitation: build.mutation<unknown, { id: string; accept: boolean }>({
      query: ({ id, accept }) => ({ url: `/groups/${id}/invitations/${accept ? "accept" : "decline"}`, method: "POST" }),
      invalidatesTags: ["Groups"],
    }),
    groupRequests: build.query<{ items: GroupTravelRequest[]; minPassengerCount: number }, void>({
      query: () => "/groups/requests",
      providesTags: ["Groups"],
    }),
    createGroupRequest: build.mutation<GroupTravelRequest, CreateGroupTravelRequestBody>({
      query: (body) => ({ url: "/groups/requests", method: "POST", body }),
      invalidatesTags: ["Groups"],
    }),
    cancelGroupRequest: build.mutation<GroupTravelRequest, { id: string; reason?: string }>({
      query: ({ id, ...body }) => ({ url: `/groups/requests/${id}/cancel`, method: "POST", body }),
      invalidatesTags: ["Groups"],
    }),
    group: build.query<TravelGroup, string>({
      query: (id) => `/groups/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Groups" as const, id }],
    }),
    groupMembers: build.query<GroupMember[], string>({
      query: (id) => `/groups/${id}/members`,
      providesTags: (_r, _e, id) => [{ type: "Groups" as const, id }],
    }),
    inviteMember: build.mutation<unknown, { id: string; email: string }>({
      query: ({ id, email }) => ({ url: `/groups/${id}/invitations`, method: "POST", body: { email } }),
      invalidatesTags: ["Groups"],
    }),
    announcements: build.query<GroupAnnouncement[], string>({
      query: (id) => `/groups/${id}/announcements`,
      providesTags: (_r, _e, id) => [{ type: "Groups" as const, id }],
    }),
    postAnnouncement: build.mutation<unknown, { id: string; body: string; emergency?: boolean }>({
      query: ({ id, body, emergency }) => ({ url: `/groups/${id}/${emergency ? "emergency" : "announcements"}`, method: "POST", body: { body } }),
      invalidatesTags: ["Groups"],
    }),
    polls: build.query<GroupPoll[], string>({
      query: (id) => `/groups/${id}/polls`,
      providesTags: (_r, _e, id) => [{ type: "Groups" as const, id }],
    }),
    createPoll: build.mutation<unknown, { id: string; question: string; options: string[] }>({
      query: ({ id, ...body }) => ({ url: `/groups/${id}/polls`, method: "POST", body }),
      invalidatesTags: ["Groups"],
    }),
    vote: build.mutation<unknown, { id: string; pollId: string; optionIndex: number }>({
      query: ({ id, pollId, optionIndex }) => ({ url: `/groups/${id}/polls/${pollId}/vote`, method: "POST", body: { optionIndex } }),
      invalidatesTags: ["Groups"],
    }),
    groupItinerary: build.query<{ items: GroupItineraryItem[] }, string>({
      query: (id) => `/groups/${id}/itinerary`,
      providesTags: (_r, _e, id) => [{ type: "Groups" as const, id }],
    }),
    shareBooking: build.mutation<unknown, { id: string; bookingId: string }>({
      query: ({ id, bookingId }) => ({ url: `/groups/${id}/itinerary/bookings`, method: "POST", body: { bookingId } }),
      invalidatesTags: ["Groups"],
    }),
    leaveGroup: build.mutation<unknown, string>({
      query: (id) => ({ url: `/groups/${id}/leave`, method: "POST" }),
      invalidatesTags: ["Groups"],
    }),
  }),
});

export const {
  useGroupsQuery,
  useCreateGroupMutation,
  useJoinGroupMutation,
  useRespondInvitationMutation,
  useGroupRequestsQuery,
  useCreateGroupRequestMutation,
  useCancelGroupRequestMutation,
  useGroupQuery,
  useGroupMembersQuery,
  useInviteMemberMutation,
  useAnnouncementsQuery,
  usePostAnnouncementMutation,
  usePollsQuery,
  useCreatePollMutation,
  useVoteMutation,
  useGroupItineraryQuery,
  useShareBookingMutation,
  useLeaveGroupMutation,
} = groupsApi;
