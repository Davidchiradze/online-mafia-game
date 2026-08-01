"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { useEntitlements } from "@/features/auth/hooks/useEntitlements";
import type { Feature } from "@convex/lib/entitlements";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import { toast } from "@/shared/lib/utils/toast";
import { SUBSCRIPTIONS_PATH } from "./SubscriptionGuard";

interface SubscriptionRouteGuardProps {
  children: ReactNode;
  /**
   * Grant access if the user holds ANY of these features. When omitted, access
   * requires only an active subscription (or staff).
   */
  anyOf?: Feature[];
  /** Where to send users without access. Defaults to /subscriptions. */
  redirectTo?: string;
}

/**
 * Client-side route guard that keeps users without an active subscription (or
 * staff override) out of a whole section — e.g. the game room, which must not
 * be reachable by typing the URL directly. Redirects them to /subscriptions.
 *
 * Sibling of `PermissionGuard` (access roles) but on the subscription axis.
 * UX, not security: the authoritative boundary is server-side — every game
 * entry mutation (`players.join`, `spectators.join`, `joinRequests.*`) calls
 * `requireFeature`, so no one can actually participate without a subscription.
 */
export function SubscriptionRouteGuard({
  children,
  anyOf,
  redirectTo = SUBSCRIPTIONS_PATH,
}: SubscriptionRouteGuardProps) {
  const { isLoading, isSubscribed, has } = useEntitlements();
  const router = useRouter();
  const t = useTranslations("subscriptions.gate");
  const allowed = anyOf ? anyOf.some((feature) => has(feature)) : isSubscribed;
  // Guard against firing twice (StrictMode double-invoke / re-renders before
  // the redirect unmounts this guard).
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (isLoading || allowed || redirectedRef.current) return;
    redirectedRef.current = true;
    toast.error(
      <span className="flex items-center gap-2">
        <Lock className="h-4 w-4 shrink-0 text-red-400" />
        {t("noAccessToast")}
      </span>,
    );
    router.replace(redirectTo);
  }, [isLoading, allowed, redirectTo, router, t]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner message="Checking access…" />
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
