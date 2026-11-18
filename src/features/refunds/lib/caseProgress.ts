// Copied from the web app's client/app/refunds/_components/caseProgress.ts — keep the two in step.
/**
 * Maps a real refund case status onto the traveller-facing progress tracker.
 * Only statuses the API actually returns move the tracker — nothing is inferred
 * beyond them (e.g. "Refunded" lights up only for COMPLETED).
 */
export const CASE_STEPS = ["Submitted", "Checking fare rules", "Processing", "Refunded"] as const;

export type CaseProgress =
  | {
      kind: "track";
      /** Number of steps fully completed (0–4). */
      done: number;
      /** Index of the step in progress, or null when every step is done. */
      current: number | null;
      /** Optional label override for the current step (e.g. agent review). */
      currentLabel?: string;
    }
  | { kind: "halted"; label: string }
  | { kind: "none" };

export function caseProgress(status: string): CaseProgress {
  switch (status) {
    case "DRAFT":
    case "QUOTED":
    case "ELIGIBLE":
      return { kind: "track", done: 0, current: 0, currentLabel: "Not submitted yet" };
    case "SUBMITTED":
      return { kind: "track", done: 1, current: 1 };
    case "REQUIRES_HUMAN":
      return { kind: "track", done: 1, current: 1, currentLabel: "Agent review" };
    case "PROCESSING":
      return { kind: "track", done: 2, current: 2 };
    case "COMPLETED":
      return { kind: "track", done: CASE_STEPS.length, current: null };
    case "FAILED":
      return { kind: "halted", label: "Stopped — refund failed" };
    case "REJECTED":
      return { kind: "halted", label: "Stopped — request rejected" };
    case "NOT_ELIGIBLE":
      return { kind: "halted", label: "Stopped — not eligible" };
    default:
      return { kind: "none" };
  }
}
