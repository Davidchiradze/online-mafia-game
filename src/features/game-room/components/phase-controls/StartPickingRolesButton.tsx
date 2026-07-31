"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { cardPicking } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import PhaseButton from "@/shared/ui/PhaseButton";

type StartPickingRolesButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Host-side button that enters the card-picking phase.
 *
 * Calls `cardPicking.start`, which atomically:
 *   - shuffles a 12-card deck (hidden roles per card),
 *   - inserts the cardPickingSession,
 *   - flips gameSessions.gamePhase to "picking_roles".
 *
 * Idempotent on the server: clicking twice returns the existing session id.
 */
const StartPickingRolesButton = ({
  gameSessionState,
}: StartPickingRolesButtonProps) => {
  const t = useTranslations("game.host");
  const [isLoading, setIsLoading] = useState(false);
  const startCardPicking = useMutation(cardPicking.start);

  const handleStartPickingRoles = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await startCardPicking({
        gameId: gameSessionState.gameId as Id<"games">,
      });
    } catch (error) {
      console.error("Failed to start card picking:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleStartPickingRoles}
      isLoading={isLoading}
      disableOnMountMs={3000}
      label={t("pickRoles")}
      variant="primary"
    />
  );
};

export default StartPickingRolesButton;
