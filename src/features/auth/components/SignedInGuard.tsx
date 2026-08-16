"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useViewer } from "@/features/auth/hooks/useViewer";
import AuthErrorScreen from "@/features/auth/components/AuthErrorScreen";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";

type SignedInGuardProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Members only. Waits out `loading` and `syncing` (see `useViewer`) so
 * nothing below can throw `PROFILE_SYNC_REQUIRED`, then renders `children`
 * for a member and `fallback` for a guest. The guest branch is terminal — it
 * never shows a spinner, which is the bug this component exists to make
 * unrepeatable.
 */
export function SignedInGuard({ children, fallback }: SignedInGuardProps) {
  const viewer = useViewer();
  const tc = useTranslations("common");

  if (viewer.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner message={tc("loading")} />
      </div>
    );
  }
  if (viewer.isGuest) return <>{fallback ?? <AuthErrorScreen />}</>;
  return <>{children}</>;
}
