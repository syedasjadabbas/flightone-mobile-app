import { create } from "zustand";
import { KEYS, getItem, setItem } from "@/core/auth/secureStorage";

/**
 * Has this device seen the first-launch intro? `null` until read from secure
 * storage (the splash covers that moment).
 */
type OnboardingState = {
  seen: boolean | null;
  load: () => Promise<void>;
  markSeen: () => Promise<void>;
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  seen: null,
  load: async () => {
    if (get().seen !== null) return;
    set({ seen: (await getItem(KEYS.onboarded)) === "1" });
  },
  markSeen: async () => {
    set({ seen: true });
    await setItem(KEYS.onboarded, "1").catch(() => {});
  },
}));
