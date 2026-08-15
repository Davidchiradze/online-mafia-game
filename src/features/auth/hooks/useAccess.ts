"use client";

import {
  getPermissionsForRole,
  normalizeRole,
  roleHasPermission,
  type AccessRole,
  type Permission,
} from "@convex/lib/access";
import { useViewer } from "@/features/auth/hooks/useViewer";

/**
 * Current user's access role + permissions, derived from the (reactive) Convex
 * profile. Use for UI gating only — the authoritative check always happens
 * server-side via `requirePermission` in Convex functions.
 *
 * `isLoading` covers the `syncing` window too (see `useViewer`), so a
 * just-authenticated admin/moderator isn't briefly normalized to `"user"`
 * with zero permissions before their profile row lands.
 */
export function useAccess() {
  const viewer = useViewer();

  const isLoading = viewer.isLoading;
  const role: AccessRole = normalizeRole(viewer.profile?.role ?? null);
  const permissions = getPermissionsForRole(role);

  return {
    isLoading,
    role,
    permissions,
    /** True if the current user's role grants `permission`. */
    can: (permission: Permission) => roleHasPermission(role, permission),
  };
}
