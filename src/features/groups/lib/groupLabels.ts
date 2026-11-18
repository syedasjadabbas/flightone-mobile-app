import type { GroupDateFlexibility, GroupType } from "../api/groupsApi";

export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  CORPORATE_TOUR: "Corporate tour",
  STUDENT: "Student group",
  UMRAH_HAJJ: "Umrah / Hajj",
  LEISURE: "Leisure",
  SPORTS: "Sports team",
  FAMILY: "Family",
  OTHER: "Other",
};

export const FLEXIBILITY_LABELS: Record<GroupDateFlexibility, string> = {
  EXACT: "Exact dates",
  PLUS_MINUS_1: "± 1 day",
  PLUS_MINUS_3: "± 3 days",
  FLEXIBLE_WEEK: "Flexible week",
};

/** Same minimum as the web's `lib/groups/groupRequest.ts` and the server validator. */
export const MIN_GROUP_PASSENGERS = 10;
export const MAX_GROUP_PASSENGERS = 500;

export function isValidGroupPassengerCount(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_GROUP_PASSENGERS && n <= MAX_GROUP_PASSENGERS;
}

/** Random idempotency key for request submission (8..120 chars on the server). */
export function newIdempotencyKey(): string {
  return `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
