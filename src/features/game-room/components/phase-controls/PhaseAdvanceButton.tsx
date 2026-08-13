"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { gameSessions } from "@convex/refs/game";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import PhaseButton from "@/features/game-room/components/ui/PhaseButton";

type PhaseAdvanceButtonProps = {
  gameSessionState: NonNullable<
    ReturnType<typeof useGameRoom>["gameSessionState"]
  >;
  /** The phase the host is advancing FROM (resolved via the ruleset graph). */
  sourcePhase: string;
  /** Translation key under `game.host` for the button label. */
  labelKey: string;
  variant?: "primary" | "danger" | "success";
};

/**
 * Generic host-advance button: applies `ruleset.advanceUpdates(sourcePhase)` to
 * the session, so the destination comes from the RESOLVED variant's graph
 * rather than a hardcoded literal.
 *
 * Only `best_move` still uses this. Every night phase moved to
 * `NightPhasePanel`, which does the same advance inside the host panel; this
 * goes away when best move follows.
 */
const PhaseAdvanceButton = ({
  gameSessionState,
  sourcePhase,
  labelKey,
  variant = "danger",
}: PhaseAdvanceButtonProps) => {
  const t = useTranslations("game.host");
  const { ruleset } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);

  const handleAdvance = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: ruleset.advanceUpdates(sourcePhase),
      });
    } catch (error) {
      console.error(`Failed to advance from "${sourcePhase}":`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleAdvance}
      isLoading={isLoading}
      label={t(labelKey)}
      variant={variant}
    />
  );
};

export default PhaseAdvanceButton;
