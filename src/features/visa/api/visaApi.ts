import { baseApi } from "@/core/api/baseApi";

/** Visa types — same as the web's `client/lib/api/visa.api.ts`. */
export type VisaCategory = "VISA_FREE" | "VOA" | "E_VISA" | "EMBASSY" | "UNKNOWN";
export type VisaRequirementView = {
  nationalityCode: string;
  destinationCode: string;
  role?: "destination" | "transit";
  category: VisaCategory;
  dataStatus: string;
  isFact: boolean;
  isGuidance: boolean;
  escalateRecommended: boolean;
  source: string | null;
  lastVerifiedAt: string | null;
  confidenceNote: string;
  transitNotes?: string | null;
  requiredDocuments?: unknown;
  embassyInfo?: unknown;
  processingDaysMin?: number | null;
  processingDaysMax?: number | null;
  transit?: VisaRequirementView[];
};
export type VisaChecklist = {
  items?: Array<{ item: string; presentHint?: boolean; matchHint?: string | null }>;
  missingCount?: number;
  note?: string;
};
export type VisaAssessment = {
  status: string;
  isFact: boolean;
  isGuidance: boolean;
  escalateRecommended: boolean;
  missingInputs: string[];
  avaSummary: string;
  requirement: VisaRequirementView | null;
  checklist: VisaChecklist | null;
  heldVisa: { hasMatchingVisaOnFile?: boolean; expiresAt?: string | null; expiryStatus?: string | null; note?: string | null } | null;
  traveller: { nationality: string | null; hasPassport: boolean; passportExpiry?: string | null; passportExpiryStatus?: string | null };
};
export type VisaApplication = {
  id: string;
  nationalityCode: string;
  destinationCode: string;
  category: VisaCategory | null;
  status: string;
  appointmentAt: string | null;
  appointmentLocation: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
export type VisaCapability = { provider: string; configured: boolean; canLookup: boolean; sourceKind?: string; reasons: string[] };

export const visaApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    visaCapability: build.query<VisaCapability, void>({
      query: () => "/visa/capability",
      providesTags: ["Visa"],
    }),
    assessVisa: build.mutation<
      VisaAssessment,
      { destination: string; nationality?: string; transitCountries?: string[]; purpose?: string }
    >({
      query: (body) => ({ url: "/visa/assess", method: "POST", body }),
    }),
    visaApplications: build.query<{ items: VisaApplication[]; total: number }, void>({
      query: () => "/visa/applications",
      providesTags: ["Visa"],
    }),
    createVisaApplication: build.mutation<
      VisaApplication,
      { nationality: string; destination: string; category?: VisaCategory; notes?: string }
    >({
      query: (body) => ({ url: "/visa/applications", method: "POST", body }),
      invalidatesTags: ["Visa"],
    }),
    escalateVisa: build.mutation<
      { escalated: boolean; trigger?: unknown; auditOnly?: boolean },
      { destination?: string; nationality?: string; reason?: string }
    >({
      query: (body) => ({ url: "/visa/escalate", method: "POST", body }),
    }),
  }),
});

export const {
  useVisaCapabilityQuery,
  useAssessVisaMutation,
  useVisaApplicationsQuery,
  useCreateVisaApplicationMutation,
  useEscalateVisaMutation,
} = visaApi;
