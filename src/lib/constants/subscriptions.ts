import subscriptionsConfig from "@/config/subscriptions.json";

/**
 * Text fields hold next-intl keys (resolved against the `subscriptions`
 * namespace in messages/{locale}.json). Non-text fields are design/config.
 */
export type SubscriptionPackage = {
  id: string;
  labelKey: string;
  labelColor: string;
  badgeKey: string;
  badgeColor: string;
  titleKey: string;
  oldPrice: string;
  price: string;
  periodKey: string;
  featureKeys: string[];
  buttonKey: string;
  disabled: boolean;
};

/**
 * The user's current subscription. Placeholder until wired to backend data —
 * `packageId` matches a `SubscriptionPackage.id`, `expiresAt` is an ISO-like
 * local datetime (`YYYY-MM-DDTHH:mm:ss`). `null` renders the inactive banner.
 */
export type ActiveSubscription = {
  packageId: string;
  expiresAt: string;
};

export type SubscriptionsConfig = {
  banner: {
    labelKey: string;
    inactiveTitleKey: string;
    inactiveSubtitleKey: string;
  };
  purchasePath: string;
  playPath: string;
  activeSubscription: ActiveSubscription | null;
  packages: SubscriptionPackage[];
};

export const SUBSCRIPTIONS_CONFIG = subscriptionsConfig as SubscriptionsConfig;
