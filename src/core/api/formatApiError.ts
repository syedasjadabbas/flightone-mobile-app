/**
 * Short, non-technical error copy for the UI. Same rules as the web app's
 * `lib/api/formatApiError.ts`: never show Prisma/SQL/stack text.
 */
const TECHNICAL_RE =
  /\b(prisma|postgres|sql|econnrefused|econnreset|etimedout|stack|invocation|column `|relation "|invalid\s+`|P20\d{2}|ENOENT|EADDRINUSE|TypeError|ReferenceError)\b/i;

const STATUS_DEFAULTS: Record<number, string> = {
  400: "Please check your details and try again.",
  401: "Incorrect email or password.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "That conflicts with something already saved.",
  413: "That request is too large. Try a smaller file.",
  422: "Please check your details and try again.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: "Something went wrong on our side. Please try again.",
  502: "We're having trouble reaching our servers. Please try again.",
  503: "The service is temporarily unavailable. Please try again shortly.",
  504: "That took too long. Please try again.",
};

const NETWORK_MESSAGE = "Can't reach FlightOne. Check your connection and try again.";

function safe(message: unknown): string | null {
  if (typeof message !== "string") return null;
  const trimmed = message.trim();
  if (!trimmed || TECHNICAL_RE.test(trimmed)) return null;
  return trimmed;
}

export function formatApiError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!error) return fallback;
  if (typeof error === "string") return safe(error) ?? fallback;
  if (typeof error !== "object") return fallback;

  const err = error as {
    status?: number | string;
    originalStatus?: number;
    data?: unknown;
    message?: string;
  };

  if (err.data && typeof err.data === "object") {
    const fromServer = safe((err.data as { message?: unknown }).message);
    if (fromServer) return fromServer;
  }

  if (err.status === "FETCH_ERROR" || err.status === "TIMEOUT_ERROR") return NETWORK_MESSAGE;

  const status =
    typeof err.status === "number" ? err.status : typeof err.originalStatus === "number" ? err.originalStatus : null;
  if (status && STATUS_DEFAULTS[status]) return STATUS_DEFAULTS[status];

  return safe(err.message) ?? fallback;
}
