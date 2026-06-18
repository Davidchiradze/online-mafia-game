"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type StartMafiaTargetButtonProps = {
  gameSessionState: NonNullable<
    ReturnType<typeof useGameRoom>["gameSessionState"]
  >;
};

/**
 * Button to start mafia target selection.
 * The night is already started (via the `enterNight` transition) before this
 * point, so this only advances the sub-phase to mafia_chooses_target.
 */
const StartMafiaTargetButton = ({
  gameSessionState,
}: StartMafiaTargetButtonProps) => {
  const t = useTranslations("game.host");
  const { gameId: _gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);

  const handleStartMafiaTarget = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[9], // "mafia_chooses_target"
        },
      });
    } catch (error) {
      console.error("Failed to start mafia target:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleStartMafiaTarget}
      isLoading={isLoading}
      label={t("startMafiaPhase")}
      variant="danger"
    />
  );
};

export default StartMafiaTargetButton;
