"use client";

import React, { useState } from "react";
import { startNominatedPlayersSpeaking } from "@/lib/dayPhase/actions";
import { updateGameSession } from "@/lib/gameSession/actions";
import { startNight } from "@/lib/nightPhase/actions";
import { GameSessionState } from "@/types/game/type";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type Props = {
  gameSessionState: GameSessionState;
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

  const nominatedCount = gameSessionState.nominated_players?.length ?? 0;
  const hasNominations = nominatedCount > 0;

  // Check if foul elimination occurred this round
  const foulEliminationOccurred =
    (gameSessionState as unknown as { foul_elimination_occurred?: boolean })
      .foul_elimination_occurred ?? false;

  const handleStartSelfJustification = async () => {
    if (isLoading || !hasNominations) return;
    setIsLoading(true);
    try {
      const res = await startNominatedPlayersSpeaking(gameId);
      if (!res?.ok) {
        console.error(
          "Failed to start nominated players speaking:",
          res?.message
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipToNightPhase = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const nightRes = await startNight(gameId);
      if (!nightRes.ok) {
        console.error("Failed to start night:", nightRes.message);
        return;
      }

      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[8], // "night_phase"
        current_speaker_index: null,
        speaker_started_at: null,
        speaking_order: [],
      });
      if (!res?.ok) {
        console.error("Failed to skip to night phase:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Foul elimination occurred - show message and skip to night button
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

  // No nominations - show button to skip to night phase
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
