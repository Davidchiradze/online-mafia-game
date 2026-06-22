import { FEATURES } from "@convex/lib/entitlements";
import { SubscriptionRouteGuard } from "@/components/auth/SubscriptionRouteGuard";
import { CommunityChat } from "@/components/dashboard/community-chat/CommunityChat";

export default function CommunityChatPage() {
  return (
    <SubscriptionRouteGuard anyOf={[FEATURES.COMMUNITY_CHAT]}>
      <CommunityChat />
    </SubscriptionRouteGuard>
  );
}
