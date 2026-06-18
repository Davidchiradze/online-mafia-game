"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { nightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import PhaseButton from "@/components/ui/PhaseButton";

type ContinueNextRoundButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to continue to the next round (back to night phase).
 * Delegates to the single `enterNight` transition.
 */
const ContinueNextRoundButton = ({
  gameSessionState: _gameSessionState,
}: ContinueNextRoundButtonProps) => {
  const t = useTranslations("game.host");
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const enterNight = useMutation(nightPhase.enterNight);

  const handleContinueNextRound = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await enterNight({ gameId: gameId as Id<"games"> });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleContinueNextRound}
      isLoading={isLoading}
      label={t("continue")}
      variant="primary"
    />
  );
};

export default ContinueNextRoundButton;
