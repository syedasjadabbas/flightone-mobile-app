import * as Crypto from "expo-crypto";
import { KEYS, getItem, setItem } from "./secureStorage";

let cached: string | null = null;

/** Stable per-install id, sent as `X-Device-Id` on every request. */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const stored = await getItem(KEYS.deviceId);
  if (stored) {
    cached = stored;
    return stored;
  }
  const fresh = Crypto.randomUUID();
  await setItem(KEYS.deviceId, fresh);
  cached = fresh;
  return fresh;
}

/** Sync read for request headers; `null` until `getDeviceId()` has run once at boot. */
export function peekDeviceId(): string | null {
  return cached;
}
