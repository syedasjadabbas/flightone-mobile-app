import { baseApi } from "@/core/api/baseApi";
import type { OcrApplyFieldKey, OcrExtractionResult } from "../lib/ocrReview";

/** Profile types — same as the web's `client/lib/api/profile.api.ts` (fields the app uses). */
export type ProfileCompleteness = { score: number; missing: string[]; readyForHandsFreeBooking: boolean };
export type TravellerProfile = {
  userId: string;
  displayName: string;
  phone: string | null;
  nationality: string | null;
  dateOfBirth?: string | null;
  seatPref: string | null;
  mealPref: string | null;
  preferredAirlines: string[] | null;
  preferredCabin: string | null;
  maxLayoverMinutes: number | null;
  metadata: unknown;
  completeness?: ProfileCompleteness;
};
export type ProfilePatch = {
  displayName?: string;
  phone?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  seatPref?: string | null;
  mealPref?: string | null;
  preferredAirlines?: string[] | null;
  preferredCabin?: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST" | null;
  maxLayoverMinutes?: number | null;
  /** Free-form profile extras (e.g. avatarUrl). Send the whole object — it replaces the stored one. */
  metadata?: Record<string, unknown>;
};
export type Companion = {
  id: string;
  kind: "COMPANION" | "FAMILY";
  fullName: string;
  relationship: string | null;
  dateOfBirth: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  hasPassport?: boolean;
};
export type LoyaltyMembership = { id: string; type: "AIRLINE" | "HOTEL"; programCode: string; memberNumber: string };
export type EmergencyContact = {
  id: string;
  fullName: string;
  relationship: string | null;
  phone: string;
  email: string | null;
  isPrimary: boolean;
};
export type IdentityDocument = {
  id: string;
  type: "PASSPORT" | "NATIONAL_ID" | "VISA" | "RESIDENCE_PERMIT";
  countryCode: string | null;
  documentSubtype: string | null;
  expiresAt: string | null;
  vaultDocumentId: string | null;
  status: "ACTIVE" | "SUPERSEDED" | "EXPIRED";
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  hasDocumentNumber?: boolean;
  expiry?: { state: "unknown" | "valid" | "expiring_soon" | "expired"; daysRemaining: number | null };
};
export type TravelHistory = {
  items: Array<{ id: string; status: string; product: string; currency: string; amountMinor: number; createdAt: string }>;
  stats: { totalBookings: number; completedBookings: number };
  patterns?: { frequentRoutes?: string[]; frequentAirlines?: string[] };
};
export type AuthDeviceSession = {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  userAgent: string | null;
  deviceLabel: string;
  ip: string | null;
  current: boolean;
};

