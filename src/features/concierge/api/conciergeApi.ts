import { baseApi } from "@/core/api/baseApi";

/** Concierge types — same as the web's `client/lib/api/concierge.api.ts`. Rules are strictly per-user. */
export type ConciergeTrigger = "DELAY" | "CANCELLED" | "DISRUPTION" | "REBOOK_OPPORTUNITY";
export type ConciergeAction = "NOTIFY" | "PREPARE_REBOOK" | "AUTONOMOUS_REBOOK";
export type ConciergeRule = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: ConciergeTrigger;
  thresholdMinutes: number | null;
  action: ConciergeAction;
  maxAdditionalMinor: number;
  currency: string;
  notifyOnTrigger: boolean;
  disabledAt: string | null;
  createdAt: string;
};
export type ConciergeExecution = {
  id: string;
  ruleId: string;
  bookingId: string;
  status: string;
  reason: string | null;
  extraMinor: number | null;
  createdAt: string;
};
export type CreateConciergeRuleBody = {
  name: string;
  trigger: ConciergeTrigger;
  thresholdMinutes?: number | null;
  action: ConciergeAction;
  maxAdditionalMinor: number;
  currency?: string;
  notifyOnTrigger?: boolean;
  enabled?: boolean;
};

export const conciergeApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    conciergeRules: build.query<{ items: ConciergeRule[] }, void>({
      query: () => "/concierge/rules",
      providesTags: ["Concierge"],
    }),
    createConciergeRule: build.mutation<ConciergeRule, CreateConciergeRuleBody>({
      query: (body) => ({ url: "/concierge/rules", method: "POST", body }),
      invalidatesTags: ["Concierge"],
    }),
    enableConciergeRule: build.mutation<ConciergeRule, string>({
      query: (id) => ({ url: `/concierge/rules/${id}`, method: "PATCH", body: { enabled: true } }),
      invalidatesTags: ["Concierge"],
    }),
    disableConciergeRule: build.mutation<ConciergeRule, string>({
      query: (id) => ({ url: `/concierge/rules/${id}/disable`, method: "POST" }),
      invalidatesTags: ["Concierge"],
    }),
    conciergeKillSwitch: build.mutation<{ disabledCount: number }, void>({
      query: () => ({ url: "/concierge/kill-switch", method: "POST" }),
      invalidatesTags: ["Concierge"],
    }),
    conciergeActivity: build.query<{ items: ConciergeExecution[]; total: number }, void>({
      query: () => ({ url: "/concierge/activity", params: { page: 1, pageSize: 20 } }),
      providesTags: ["Concierge"],
    }),
  }),
});

export const {
  useConciergeRulesQuery,
  useCreateConciergeRuleMutation,
  useEnableConciergeRuleMutation,
  useDisableConciergeRuleMutation,
  useConciergeKillSwitchMutation,
  useConciergeActivityQuery,
} = conciergeApi;
