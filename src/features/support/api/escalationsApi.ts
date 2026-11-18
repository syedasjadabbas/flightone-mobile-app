import { baseApi } from "@/core/api/baseApi";
import type { PublicEscalationRouting } from "../lib/routingDisplay";

/** Escalation types — same as the web's `client/lib/api/escalations.api.ts` (traveller side). */
export type EscalationStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
export type EscalationTrigger =
  | "CUSTOMER_REQUEST"
  | "VIP_BOOKING"
  | "VIP"
  | "COMPLEX_ITINERARY"
  | "SUPPLIER_FAILURE"
  | "REFUND_DISPUTE"
  | "MEDICAL_ASSISTANCE"
  | "MEDICAL"
  | "SPECIAL_SERVICE_REQUEST"
  | "SSR"
  | "AI_DISCOUNT_LIMIT"
  | "VISA_UNCERTAIN"
  | "JOURNEY_DISRUPTION"
  | "OTHER";
export type EscalationTicket = {
  id: string;
  conversationId: string;
  status: EscalationStatus;
  trigger: EscalationTrigger;
  priority: number;
  assignedToUserId: string | null;
  bookingId: string | null;
  routing?: PublicEscalationRouting;
  handoff?: { mode: string; warmStatus: string; note: string } | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolutionNote?: string | null;
  contextSnapshot?: { messages?: Array<{ id: string; role: string; content: string; createdAt: string }>; messageCount?: number };
  deduplicated?: boolean;
};

export const escalationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    myEscalations: build.query<{ items: EscalationTicket[]; total: number }, void>({
      query: () => "/escalations/mine",
      providesTags: ["Escalations"],
    }),
    myEscalation: build.query<EscalationTicket, string>({
      query: (id) => `/escalations/mine/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Escalations" as const, id }],
    }),
    createConversation: build.mutation<{ id: string }, { title?: string }>({
      query: (body) => ({ url: "/conversations", method: "POST", body }),
      invalidatesTags: ["Conversation"],
    }),
    requestEscalation: build.mutation<
      EscalationTicket,
      { conversationId: string; trigger?: EscalationTrigger; bookingId?: string; note?: string }
    >({
      query: (body) => ({ url: "/escalations/request", method: "POST", body }),
      invalidatesTags: ["Escalations", "Conversation"],
    }),
  }),
});

export const { useMyEscalationsQuery, useMyEscalationQuery, useCreateConversationMutation, useRequestEscalationMutation } =
  escalationsApi;
