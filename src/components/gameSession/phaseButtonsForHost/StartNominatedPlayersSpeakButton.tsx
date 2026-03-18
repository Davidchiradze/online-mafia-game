"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions, dayPhase, nightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type Props = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
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
  const updateSession = useMutation(gameSessions.update);
  const startNominatedSpeaking = useMutation(dayPhase.startNominatedPlayersSpeaking);
  const startNight = useMutation(nightPhase.startNight);

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
      await startNight({ gameId: gameId as Id<"games"> });

      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[8], // "night_phase"
          currentSpeakerIndex: null,
          speakerStartedAt: null,
          speakingOrder: [],
        },
      });
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

  return (
    <PhaseButton
      onClick={handleStartSelfJustification}
      isLoading={isLoading}
      label="Start"
    />
  );
};

export default StartNominatedPlayersSpeakButton;
