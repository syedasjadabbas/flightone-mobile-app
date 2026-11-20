import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { API_BASE_URL } from "@/core/config/env";
import { CREDENTIAL_PATHS, TAGS } from "@/core/constants/api";
import { useAuthStore } from "@/core/auth/auth.store";
import { refreshSessionOnce } from "@/core/auth/refreshSession";
import { useConnectionStore } from "./connection.store";
import { clientHeaders } from "./headers";
import { formatApiError } from "./formatApiError";

/** The server's fixed response envelope. */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

const RETRY_STATUSES = new Set([429, 503]);
const MAX_RETRIES = 2;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  timeout: 30_000,
  prepareHeaders: (headers) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    for (const [k, v] of Object.entries(clientHeaders())) headers.set(k, v);
    return headers;
  },
});

function isCredentialRequest(args: string | FetchArgs): boolean {
  const url = typeof args === "string" ? args : args.url;
  return CREDENTIAL_PATHS.has(url.split("?")[0]);
}

function retryDelayMs(attempt: number, retryAfter: string | null): number {
  const seconds = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 10_000);
  return 500 * 2 ** attempt;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 1. Adds the Bearer token, platform and device id headers.
 * 2. Retries 429 / 503 with backoff (honours Retry-After).
 * 3. On a 401 (except credential endpoints) runs one shared refresh and retries once.
 * 4. Unwraps `{ success, message, data }` and swaps error text for friendly copy.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const run = async () => {
    let result = await rawBaseQuery(args, api, extraOptions);
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const status = result.error?.status;
      if (typeof status !== "number" || !RETRY_STATUSES.has(status)) break;
      await sleep(retryDelayMs(attempt, result.meta?.response?.headers.get("Retry-After") ?? null));
      result = await rawBaseQuery(args, api, extraOptions);
    }
    return result;
  };

  let result = await run();

  // Track whether the server can be reached at all (drives the "Can't reach FlightOne" banner).
  const status = result.error?.status;
  if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") useConnectionStore.getState().setReachable(false);
  else if (result.meta?.response) useConnectionStore.getState().setReachable(true);

  if (result.error?.status === 401 && !isCredentialRequest(args)) {
    const refreshed = await refreshSessionOnce();
    if (refreshed) result = await run();
  }

  if (!result.error && result.data && typeof result.data === "object" && "data" in result.data) {
    return { ...result, data: (result.data as ApiEnvelope<unknown>).data };
  }

  if (result.error && typeof result.error.status === "number") {
    const existing =
      result.error.data && typeof result.error.data === "object" ? (result.error.data as object) : {};
    return {
      ...result,
      error: { ...result.error, data: { ...existing, message: formatApiError(result.error) } },
    };
  }

  return result;
};

/** The only createApi instance. Features add endpoints with `baseApi.injectEndpoints`. */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: TAGS,
  endpoints: () => ({}),
});
