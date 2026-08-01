"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { useCardPicking } from "@/features/game-room/hooks/game";
import { advanceUpdates } from "@/game/japanese/phaseFlow";
import PhaseButton from "@/shared/ui/PhaseButton";

type ConfirmRolesButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Host-only button that ends the picking_roles phase.
 *
 * Stays disabled until every seat in the cardPickingSession has picked
 * (`state.isComplete === true`).
 */
const ConfirmRolesButton = ({ gameSessionState }: ConfirmRolesButtonProps) => {
  const t = useTranslations("game.host");
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const { state } = useCardPicking(gameSessionState.gameId as Id<"games">);

  const isComplete = state?.isComplete ?? false;

  const handleConfirmRoles = async () => {
    if (isLoading || !isComplete) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: advanceUpdates("picking_roles"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleConfirmRoles}
      isLoading={isLoading}
      disabled={!isComplete}
      label={isComplete ? t("confirmRoles") : t("waitingForPicks")}
      variant="success"
    />
  );
};

export default ConfirmRolesButton;
