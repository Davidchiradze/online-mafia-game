"use client";

import React, { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { cardPicking } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import PhaseButton from "@/components/ui/PhaseButton";

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
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialDisabled, setIsInitialDisabled] = useState(true);
  const startCardPicking = useMutation(cardPicking.start);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialDisabled(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

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
      disabled={isInitialDisabled}
      label="Pick Roles"
      variant="primary"
    />
  );
};

export default StartPickingRolesButton;
