/** Traveller Vault types — same as the web's `client/lib/api/vault.api.ts`. */
export type VaultDocType =
  | "PASSPORT"
  | "NATIONAL_ID"
  | "RESIDENCE_PERMIT"
  | "VISA"
  | "TICKET"
  | "HOTEL_VOUCHER"
  | "INSURANCE"
  | "FF_CARD"
  | "LOYALTY_CARD"
  | "TRAVEL_CERT"
  | "OTHER";

export type VaultStorageCapability = {
  provider: string;
  configured: boolean;
  canUpload: boolean;
  canDownload: boolean;
  maxBytes: number;
  allowedMimeTypes: string[];
  reasons: string[];
};

export type VaultVisaHolderStatus = "ISSUED" | "PENDING" | "IN_PROCESS" | "CANCELLED";

export type VaultVisaMeta = {
  destinationCode: string | null;
  visaType: string | null;
  holderStatus: VaultVisaHolderStatus;
  visaStatus: string;
  visaApplicationId: string | null;
  appointmentAt: string | null;
  appointmentLocation: string | null;
  issuingAuthority: string | null;
  remindersEnabled: boolean;
};

export type VaultDocument = {
  id: string;
  ownerUserId: string;
  companionId: string | null;
  type: VaultDocType;
  title: string;
  bookingId: string | null;
  issueDate: string | null;
  expiresAt: string | null;
  fileUrl: string | null;
  contentType: string | null;
  byteSize: number | null;
  originalFilename: string | null;
  version: number;
  isActive: boolean;
  hasBinary: boolean;
  lifecycleStatus?: "ACTIVE" | "EXPIRED" | "SUPERSEDED";
  expiryStatus?: "unknown" | "valid" | "expiring_soon" | "expired";
  daysUntilExpiry?: number | null;
  isPlatformIssued?: boolean;
  visaMeta?: VaultVisaMeta | null;
  createdAt: string;
  updatedAt: string;
};

export type VaultUploadBody = {
  type: VaultDocType;
  title: string;
  contentType: string;
  originalFilename: string;
  contentBase64: string;
  issueDate?: string;
  expiresAt?: string;
};
