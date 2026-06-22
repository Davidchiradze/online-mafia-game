import { v } from "convex/values";
import { normalizeRole } from "./access";

/* ============================================================================
 * SUBSCRIPTION ENTITLEMENTS — SINGLE SOURCE OF TRUTH
 *
 * Subscription tiers, the features each tier unlocks, the tier→feature mapping,
 * and the pure resolvers all live here. See docs/authorization.md for the
 * sibling RBAC system this deliberately mirrors.
 *
 * Why this file is in `convex/` (same reasoning as convex/lib/access.ts):
 *   - The Convex server is the AUTHORITATIVE gate and must run this logic
 *     (`requireFeature` in convex/lib/auth.ts).
 *   - Convex can only import from `convex/` + node_modules, never from `src/`.
 *   - The Next.js web layer (hooks, UI) CAN import this via the
 *     `@convex/lib/entitlements` alias — so both sides share ONE definition.
 *
 * Two orthogonal axes:
 *   - ACCESS ROLE (convex/lib/access.ts) — staff capabilities (user/mod/admin).
 *   - SUBSCRIPTION TIER (here)           — paid entitlements.
 * A profile has both. The single bridge between them is the staff override
 * below: moderators/admins always get the highest tier's features.
 * ========================================================================== */

/* ----------------------------------------------------------------------------
 * Tiers — these are the PHP `subscription.packageId` values.
 * -------------------------------------------------------------------------- */

export const SUBSCRIPTION_TIERS = [1, 2, 3] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

/** Highest tier — staff are treated as holding this (see `getFeatures`). */
export const HIGHEST_TIER: SubscriptionTier =
  SUBSCRIPTION_TIERS[SUBSCRIPTION_TIERS.length - 1];

/** Coerce a stored/unknown packageId into a valid tier, or `null` if none. */
export function normalizeTier(
  packageId: number | null | undefined,
): SubscriptionTier | null {
  return (SUBSCRIPTION_TIERS as readonly number[]).includes(packageId ?? 0)
    ? (packageId as SubscriptionTier)
    : null;
}

/* ----------------------------------------------------------------------------
 * Features (capabilities a subscription unlocks)
 *
 * Check FEATURES, not a raw packageId, at call sites — so changing what a tier
 * unlocks is a one-line edit to TIER_FEATURES below and nothing else moves.
 * -------------------------------------------------------------------------- */

export const FEATURES = {
  /** Create or join a game as a player. */
  PLAY_GAME: "game.play",
  /** Watch a game as a spectator. */
  SPECTATE_GAME: "game.spectate",
  /** Read and post in the global community chat. */
  COMMUNITY_CHAT: "community.chat",
} as const;

export type Feature = (typeof FEATURES)[keyof typeof FEATURES];

const ALL_FEATURES = Object.values(FEATURES) as Feature[];

/* ----------------------------------------------------------------------------
 * Tier → features
 *
 * Today all three tiers unlock the same set. Future divergence is a one-line
 * change here — no call site changes.
 * -------------------------------------------------------------------------- */

export const TIER_FEATURES: Record<SubscriptionTier, readonly Feature[]> = {
  1: ALL_FEATURES,
  2: ALL_FEATURES,
  3: ALL_FEATURES,
};

export function getFeaturesForTier(
  tier: SubscriptionTier | null,
): readonly Feature[] {
  return tier ? TIER_FEATURES[tier] : [];
}

/* ----------------------------------------------------------------------------
 * Resolvers
 *
 * All take a minimal shape so they work with a full `Doc<"profiles">` (server)
 * or the client `currentProfile` query result. Validity trusts PHP's synced
 * `subscription.active` flag as-is (no re-computing from the `to` date).
 * -------------------------------------------------------------------------- */

export interface EntitlementInput {
  role: string | null | undefined;
  subscription?: { packageId: number; active: boolean } | null;
}

/** Roles that get the highest tier's features regardless of subscription. */
function isStaffRole(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return r === "moderator" || r === "admin";
}

/** The effective tier for a profile (staff ⇒ highest), or `null` if none. */
export function getActiveTier(input: EntitlementInput): SubscriptionTier | null {
  if (isStaffRole(input.role)) return HIGHEST_TIER;
  if (input.subscription?.active) return normalizeTier(input.subscription.packageId);
  return null;
}

/** The features a profile currently holds. */
export function getFeatures(input: EntitlementInput): readonly Feature[] {
  // Staff override: full access at the highest tier, no subscription needed.
  if (isStaffRole(input.role)) return getFeaturesForTier(HIGHEST_TIER);
  if (input.subscription?.active)
    return getFeaturesForTier(normalizeTier(input.subscription.packageId));
  return [];
}

export function hasFeature(input: EntitlementInput, feature: Feature): boolean {
  return getFeatures(input).includes(feature);
}

/** True if the profile has any active access (staff or active subscription). */
export function isSubscriptionActive(input: EntitlementInput): boolean {
  return isStaffRole(input.role) || input.subscription?.active === true;
}

/** Validator for a feature key (for mutation args, if ever needed). */
export const featureValidator = v.union(
  v.literal(FEATURES.PLAY_GAME),
  v.literal(FEATURES.SPECTATE_GAME),
  v.literal(FEATURES.COMMUNITY_CHAT),
);
