"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";
import { useNightPhaseReadiness } from "@/hooks/game/useNightPhaseReadiness";

type EndYakuzaTargetButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to end yakuza and shogun target selection
 */
const EndYakuzaTargetButton = ({
  gameSessionState,
}: EndYakuzaTargetButtonProps) => {
  const t = useTranslations("game.host");
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const { canEndYakuzaPhase } = useNightPhaseReadiness();

  const handleEndYakuzaTarget = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[13], // "detective_checks_for_mafia"
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleEndYakuzaTarget}
      isLoading={isLoading}
      disabled={!canEndYakuzaPhase}
      label={canEndYakuzaPhase ? t("endYakuzaPhase") : t("waitingForYakuza")}
      variant="danger"
    />
  );
};

export default EndYakuzaTargetButton;
