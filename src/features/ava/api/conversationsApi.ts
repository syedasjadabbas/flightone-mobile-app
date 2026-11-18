import { baseApi } from "@/core/api/baseApi";
import type { SearchResultsPanel, TravelPlan } from "../types";

/** Saved Ava chats — same API the web uses (`client/lib/api/conversations.api.ts`). */
export type ConversationSummary = { id: string; title: string | null; status: string; createdAt: string; updatedAt: string };
export type ConversationDetail = ConversationSummary & {
  metadata: { travelPlan?: TravelPlan | null; searchPanel?: SearchResultsPanel | null } | null;
  messages?: Array<{ id: string; role: "USER" | "ASSISTANT" | "SYSTEM" | "AGENT"; content: string; provider: string | null; createdAt: string }>;
};
export type RecordMessageInput = { role: "USER" | "ASSISTANT"; content: string; provider?: string | null };

/** Support cases also create conversations; they aren't Ava chats. */
export const isAvaChat = (c: Pick<ConversationSummary, "title">) => !(c.title ?? "").startsWith("Support ·");

export const conversationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    conversations: build.query<{ items: ConversationSummary[]; total: number }, void>({
      query: () => ({ url: "/conversations", params: { pageSize: 50 } }),
      providesTags: ["Conversation"],
    }),
    conversation: build.query<ConversationDetail, string>({
      query: (id) => `/conversations/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Conversation" as const, id }],
    }),
    startConversation: build.mutation<ConversationDetail, { title?: string }>({
      query: (body) => ({ url: "/conversations", method: "POST", body }),
      invalidatesTags: ["Conversation"],
    }),
    recordMessages: build.mutation<
      unknown,
      { conversationId: string; messages: RecordMessageInput[]; travelPlan?: TravelPlan | null; searchPanel?: SearchResultsPanel | null }
    >({
      query: ({ conversationId, ...body }) => ({ url: `/conversations/${conversationId}/messages/record`, method: "POST", body }),
      invalidatesTags: (_r, _e, arg) => ["Conversation", { type: "Conversation" as const, id: arg.conversationId }],
    }),
    deleteConversation: build.mutation<{ id: string; deleted: boolean }, string>({
      query: (id) => ({ url: `/conversations/${id}`, method: "DELETE" }),
      invalidatesTags: ["Conversation"],
    }),
  }),
});

export const {
  useConversationsQuery,
  useConversationQuery,
  useStartConversationMutation,
  useRecordMessagesMutation,
  useDeleteConversationMutation,
} = conversationsApi;
