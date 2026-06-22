"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useEntitlements } from "@/hooks/auth/useEntitlements";
import { FEATURES, type Feature } from "@convex/lib/entitlements";

/** Where locked controls send the user to subscribe. */
export const SUBSCRIPTIONS_PATH = "/subscriptions";

interface SubscriptionGuardProps {
  feature: Feature;
  children: ReactNode;
  /** Rendered when the user lacks `feature`. Defaults to an upsell prompt. */
  fallback?: ReactNode;
  /**
   * While the profile is still loading, render children optimistically
   * (default). The server still enforces `requireFeature`, so a momentary
   * optimistic render is safe. Set false to render nothing while loading.
   */
  showWhileLoading?: boolean;
}

/**
 * Client-side gate that renders `children` only if the current user's
 * subscription tier (or staff override) unlocks `feature`, otherwise renders
 * `fallback`.
 *
 * UX only — the authoritative boundary is server-side: every gated Convex
 * function calls `requireFeature`. Sibling of `PermissionGuard` (access roles),
 * but inline rather than redirecting, since gated actions are controls.
 */
export function SubscriptionGuard({
  feature,
  children,
  fallback,
  showWhileLoading = true,
}: SubscriptionGuardProps) {
  const { isLoading, has } = useEntitlements();

  if (isLoading) return showWhileLoading ? <>{children}</> : null;
  if (has(feature)) return <>{children}</>;
  return <>{fallback ?? <SubscriptionUpsell />}</>;
}

/** Default upsell shown in place of a gated control: a link to /subscriptions. */
export function SubscriptionUpsell({ className }: { className?: string }) {
  const t = useTranslations("subscriptions.gate");
  return (
    <Link
      href={SUBSCRIPTIONS_PATH}
      className={
        className ??
        "inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-5 py-2.5 font-sans text-sm font-semibold text-amber-300 transition-all hover:border-amber-500/50 hover:bg-amber-500/[0.14]"
      }
    >
      <Lock className="h-4 w-4" />
      {t("subscribeToPlay")}
    </Link>
  );
}
