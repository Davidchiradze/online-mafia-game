"use client";

import {
  getActiveTier,
  getFeatures,
  hasFeature,
  isSubscriptionActive,
  type Feature,
  type SubscriptionTier,
} from "@convex/lib/entitlements";
import { useViewer } from "@/features/auth/hooks/useViewer";

/**
 * Current user's subscription tier + unlocked features, derived from the
 * (reactive) Convex profile. Use for UI gating only — the authoritative check
 * always happens server-side via `requireFeature` in Convex functions.
 *
 * Sibling of `useAccess()` (access roles); this is the subscription axis.
 * `isLoading` covers the `syncing` window too (see `useViewer`), so a
 * just-authenticated subscriber isn't briefly treated as unsubscribed before
 * their profile row lands.
 */
export function useEntitlements() {
  const viewer = useViewer();

  const isLoading = viewer.isLoading;
  const input = {
    role: viewer.profile?.role ?? null,
    subscription: viewer.profile?.subscription ?? null,
  };

  return {
    isLoading,
    /** Effective tier (staff ⇒ highest), or null if no active access. */
    tier: getActiveTier(input) as SubscriptionTier | null,
    /** True if staff or holds an active subscription. */
    isSubscribed: isSubscriptionActive(input),
    features: getFeatures(input),
    /** True if the current user's tier unlocks `feature`. */
    has: (feature: Feature) => hasFeature(input, feature),
  };
}
