import { SignedInGuard } from "@/features/auth/components/SignedInGuard";
import { SubscriptionRouteGuard } from "@/features/auth/components/SubscriptionRouteGuard";
import { FEATURES } from "@convex/lib/entitlements";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative h-screen overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #0a0a12 0%, #0f0f1a 50%, #0a0a12 100%)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://www.mafia.ge/templates/newassets/img/mafiabg.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none select-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80 pointer-events-none" />
      <div className="relative z-10 h-full">
        <SignedInGuard>
          <SubscriptionRouteGuard
            anyOf={[FEATURES.PLAY_GAME, FEATURES.SPECTATE_GAME]}
          >
            {children}
          </SubscriptionRouteGuard>
        </SignedInGuard>
      </div>
    </div>
  );
}
