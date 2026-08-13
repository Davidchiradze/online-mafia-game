"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useTranslations } from "next-intl";
import {
  useGameRoom,
  type GameSessionState,
} from "@/features/game-room/context/gameRoomContext";
import { useNightPanelFields } from "@/features/game-room/hooks/game/useNightPanelFields";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";

type DonRightHandPanelProps = {
  gameSessionState: GameSessionState;
};

/**
 * Japanese `don_chooses_right_hand`: the Don promotes a mafia to Right Hand.
 *
 * Its gate is not a night-session scalar like every other night phase — the
 * promotion is written to the ROLES, so readiness means "some player now holds
 * MAFIA_RIGHT_HAND". The host always sees every role, so `playerRolesMap` can
 * be read directly with no visibility concern.
 *
 * The second half of the gate matters just as much: a game with no living Don
 * has nobody to make the pick, and without that escape the phase would
 * deadlock.
 */
export default function DonRightHandPanel({
  gameSessionState,
}: DonRightHandPanelProps) {
  const t = useTranslations("game.host");
  const { ruleset, playerRolesMap } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const fields = useNightPanelFields(gameSessionState);

  const canConfirm = useMemo(() => {
    let donExists = false;
    for (const role of playerRolesMap.values()) {
      if (role === "MAFIA_RIGHT_HAND") return true;
      if (role === "DON") donExists = true;
    }
    return !donExists;
  }, [playerRolesMap]);

  const handleConfirm = async () => {
    if (isLoading || !canConfirm) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: ruleset.advanceUpdates("don_chooses_right_hand"),
      });
    } catch (error) {
      console.error("Failed to end the Don's promotion:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const descriptor: HostPanelDescriptor = {
    ...fields,
    actions: [
      {
        id: "don-right-hand",
        label: canConfirm ? t("confirm") : t("finish"),
        variant: "success",
        onClick: () => void handleConfirm(),
        disabled: !canConfirm,
        title: canConfirm ? undefined : t("donNotPromotedRightHand"),
        isLoading,
      },
    ],
  };

  return <HostPanel descriptor={descriptor} />;
}
