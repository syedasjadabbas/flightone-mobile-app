import type { ReactNode } from "react";
import { useAuthStore } from "@/core/auth/auth.store";
import type { PermissionKey } from "@/core/constants/api";
import { hasAnyPermission, hasPermissionKey } from "./check";
import { useMyPermissionsQuery } from "./permissionsApi";

/** `has("refunds:write")` — hides UI only; never treat it as security. */
export function usePermissions() {
  const signedIn = useAuthStore((s) => s.status === "signedIn");
  const { data, isLoading } = useMyPermissionsQuery(undefined, { skip: !signedIn });
  return {
    isLoading,
    has: (key: PermissionKey, companyId?: string | null) => hasPermissionKey(data, key, companyId),
    hasAny: (keys: PermissionKey[], companyId?: string | null) => hasAnyPermission(data, keys, companyId),
  };
}

export function PermissionGate({
  anyOf,
  fallback = null,
  children,
}: {
  anyOf: PermissionKey[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { hasAny, isLoading } = usePermissions();
  if (isLoading) return null;
  return <>{hasAny(anyOf) ? children : fallback}</>;
}
