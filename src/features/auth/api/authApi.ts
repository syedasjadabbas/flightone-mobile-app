import { baseApi } from "@/core/api/baseApi";
import { PATHS } from "@/core/constants/api";
import { useAuthStore, type AuthSession, type AuthUser } from "@/core/auth/auth.store";
import { useCorporateProfileStore } from "@/features/corporate/store/corporateProfile.store";

/** Auth endpoints. Paths and shapes match `server/modules/auth/auth.routes.js`. */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Login2faChallenge {
  requires2fa: true;
  requires2faSetup?: boolean;
  tempToken: string;
  methods?: string[];
  message: string;
}

export type LoginResponse = (AuthSession & { requires2fa?: false }) | Login2faChallenge;

export function isTwoFactorChallenge(r: LoginResponse): r is Login2faChallenge {
  return "requires2fa" in r && r.requires2fa === true;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface RegisterResponse {
  accepted: boolean;
  requiresVerification: boolean;
  email: string;
  userId?: string;
}

export interface ForgotPasswordResponse {
  accepted: boolean;
  emailDelivery: "QUEUED" | "UNCONFIGURED";
  message: string;
}

export interface ResetPasswordRequest {
  email?: string;
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  ok: boolean;
  message: string;
  sessionsRevoked: boolean;
}

async function storeSessionOnSuccess(queryFulfilled: Promise<{ data: unknown }>) {
  const result = await queryFulfilled.catch(() => null);
  const data = result?.data as Partial<AuthSession> | undefined;
  if (data?.accessToken && data.user) {
    await useAuthStore.getState().setSession(data as AuthSession);
  }
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: PATHS.auth.login, method: "POST", body }),
      invalidatesTags: ["Me", "Permissions", "AuthSessions"],
      onQueryStarted: (_arg, { queryFulfilled }) => storeSessionOnSuccess(queryFulfilled),
    }),

    twoFactorVerify: builder.mutation<AuthSession, { code: string; tempToken: string; type?: "totp" | "backup_code" }>({
      query: (body) => ({ url: PATHS.auth.twoFactorVerify, method: "POST", body }),
      invalidatesTags: ["Me", "Permissions", "AuthSessions"],
      onQueryStarted: (_arg, { queryFulfilled }) => storeSessionOnSuccess(queryFulfilled),
    }),

    /** Start 2-step setup: secret + otpauth link + backup codes. `tempToken` when login requires setup. */
    twoFactorSetup: builder.mutation<
      { secret: string; otpauthUrl?: string; otpauthUri?: string; backupCodes: string[]; message: string },
      { tempToken?: string } | void
    >({
      query: (body) => ({ url: "/auth/2fa/setup", method: "POST", body: body ?? {} }),
    }),
    twoFactorConfirm: builder.mutation<
      { ok?: boolean; message?: string } & Partial<AuthSession>,
      { code: string; tempToken?: string }
    >({
      query: (body) => ({ url: "/auth/2fa/confirm", method: "POST", body }),
      invalidatesTags: ["Me", "AuthSessions"],
      async onQueryStarted(_arg, { queryFulfilled }) {
        const result = await queryFulfilled.catch(() => null);
        const data = result?.data;
        if (data?.accessToken && data.user) await useAuthStore.getState().setSession(data as AuthSession);
        else if (data?.ok) useAuthStore.getState().updateUser({ twoFactorEnabled: true });
      },
    }),
    twoFactorDisable: builder.mutation<{ ok: boolean; message: string }, { password?: string; code?: string }>({
      query: (body) => ({ url: "/auth/2fa/disable", method: "POST", body }),
      invalidatesTags: ["Me", "AuthSessions"],
      async onQueryStarted(_arg, { queryFulfilled }) {
        const result = await queryFulfilled.catch(() => null);
        if (result?.data?.ok) useAuthStore.getState().updateUser({ twoFactorEnabled: false });
      },
    }),

    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (body) => ({ url: PATHS.auth.register, method: "POST", body }),
    }),

    verifyEmail: builder.mutation<AuthSession, { email: string; code: string }>({
      query: (body) => ({ url: PATHS.auth.verifyEmail, method: "POST", body }),
      invalidatesTags: ["Me", "Permissions", "AuthSessions"],
      onQueryStarted: (_arg, { queryFulfilled }) => storeSessionOnSuccess(queryFulfilled),
    }),

    resendVerification: builder.mutation<{ accepted: boolean; message: string }, { email: string }>({
      query: (body) => ({ url: PATHS.auth.resendVerification, method: "POST", body }),
    }),

    forgotPassword: builder.mutation<ForgotPasswordResponse, { email: string }>({
      query: (body) => ({ url: PATHS.auth.forgotPassword, method: "POST", body }),
    }),

    resetPassword: builder.mutation<ResetPasswordResponse, ResetPasswordRequest>({
      query: (body) => ({ url: PATHS.auth.resetPassword, method: "POST", body }),
    }),

    logout: builder.mutation<void, void>({
      queryFn: async (_arg, api, _extra, baseQuery) => {
        const { refreshToken } = useAuthStore.getState();
        // Sign out locally first so the UI never waits on the network.
        await useAuthStore.getState().clearSession();
        useCorporateProfileStore.getState().setPersonal();
        api.dispatch(baseApi.util.resetApiState());
        await baseQuery({
          url: PATHS.auth.logout,
          method: "POST",
          body: refreshToken ? { refreshToken } : {},
        });
        return { data: undefined };
      },
    }),

    me: builder.query<AuthUser, void>({
      query: () => PATHS.auth.me,
      providesTags: ["Me"],
    }),
  }),
});

export const {
  useLoginMutation,
  useTwoFactorVerifyMutation,
  useTwoFactorSetupMutation,
  useTwoFactorConfirmMutation,
  useTwoFactorDisableMutation,
  useRegisterMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useLogoutMutation,
  useMeQuery,
} = authApi;
