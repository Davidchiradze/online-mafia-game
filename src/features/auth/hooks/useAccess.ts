"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  getPermissionsForRole,
  normalizeRole,
  roleHasPermission,
  type AccessRole,
  type Permission,
} from "@convex/lib/access";

/**
 * Current user's access role + permissions, derived from the (reactive) Convex
 * profile. Use for UI gating only — the authoritative check always happens
 * server-side via `requirePermission` in Convex functions.
 */
export function useAccess() {
  const profile = useQuery(api.auth.profiles.currentProfile);

  const isLoading = profile === undefined;
  const role: AccessRole = normalizeRole(profile?.role ?? null);
  const permissions = getPermissionsForRole(role);

  return {
    isLoading,
    role,
    permissions,
    /** True if the current user's role grants `permission`. */
    can: (permission: Permission) => roleHasPermission(role, permission),
  };
}
