/**
 * Permission helpers — UX only, the server is the authority.
 * Same `{ global, byCompany }` shape as GET /me/permissions and the web app's
 * `lib/permissions/check.ts`.
 */
export type EffectivePermissions = {
  global: string[];
  byCompany: Record<string, string[]>;
};

export function hasPermissionKey(
  perms: EffectivePermissions | null | undefined,
  key: string,
  companyId?: string | null,
): boolean {
  if (!perms || !key) return false;
  if (perms.global?.includes(key)) return true;
  if (companyId) return Boolean(perms.byCompany?.[companyId]?.includes(key));
  return Object.values(perms.byCompany || {}).some((keys) => keys?.includes(key));
}

export function hasAnyPermission(
  perms: EffectivePermissions | null | undefined,
  keys: string[],
  companyId?: string | null,
): boolean {
  return keys.some((k) => hasPermissionKey(perms, k, companyId));
}
