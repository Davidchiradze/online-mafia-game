import subscriptionsConfig from "@/config/subscriptions.json";

/**
 * Text fields hold next-intl keys (resolved against the `subscriptions`
 * namespace in messages/{locale}.json). Non-text fields are design/config.
 */
export type SubscriptionPackage = {
  id: string;
  labelKey?: string;
  labelColor: string;
  badgeKey?: string;
  badgeColor?: string;
  titleKey: string;
  oldPrice?: string;
  price: string;
  periodKey: string;
  featureKeys: string[];
  buttonKey: string;
};

/**
 * The user's current subscription, derived from `profile.subscription` (the
 * PHP-synced snapshot) — NOT static config. `packageId` matches a
 * `SubscriptionPackage.id`; `expiresAt` is the raw `subscription.to` datetime.
 * `null` renders the inactive banner.
 */
export type ActiveSubscription = {
  packageId: string;
  expiresAt?: string;
};

export type SubscriptionsConfig = {
  banner: {
    labelKey: string;
    inactiveTitleKey: string;
    inactiveSubtitleKey: string;
  };
  purchasePath: string;
  playPath: string;
  packages: SubscriptionPackage[];
};

export const SUBSCRIPTIONS_CONFIG = subscriptionsConfig as SubscriptionsConfig;

/**
 * Maps a PHP numeric `subscription.packageId` (1/2/3) to the matching config
 * `SubscriptionPackage.id`. Single place these two id schemes are bridged.
 */
const PACKAGE_ID_BY_TIER: Record<number, string> = {
  4: "daily",
  1: "basic",
  2: "standard",
  3: "premium",
};

export function packageConfigIdForTier(
  packageId: number | null | undefined,
): string | undefined {
  return packageId ? PACKAGE_ID_BY_TIER[packageId] : undefined;
}
