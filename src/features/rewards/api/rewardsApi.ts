import { baseApi } from "@/core/api/baseApi";

/** Rewards types — same as the web's `client/lib/api/rewards.api.ts`. */
export type RewardTierThreshold = { tier: string; minInclusive: number; nextTier: string | null; nextAt: number | null };
export type RewardEarningEvent = { id: string; status: string; description: string; points?: number };
export type RewardsPolicy = {
  earnPointsPerHundredMinor: number;
  referralBonusPoints: number;
  pointValueMinor: number;
  creditExpiryDays: number;
  tierThresholds?: RewardTierThreshold[];
  tierNotes?: string;
  earningEvents?: RewardEarningEvent[];
};
export type RewardsSummary = {
  balance: number;
  tier: string;
  referralCode: string;
  lifetimeEarned: number;
  progress: { tier: string; nextTier: string | null; pointsToNext: number; progressRatio: number; nextAt?: number | null };
  policy: RewardsPolicy;
};
export type RewardLedgerEntry = {
  id: string;
  type: string;
  points: number;
  bookingId: string | null;
  note: string | null;
  expiresAt?: string | null;
  createdAt: string;
};
export type Referral = {
  id: string;
  status: "REWARDED" | "PENDING_QUALIFYING_BOOKING";
  signupAt: string | null;
  firstBookingId: string | null;
  rewardedAt: string | null;
  createdAt: string;
};

export const rewardsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    rewardsSummary: build.query<RewardsSummary, void>({
      query: () => "/rewards",
      providesTags: ["Rewards"],
    }),
    rewardsLedger: build.query<{ items: RewardLedgerEntry[]; total: number; totalPages?: number }, { page: number }>({
      query: ({ page }) => ({ url: "/rewards/ledger", params: { page, pageSize: 10 } }),
      providesTags: ["Rewards"],
    }),
    referrals: build.query<{ items: Referral[] }, void>({
      query: () => "/rewards/referrals",
      providesTags: ["Rewards"],
    }),
    attachReferral: build.mutation<unknown, { code: string }>({
      query: (body) => ({ url: "/rewards/referrals/attach", method: "POST", body }),
      invalidatesTags: ["Rewards"],
    }),
  }),
});

export const { useRewardsSummaryQuery, useRewardsLedgerQuery, useReferralsQuery, useAttachReferralMutation } = rewardsApi;
