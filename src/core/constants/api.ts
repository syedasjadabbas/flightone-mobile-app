/**
 * Endpoint paths, cache tags and permission keys in one place.
 * Paths are relative to API_BASE_URL (`.../api/v1`) and match the Express
 * routers mounted in `flightone/server/app.js`.
 */

export const PATHS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    me: "/auth/me",
    verifyEmail: "/auth/verify-email",
    resendVerification: "/auth/resend-verification",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    twoFactorVerify: "/auth/2fa/verify",
    sessions: "/auth/sessions",
  },
  me: {
    permissions: "/me/permissions",
  },
} as const;

/**
 * Auth endpoints where a 401 means "wrong password / code", not
 * "access token expired" — never try a refresh on these.
 */
export const CREDENTIAL_PATHS: ReadonlySet<string> = new Set([
  PATHS.auth.login,
  PATHS.auth.register,
  PATHS.auth.refresh,
  PATHS.auth.twoFactorVerify,
  PATHS.auth.verifyEmail,
  PATHS.auth.resendVerification,
  PATHS.auth.forgotPassword,
  PATHS.auth.resetPassword,
]);

/** Same tag list as the web app's baseApi so invalidation means the same thing. */
export const TAGS = [
  "Me",
  "Permissions",
  "AuthSessions",
  "Conversation",
  "Fare",
  "Profile",
  "ProfileCompanions",
  "ProfileLoyalty",
  "ProfileEmergency",
  "ProfileDocuments",
  "Corporate",
  "Vault",
  "Visa",
  "Journey",
  "Rewards",
  "Groups",
  "Mice",
  "Escalations",
  "Refunds",
  "Dashboard",
  "Recommendations",
  "Concierge",
] as const;

export type Tag = (typeof TAGS)[number];

/** Permission keys (server is the authority; these only hide UI). */
export const P = {
  corporateApprovalsRead: "corporate:approvals:read",
  corporateWrite: "corporate:company:write",
  dashboardRead: "dashboard:read",
  groupsWrite: "groups:write",
  journeyRead: "journey:read",
  miceWrite: "mice:write",
  refundsRead: "refunds:read",
  refundsWrite: "refunds:write",
  rewardsRead: "rewards:read",
  visaRead: "visa:read",
  visaWrite: "visa:write",
} as const;

export type PermissionKey = (typeof P)[keyof typeof P];