export const profileApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    profile: build.query<TravellerProfile, void>({
      query: () => "/profile",
      providesTags: ["Profile"],
    }),
    updateProfile: build.mutation<TravellerProfile, ProfilePatch>({
      query: (body) => ({ url: "/profile", method: "PATCH", body }),
      invalidatesTags: ["Profile"],
    }),
    companions: build.query<Companion[], void>({
      query: () => "/profile/companions",
      providesTags: ["ProfileCompanions"],
    }),
    addCompanion: build.mutation<Companion, { fullName: string; relationship?: string; dateOfBirth?: string; kind?: "COMPANION" | "FAMILY" }>({
      query: (body) => ({ url: "/profile/companions", method: "POST", body }),
      invalidatesTags: ["ProfileCompanions", "Profile"],
    }),
    deleteCompanion: build.mutation<void, string>({
      query: (id) => ({ url: `/profile/companions/${id}`, method: "DELETE" }),
      invalidatesTags: ["ProfileCompanions", "Profile"],
    }),
    emergencyContacts: build.query<EmergencyContact[], void>({
      query: () => "/profile/emergency-contacts",
      providesTags: ["ProfileEmergency"],
    }),
    addEmergencyContact: build.mutation<EmergencyContact, { fullName: string; phone: string; relationship?: string; email?: string; isPrimary?: boolean }>({
      query: (body) => ({ url: "/profile/emergency-contacts", method: "POST", body }),
      invalidatesTags: ["ProfileEmergency", "Profile"],
    }),
    deleteEmergencyContact: build.mutation<void, string>({
      query: (id) => ({ url: `/profile/emergency-contacts/${id}`, method: "DELETE" }),
      invalidatesTags: ["ProfileEmergency", "Profile"],
    }),
    loyalty: build.query<LoyaltyMembership[], void>({
      query: () => "/profile/loyalty",
      providesTags: ["ProfileLoyalty"],
    }),
    addLoyalty: build.mutation<LoyaltyMembership, { type: "AIRLINE" | "HOTEL"; programCode: string; memberNumber: string }>({
      query: (body) => ({ url: "/profile/loyalty", method: "POST", body }),
      invalidatesTags: ["ProfileLoyalty"],
    }),
    deleteLoyalty: build.mutation<void, string>({
      query: (id) => ({ url: `/profile/loyalty/${id}`, method: "DELETE" }),
      invalidatesTags: ["ProfileLoyalty"],
    }),
    identityDocuments: build.query<IdentityDocument[], void>({
      query: () => ({ url: "/profile/documents", params: { includeNumber: false } }),
      providesTags: ["ProfileDocuments"],
    }),
    createIdentityDocument: build.mutation<
      IdentityDocument,
      { type: IdentityDocument["type"]; vaultDocumentId?: string; expiresAt?: string; issuedAt?: string; countryCode?: string }
    >({
      query: (body) => ({ url: "/profile/documents", method: "POST", body }),
      invalidatesTags: ["ProfileDocuments", "Profile"],
    }),
    /** Read details from the document's stored scan (provider may be unconfigured — see ocrReview). */
    scanDocument: build.mutation<{ document: IdentityDocument; extraction: OcrExtractionResult; applied: false }, string>({
      query: (id) => ({ url: `/profile/documents/${id}/ocr`, method: "POST", body: {} }),
      invalidatesTags: ["ProfileDocuments"],
    }),
    applyScannedFields: build.mutation<IdentityDocument, { id: string; acceptedFields: OcrApplyFieldKey[] }>({
      query: ({ id, acceptedFields }) => ({ url: `/profile/documents/${id}/ocr/apply`, method: "POST", body: { acceptedFields } }),
      invalidatesTags: ["ProfileDocuments", "Profile"],
    }),
    updateIdentityDocument: build.mutation<
      IdentityDocument,
      { id: string; patch: Partial<{ documentNumber: string; countryCode: string; documentSubtype: string; issuedAt: string; expiresAt: string }> }
    >({
      query: ({ id, patch }) => ({ url: `/profile/documents/${id}`, method: "PATCH", body: patch }),
      invalidatesTags: ["ProfileDocuments", "Profile"],
    }),
    travelHistory: build.query<TravelHistory, void>({
      query: () => ({ url: "/profile/history", params: { limit: 20 } }),
      providesTags: ["Profile"],
    }),
    sessions: build.query<{ sessions: AuthDeviceSession[] }, string | null>({
      query: (currentSessionId) => ({
        url: "/auth/sessions",
        params: currentSessionId ? { currentSessionId } : undefined,
      }),
      providesTags: ["AuthSessions"],
    }),
    revokeSession: build.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/auth/sessions/${id}`, method: "DELETE" }),
      invalidatesTags: ["AuthSessions"],
    }),
  }),
});

export const {
  useProfileQuery,
  useUpdateProfileMutation,
  useCompanionsQuery,
  useAddCompanionMutation,
  useDeleteCompanionMutation,
  useEmergencyContactsQuery,
  useAddEmergencyContactMutation,
  useDeleteEmergencyContactMutation,
  useLoyaltyQuery,
  useAddLoyaltyMutation,
  useDeleteLoyaltyMutation,
  useIdentityDocumentsQuery,
  useCreateIdentityDocumentMutation,
  useScanDocumentMutation,
  useApplyScannedFieldsMutation,
  useUpdateIdentityDocumentMutation,
  useTravelHistoryQuery,
  useSessionsQuery,
  useRevokeSessionMutation,
} = profileApi;
