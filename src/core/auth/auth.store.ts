import { create } from "zustand";
import { KEYS, deleteItem, getItem, setItem } from "./secureStorage";

/**
 * Session state, same shape as the web app's `store/auth.store.ts`.
 *
 * - Access token: memory only.
 * - Refresh token + session id + user: SecureStore, so the app can restore
 *   the session on next launch through `/auth/refresh`.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role?: string | null;
  twoFactorEnabled?: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string | null;
  sessionId?: string | null;
  user: AuthUser;
}

export type AuthStatus = "booting" | "signedIn" | "signedOut";

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  user: AuthUser | null;
  /** Why the user was signed out, shown on the login screen (server's message). */
  signOutReason: string | null;
  setSession: (session: AuthSession) => Promise<void>;
  clearSession: (reason?: string | null) => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => void;
  /** Load refresh token + user from SecureStore at app start. */
  hydrate: () => Promise<void>;
  setStatus: (status: AuthStatus) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: "booting",
  accessToken: null,
  refreshToken: null,
  sessionId: null,
  user: null,
  signOutReason: null,

  setSession: async ({ accessToken, refreshToken, sessionId, user }) => {
    // Refresh rotates: keep the old one only if the server didn't send a new one.
    const nextRefresh = refreshToken ?? get().refreshToken;
    set({
      status: "signedIn",
      accessToken,
      refreshToken: nextRefresh,
      sessionId: sessionId ?? null,
      user,
      signOutReason: null,
    });
    if (nextRefresh) await setItem(KEYS.refreshToken, nextRefresh);
    if (sessionId) await setItem(KEYS.sessionId, sessionId);
    await setItem(KEYS.user, JSON.stringify(user));
  },

  clearSession: async (reason = null) => {
    set({
      status: "signedOut",
      accessToken: null,
      refreshToken: null,
      sessionId: null,
      user: null,
      signOutReason: reason,
    });
    await Promise.all([
      deleteItem(KEYS.refreshToken),
      deleteItem(KEYS.sessionId),
      deleteItem(KEYS.user),
    ]);
  },

  updateUser: (patch) =>
    set((state) => ({ user: state.user ? { ...state.user, ...patch } : null })),

  hydrate: async () => {
    const [refreshToken, sessionId, userRaw] = await Promise.all([
      getItem(KEYS.refreshToken),
      getItem(KEYS.sessionId),
      getItem(KEYS.user),
    ]);
    let user: AuthUser | null = null;
    try {
      user = userRaw ? (JSON.parse(userRaw) as AuthUser) : null;
    } catch {
      user = null;
    }
    set({ refreshToken, sessionId, user });
  },

  setStatus: (status) => set({ status }),
}));
