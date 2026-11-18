/**
 * Booking + profile shapes, same as the web app's `lib/api/bookings.api.ts`
 * and `lib/api/profile.api.ts` (only what checkout reads).
 */

export type BookingStatus = "QUOTED" | "RESERVED" | "TICKETED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "REFUNDED";

export type PayMethod = "card" | "corporate_credit" | "jazzcash" | "easypaisa" | "onelink_ibft";

export type PaymentRow = {
  id: string;
  status: string;
  provider: string;
  amountMinor: number;
  currency: string;
  providerPaymentId: string | null;
  metadata?: Record<string, any> | null;
};

export type BookingDetail = {
  id: string;
  status: BookingStatus;
  product: "FLIGHT" | "HOTEL" | "PACKAGE";
  currency: string;
  amountMinor: number;
  netMinor: number;
  marginMinor: number;
  supplierCode: string | null;
  externalRef: string | null;
  quoteExpiresAt: string | null;
  reservedUntil: string | null;
  route?: string | null;
  cabin?: string | null;
  travellerSnapshot: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  supplierBookingRefs?: Record<string, unknown> | null;
  payments?: PaymentRow[];
  paymentCapability?: {
    configured: boolean;
    canCapture: boolean;
    mode: string;
    provider: string;
    reasons: string[];
    methods?: Partial<Record<PayMethod, boolean>>;
  };
  supplierCapability?: {
    canReserve: boolean;
    canTicket: boolean;
    mode: string;
    reasons: string[];
  };
  createdAt?: string;
};

export type BookingListItem = Pick<
  BookingDetail,
  "id" | "status" | "product" | "currency" | "amountMinor" | "route" | "createdAt" | "metadata"
>;

export interface HotelRoomGuests {
  adults: number;
  children: number[];
}

export type TravellerProfile = {
  userId: string;
  displayName: string;
  phone: string | null;
  nationality: string | null;
  dateOfBirth?: string | null;
};

export type Companion = {
  id: string;
  fullName: string;
  relationship: string | null;
  dateOfBirth: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
};

export type IdentityDocument = {
  id: string;
  type: "PASSPORT" | "NATIONAL_ID" | "VISA" | "RESIDENCE_PERMIT";
  documentNumber: string | null;
  countryCode: string | null;
  expiresAt: string | null;
  status: "ACTIVE" | "SUPERSEDED" | "EXPIRED";
  companionId: string | null;
};
