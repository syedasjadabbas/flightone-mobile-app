/**
 * Public runtime config. Everything here is bundled into the app, so it must
 * never hold a secret (no INTERNAL_API_KEY, no supplier keys).
 */
const DEFAULT_API_URL = "http://localhost:8084/api/v1";

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, "");

/** Sent on every request so the server can tell native clients from the browser app. */
export const CLIENT_PLATFORM = "mobile";
