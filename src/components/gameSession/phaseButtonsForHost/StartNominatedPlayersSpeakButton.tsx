"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { dayPhase, nightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import PhaseButton from "@/components/ui/PhaseButton";

type Props = {
  gameSessionState: NonNullable<
    ReturnType<typeof useGameRoom>["gameSessionState"]
  >;
};

/**
 * Button to start the nominated players speaking phase.
 * If there are nominated players: starts self-justification phase.
 * If no players nominated: skips directly to night phase (starts new night).
 * If foul elimination occurred: shows message and skip to night phase.
 */
const StartNominatedPlayersSpeakButton = ({ gameSessionState }: Props) => {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const startNominatedSpeaking = useMutation(
    dayPhase.startNominatedPlayersSpeaking,
  );
  const enterNight = useMutation(nightPhase.enterNight);

  const nominatedCount = gameSessionState.nominatedPlayers?.length ?? 0;
  const hasNominations = nominatedCount > 0;

  const foulEliminationOccurred =
    gameSessionState.foulEliminationOccurred ?? false;

  const handleStartSelfJustification = async () => {
    if (isLoading || !hasNominations) return;
    setIsLoading(true);
    try {
      await startNominatedSpeaking({ gameId: gameId as Id<"games"> });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipToNightPhase = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await enterNight({ gameId: gameId as Id<"games"> });
    } finally {
      setIsLoading(false);
    }
  };

  if (foulEliminationOccurred) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
          <p className="text-amber-300 text-sm font-medium">
            Player eliminated by fouls
          </p>
          <p className="text-amber-400/70 text-xs mt-1">
            No voting will occur this round
          </p>
        </div>
        <PhaseButton
          onClick={handleSkipToNightPhase}
          isLoading={isLoading}
          label="Start"
        />
      </div>
    );
  }

  if (!hasNominations) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="text-sm text-white/50 text-center">
          No players nominated
        </div>
        <PhaseButton
          onClick={handleSkipToNightPhase}
          isLoading={isLoading}
          label="Start"
        />
      </div>
    );
  }

  // A single nominee skips self-justification and goes straight to voting.
  const isSingleNominee = nominatedCount === 1;

  return (
    <PhaseButton
      onClick={handleStartSelfJustification}
      isLoading={isLoading}
      label={isSingleNominee ? "Start voting" : "Start self-justification"}
      variant="warning"
    />
  );
};

export default StartNominatedPlayersSpeakButton;
