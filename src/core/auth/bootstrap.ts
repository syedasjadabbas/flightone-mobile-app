import { getDeviceId } from "./deviceId";
import { useAuthStore } from "./auth.store";
import { refreshSessionOnce } from "./refreshSession";

/**
 * App start: load the device id and stored refresh token, then try to get a
 * fresh access token. Ends with status `signedIn` or `signedOut`.
 */
export async function bootstrapAuth(): Promise<void> {
  const store = useAuthStore.getState();
  await getDeviceId();
  await store.hydrate();

  if (!useAuthStore.getState().refreshToken) {
    store.setStatus("signedOut");
    return;
  }

  const ok = await refreshSessionOnce();
  if (ok) return; // setSession already moved status to signedIn

  // A definitive rejection has already cleared the session. A network failure
  // leaves the refresh token in place, so the next launch can try again.
  if (useAuthStore.getState().status === "booting") store.setStatus("signedOut");
}
