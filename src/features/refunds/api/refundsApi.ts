import { baseApi } from "@/core/api/baseApi";

/** Refund types — same as the web's `client/lib/api/refunds.api.ts`. */
export type RefundCaseStatus =
  | "DRAFT"
  | "QUOTED"
  | "ELIGIBLE"
  | "SUBMITTED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REQUIRES_HUMAN"
  | "REJECTED"
  | "NOT_ELIGIBLE";
export type DataAvailabilityStatus = "OK" | "DATA_UNAVAILABLE" | "UNSUPPORTED" | "PROVIDER_UNCONFIGURED" | "REQUIRES_HUMAN";
export type RefundCalculation = {
  id: string;
  bookingId: string;
  currency: string;
  grossPaidMinor: number;
  supplierPenaltyMinor: number;
  agencyFeeMinor: number;
  refundableMinor: number;
  nonRefundableMinor?: number;
  travelCreditMinor: number;
  dataStatus: DataAvailabilityStatus;
  processingTimelineStatus: DataAvailabilityStatus;
  processingTimelineNote?: string | null;
  kind?: string;
  formula?: Record<string, unknown>;
  createdAt: string;
};
export type RefundCase = {
  id: string;
  bookingId: string;
  calculationId?: string | null;
  status: RefundCaseStatus;
  kind?: string;
  reason?: string | null;
  partial?: boolean;
  paymentRefundStatus?: string;
  supplierOperationNote?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  calculation?: RefundCalculation | null;
  audit?: Array<{ id: string; action: string; createdAt: string }>;
};
export type RefundableBooking = {
  bookingId: string;
  status: string;
  product: string;
  currency: string;
  amountMinor: number;
  createdAt: string;
  trip?: { stops: string[]; firstDate: string | null; hotelName: string | null; reference: string | null };
  eligible: boolean;
  eligibilityStatus: string;
  dataStatus: string;
  refundableMinor: number | null;
  confirmed: boolean;
};
export type Eligibility = {
  eligible: boolean;
  status: string;
  reason?: string;
  bookingId: string;
  product?: string;
  currency?: string;
  calculationPreview?: Partial<RefundCalculation> & { confirmed?: boolean };
};

export const refundsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    refundableBookings: build.query<{ items: RefundableBooking[] }, void>({
      query: () => "/refunds/bookings",
      providesTags: ["Refunds"],
    }),
    refundEligibility: build.query<Eligibility, string>({
      query: (bookingId) => `/refunds/eligibility/${bookingId}`,
      providesTags: ["Refunds"],
    }),
    refundCases: build.query<{ items: RefundCase[]; total: number }, void>({
      query: () => "/refunds/cases",
      providesTags: ["Refunds"],
    }),
    refundCase: build.query<RefundCase, string>({
      query: (id) => `/refunds/cases/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Refunds" as const, id }],
    }),
    calculateRefund: build.mutation<RefundCalculation, { bookingId: string; kind?: "REFUND" | "CANCELLATION" }>({
      query: (body) => ({ url: "/refunds/calculate", method: "POST", body }),
      invalidatesTags: ["Refunds"],
    }),
    createRefundCase: build.mutation<
      RefundCase,
      { bookingId: string; calculationId?: string; reason?: string; idempotencyKey?: string; kind?: string }
    >({
      query: (body) => ({ url: "/refunds/cases", method: "POST", body }),
      invalidatesTags: ["Refunds"],
    }),
    submitRefundCase: build.mutation<RefundCase, string>({
      query: (id) => ({ url: `/refunds/cases/${id}/submit`, method: "POST" }),
      invalidatesTags: ["Refunds"],
    }),
    requestCancellation: build.mutation<
      { calculation: RefundCalculation; refundCase: RefundCase },
      { bookingId: string; reason?: string; idempotencyKey?: string }
    >({
      query: (body) => ({ url: "/refunds/cancellation/request", method: "POST", body }),
      invalidatesTags: ["Refunds", "Journey"],
    }),
  }),
});

export const {
  useRefundableBookingsQuery,
  useRefundEligibilityQuery,
  useRefundCasesQuery,
  useRefundCaseQuery,
  useCalculateRefundMutation,
  useCreateRefundCaseMutation,
  useSubmitRefundCaseMutation,
  useRequestCancellationMutation,
} = refundsApi;
