"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAccess } from "@/features/auth/hooks/useAccess";
import type { Permission } from "@convex/lib/access";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";

interface PermissionGuardProps {
  permission: Permission;
  children: ReactNode;
  /** Where to send users who lack the permission. */
  redirectTo?: string;
}

/**
 * Client-side route/section guard. Renders children only if the current user
 * holds `permission`, otherwise redirects.
 *
 * This is UX, not security: it hides the shell from non-admins. The real
 * boundary is server-side — every admin Convex query/mutation calls
 * `requirePermission`, so no privileged data loads even if the shell renders.
 */
export function PermissionGuard({
  permission,
  children,
  redirectTo = "/",
}: PermissionGuardProps) {
  const { isLoading, can } = useAccess();
  const router = useRouter();
  const allowed = can(permission);

  useEffect(() => {
    if (!isLoading && !allowed) {
      router.replace(redirectTo);
    }
  }, [isLoading, allowed, redirectTo, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner message="Checking access…" />
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
