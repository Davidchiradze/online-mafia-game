"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FEATURES, hasFeature } from "@convex/lib/entitlements";
import { PERMISSIONS, roleHasPermission } from "@convex/lib/access";
import { SUBSCRIPTIONS_PATH } from "@/features/auth/components/SubscriptionGuard";
import { useViewer } from "@/features/auth/hooks/useViewer";
import type { LobbyGame } from "@/features/lobby/components/LobbyContent";

export type SignInReason = "join" | "spectate";

/**
 * Join/Spectate intent for one room card: entitlement derivation plus the
 * branch each button must make — sign in (guest), upsell (no subscription),
 * or proceed. The guest check runs BEFORE the entitlement check: a guest's
 * role/subscription are both undefined, so `hasFeature` would otherwise fail
 * the same way a lapsed subscriber does and send them to /subscriptions
 * instead of a sign-in prompt.
 */
export function useRoomCardActions(
  room: LobbyGame,
  onNavigate: (roomId: string) => void,
) {
  const router = useRouter();
  const { profile, isGuest } = useViewer();
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const [signInReason, setSignInReason] = useState<SignInReason | null>(null);

  const isPlayer =
    !!profile && room.players.some((p) => p.playerId === profile._id);

  const entInput = { role: profile?.role, subscription: profile?.subscription };
  const canPlay = hasFeature(entInput, FEATURES.PLAY_GAME);
  const canSpectate = hasFeature(entInput, FEATURES.SPECTATE_GAME);
  const canSpectateAny = roleHasPermission(
    profile?.role,
    PERMISSIONS.GAME_SPECTATE_ANY,
  );

  const handleJoin = () => {
    if (isGuest) {
      setSignInReason("join");
      return;
    }
    if (!canPlay) {
      router.push(SUBSCRIPTIONS_PATH);
      return;
    }
    if (room.gameStatus === "playing" && isPlayer) {
      onNavigate(room._id);
      return;
    }
    setShowJoinConfirm(true);
  };

  const handleSpectate = () => {
    if (isGuest) {
      setSignInReason("spectate");
      return;
    }
    if (!canSpectate) {
      router.push(SUBSCRIPTIONS_PATH);
      return;
    }
    onNavigate(room._id);
  };

  const handleJoinConfirm = () => {
    setShowJoinConfirm(false);
    onNavigate(room._id);
  };

  return {
    isPlayer,
    canPlay,
    canSpectate,
    canSpectateAny,
    isGuest,
    showJoinConfirm,
    signInReason,
    handleJoin,
    handleSpectate,
    handleJoinConfirm,
    closeJoinConfirm: () => setShowJoinConfirm(false),
    closeSignInPrompt: () => setSignInReason(null),
  };
}
