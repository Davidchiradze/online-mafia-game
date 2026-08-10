"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  getActiveTier,
  getFeatures,
  hasFeature,
  isSubscriptionActive,
  type Feature,
  type SubscriptionTier,
} from "@convex/lib/entitlements";

/**
 * Current user's subscription tier + unlocked features, derived from the
 * (reactive) Convex profile. Use for UI gating only — the authoritative check
 * always happens server-side via `requireFeature` in Convex functions.
 *
 * Sibling of `useAccess()` (access roles); this is the subscription axis.
 */
export function useEntitlements() {
  const profile = useQuery(api.auth.profiles.currentProfile);

  const isLoading = profile === undefined;
  const input = {
    role: profile?.role ?? null,
    subscription: profile?.subscription ?? null,
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
