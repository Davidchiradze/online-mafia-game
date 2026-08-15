"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useViewer } from "@/features/auth/hooks/useViewer";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";

type ViewerGateProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Holds back a subtree until the viewer state settles (past `loading` and
 * `syncing` — see `useViewer`) — no more, no less. Guests pass through, so
 * `children` must be guest-safe: every query below that hits
 * `getAuthenticatedUser` / `getAuthenticatedProfile` must be `"skip"`ped
 * unless `viewer.isMember`.
 *
 * Use `SignedInGuard` instead when guests must not see the subtree at all.
 */
export function ViewerGate({ children, fallback }: ViewerGateProps) {
  const viewer = useViewer();
  const tc = useTranslations("common");

  if (viewer.isLoading) {
    return (
      fallback ?? (
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner message={tc("loading")} />
        </div>
      )
    );
  }
  return <>{children}</>;
}
