import { create } from "zustand";
import { deleteItem, getItem, setItem } from "@/core/auth/secureStorage";

/**
 * Personal vs company profile, same as the web's `store/corporateProfile.store.ts`.
 * Client-side choice only — the server re-checks membership on every call.
 */
const KEY = "fo.corporateProfile";

type Mode = "PERSONAL" | "CORPORATE";

interface CorporateProfileState {
  mode: Mode;
  companyId: string | null;
  setPersonal: () => void;
  setCorporate: (companyId: string) => void;
  hydrate: () => Promise<void>;
}

export const useCorporateProfileStore = create<CorporateProfileState>()((set) => ({
  mode: "PERSONAL",
  companyId: null,
  setPersonal: () => {
    set({ mode: "PERSONAL", companyId: null });
    deleteItem(KEY).catch(() => {});
  },
  setCorporate: (companyId) => {
    set({ mode: "CORPORATE", companyId });
    setItem(KEY, companyId).catch(() => {});
  },
  hydrate: async () => {
    const companyId = await getItem(KEY);
    if (companyId) set({ mode: "CORPORATE", companyId });
  },
}));
