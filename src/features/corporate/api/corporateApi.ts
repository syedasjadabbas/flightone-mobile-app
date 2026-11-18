import { baseApi } from "@/core/api/baseApi";

/** Corporate types — same as the web's `client/lib/api/corporate.api.ts` (traveller-facing parts). */
export type CompanyMembershipRole = "MEMBER" | "APPROVER" | "ADMIN";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
export type Company = {
  id: string;
  name: string;
  creditLimitMinor: number;
  creditUsedMinor: number;
  currency: string;
  isActive: boolean;
};
export type ActiveCorporateProfile = {
  mode: "PERSONAL" | "CORPORATE";
  companyId: string | null;
  membership?: { role: CompanyMembershipRole; department: string | null; costCentre: string | null };
  company?: { id: string; name: string; currency: string; creditLimitMinor: number; creditUsedMinor: number; creditAvailableMinor: number };
  policy?: { id: string; maxCabin: string | null; maxAmountMinor: number | null; preferredAirlines: unknown; advanceBookingDays: number | null } | null;
};
export type ApprovalRequest = {
  id: string;
  companyId: string;
  bookingId: string;
  status: ApprovalStatus;
  amountMinor: number;
  currency: string;
  policyViolation: Record<string, unknown> | null;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
};
export type TravelPolicy = {
  id: string;
  name?: string;
  maxCabin: string | null;
  maxAmountMinor: number | null;
  advanceBookingDays: number | null;
  isActive?: boolean;
};
export type CompanyBooking = { id: string; status: string; product: string; currency: string; amountMinor: number; createdAt: string };
export type ApprovalGate = {
  corporate: boolean;
  companyId: string | null;
  approvalStatus: "REQUIRED" | "PENDING" | "APPROVED" | "REJECTED" | string | null;
  canProceed: boolean;
  policyEvaluation: { withinPolicy: boolean; violations: Array<{ code: string; message: string }>; policyId?: string } | null;
};
type Paged<T> = { items: T[]; total: number; page?: number; totalPages?: number };

export const corporateApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    companies: build.query<Company[], void>({
      query: () => "/corporate/companies",
      providesTags: ["Corporate"],
    }),
    createCompany: build.mutation<Company, { name: string; currency?: string }>({
      query: (body) => ({ url: "/corporate/companies", method: "POST", body }),
      invalidatesTags: ["Corporate"],
    }),
    activeProfile: build.query<ActiveCorporateProfile, { mode: "PERSONAL" | "CORPORATE"; companyId: string | null }>({
      query: ({ mode, companyId }) => ({
        url: "/corporate/me/active-profile",
        params: companyId ? { mode, companyId } : { mode },
      }),
      providesTags: ["Corporate"],
    }),
    approvals: build.query<Paged<ApprovalRequest>, { companyId: string; status?: ApprovalStatus }>({
      query: (params) => ({ url: "/corporate/approvals", params }),
      providesTags: ["Corporate"],
    }),
    requestApproval: build.mutation<ApprovalRequest, { bookingId: string; companyId: string }>({
      query: (body) => ({ url: "/corporate/approvals", method: "POST", body }),
      invalidatesTags: ["Corporate", "Fare"],
    }),
    decideApproval: build.mutation<ApprovalRequest, { id: string; decision: "APPROVE" | "REJECT"; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/corporate/approvals/${id}/decide`, method: "POST", body }),
      invalidatesTags: ["Corporate", "Fare"],
    }),
    policies: build.query<TravelPolicy[], string>({
      query: (companyId) => `/corporate/companies/${companyId}/policies`,
      providesTags: ["Corporate"],
    }),
    companyBookings: build.query<Paged<CompanyBooking>, string>({
      query: (companyId) => `/corporate/companies/${companyId}/bookings`,
      providesTags: ["Corporate"],
    }),
    approvalGate: build.query<ApprovalGate, string>({
      query: (bookingId) => `/corporate/bookings/${bookingId}/approval-gate`,
      providesTags: (_r, _e, id) => [{ type: "Corporate" as const, id }, "Fare"],
    }),
  }),
});

export const {
  useCompaniesQuery,
  useCreateCompanyMutation,
  useActiveProfileQuery,
  useApprovalsQuery,
  useRequestApprovalMutation,
  useDecideApprovalMutation,
  usePoliciesQuery,
  useCompanyBookingsQuery,
  useApprovalGateQuery,
} = corporateApi;
