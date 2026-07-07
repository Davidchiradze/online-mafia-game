"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";
import { useNightPhaseReadiness } from "@/hooks/game/useNightPhaseReadiness";

type EndMafiaTargetButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to end mafia target selection
 */
const EndMafiaTargetButton = ({
  gameSessionState,
}: EndMafiaTargetButtonProps) => {
  const t = useTranslations("game.host");
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const { canEndMafiaPhase } = useNightPhaseReadiness();

  const handleEndMafiaTarget = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[10], // "don_checks_for_detective"
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleEndMafiaTarget}
      isLoading={isLoading}
      disabled={!canEndMafiaPhase}
      label={canEndMafiaPhase ? t("endMafiaPhase") : t("waitingForMafia")}
      variant="danger"
    />
  );
};

export default EndMafiaTargetButton;
