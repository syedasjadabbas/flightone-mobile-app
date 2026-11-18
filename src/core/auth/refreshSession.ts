import { API_BASE_URL } from "@/core/config/env";
import { clientHeaders } from "@/core/api/headers";
import { useAuthStore, type AuthSession } from "./auth.store";

/**
 * One refresh at a time: every 401 that arrives while a refresh is running
 * waits on the same promise instead of firing its own `/auth/refresh`.
 *
 * Resolves `true` when a new access token is in the store.
 * On a definitive rejection (401/403) the session is cleared with the
 * server's message; on a network blip / 5xx the session is left alone.
 */
let inFlight: Promise<boolean> | null = null;

export function refreshSessionOnce(): Promise<boolean> {
  if (!inFlight) {
    inFlight = doRefresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function doRefresh(): Promise<boolean> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return false;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientHeaders() },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return false;
  }

  let body: { success?: boolean; message?: string; data?: AuthSession } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.ok && body?.data?.accessToken) {
    await useAuthStore.getState().setSession(body.data);
    return true;
  }

  if (res.status === 401 || res.status === 403) {
    await useAuthStore
      .getState()
      .clearSession(body?.message || "Your session has ended. Please sign in again.");
  }
  return false;
}
