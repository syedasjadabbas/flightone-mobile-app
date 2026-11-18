/**
 * The parts of Ava's response the mobile app reads. Shapes match the server's
 * `modules/ava/engine` output (ported from the web app's `lib/consultant/types.ts`
 * and `lib/ask-ai/types.ts`); fields the app doesn't use are left out.
 */

export type OfferType = "flight" | "hotel" | "package" | string;

export interface OfferCardFlight {
  airline: string;
  airlineCode: string;
  originCode: string;
  destinationCode: string;
  originCity: string;
  destinationCity: string;
  departTimeLocal: string;
  arriveTimeLocal: string | null;
  departureDate?: string;
  durationMinutes: number;
  stops: number;
  cabin: "economy" | "premium" | "business";
  baggageKg?: number;
  refundable?: boolean;
  flightNumber?: string;
  returnDate?: string;
  returnStops?: number;
  returnDurationMinutes?: number;
  fareBrandName?: string;
}

export interface OfferCardHotel {
  name: string;
  city: string;
  area: string;
  stars: number;
  roomType: string;
  meal?: string;
  breakfastIncluded: boolean;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  stayPrice?: string;
  refundable?: boolean;
  cancellationDeadline?: string;
  roomsLeft?: number;
  imageUrls?: string[];
}

export interface OfferCard {
  id: string;
  type: OfferType;
  angle: string;
  title: string;
  subtitle: string;
  price: string;
  priceMinor: number;
  currency: string;
  bookable?: boolean;
  marketPrice: string | null;
  savingsPct: number | null;
  reasons: string[];
  badges: string[];
  unitsLeft?: number;
  roundTrip?: boolean;
  returnDate?: string;
  flight?: OfferCardFlight;
  hotel?: OfferCardHotel;
  /** Server-side snapshot the quote is built from (never the card's price). */
  supplierOfferSnapshotId?: string;
  metadata?: Record<string, unknown>;
}

/** Multi-city / separate-ticket trip card (only what bookability reads). */
export interface ItinerarySummary {
  id: string;
  construction: "single_ticket" | "multiple_tickets";
  totalPrice: string;
  legs?: Array<{
    originCode: string;
    destinationCode: string;
    airlineCode: string;
    departureDate?: string;
    flightNumber?: string;
    bookable?: boolean;
  }>;
}

export interface SearchResultsPanel {
  offers: OfferCard[];
  totalCount: number;
  liveFlights?: boolean;
  liveHotels?: boolean;
  queryLabel?: string;
  tripTitle?: string;
  dateSpan?: string;
  legRoute?: string;
  followUpSuggestions?: string[];
  emptyHint?: string;
  passengers?: number;
}

/** Opaque to the app: sent back as `previousTravelPlan` so follow-ups keep their dates. */
export type TravelPlan = { action?: string; draft?: unknown } & Record<string, unknown>;

export interface AvaMeta {
  provider?: string;
  travelPlan?: TravelPlan | null;
}

export interface AvaResult {
  reply: string;
  searchPanel?: SearchResultsPanel;
  meta?: AvaMeta;
}

export type AvaPhase = "extract" | "search" | "reply" | "done";

export type AvaStreamEvent =
  | { type: "status"; phase: AvaPhase }
  | { type: "searchResults"; panel: SearchResultsPanel; meta?: AvaMeta }
  | { type: "token"; delta: string }
  | { type: "done"; result: AvaResult }
  | { type: "error"; message: string }
  | { type: "offers" };

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatMessage extends ChatTurn {
  id: string;
  /** Results that came with this assistant reply. */
  panel?: SearchResultsPanel | null;
  followUps?: string[];
  pending?: boolean;
  failed?: boolean;
  /** A fresh reply that arrived in one piece: the bubble types it out, then shows the results. */
  reveal?: boolean;
}
