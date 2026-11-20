import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Thin wrapper over SecureStore (Keychain / Keystore). On web (dev preview only)
 * SecureStore is unavailable, so values live in memory for that tab.
 */
const memory = new Map<string, string>();
const isWeb = Platform.OS === "web";

export const KEYS = {
  refreshToken: "fo.refreshToken",
  sessionId: "fo.sessionId",
  user: "fo.user",
  deviceId: "fo.deviceId",
  /** Set once the first-launch intro has been seen. */
  onboarded: "fo.onboarded",
  /** "1" when the traveller tapped "Not now" on the intro's location step. */
  locationOptOut: "fo.locationOptOut",
} as const;

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) return memory.get(key) ?? null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    memory.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    memory.delete(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* already gone */
  }
}
