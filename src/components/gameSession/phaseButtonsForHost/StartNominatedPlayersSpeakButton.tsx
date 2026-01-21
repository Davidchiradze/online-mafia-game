"use client";

import React, { useState } from "react";
import { startNominatedPlayersSpeaking } from "@/lib/dayPhase/actions";
import { updateGameSession } from "@/lib/gameSession/actions";
import { startNight } from "@/lib/nightPhase/actions";
import { GameSessionState } from "@/types/game/type";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";

type Props = {
  gameSessionState: GameSessionState;
};

/**
 * Button to start the nominated players speaking phase.
 * If there are nominated players: starts self-justification phase.
 * If no players nominated: skips directly to night phase (starts new night).
 */
const StartNominatedPlayersSpeakButton = ({ gameSessionState }: Props) => {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const nominatedCount = gameSessionState.nominated_players?.length ?? 0;
  const hasNominations = nominatedCount > 0;

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
      // Start a new night (increments night number, creates night_phase_sessions row)
      const nightRes = await startNight(gameId);
      if (!nightRes.ok) {
        console.error("Failed to start night:", nightRes.message);
        return;
      }

      // No nominations - skip directly to night phase (startNight already set current_night_number)
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[8], // "night_phase"
        // Reset speaking state
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

  // No nominations - show button to skip to night phase
  if (!hasNominations) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="text-sm text-gray-400 text-center">
          No players nominated
        </div>
        <button
          type="button"
          className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
          disabled={isLoading}
          onClick={handleSkipToNightPhase}
        >
          {isLoading ? "Starting..." : "Skip to Night Phase →"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="rounded-md bg-orange-600 hover:bg-orange-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleStartSelfJustification}
    >
      {isLoading
        ? "Starting..."
        : `Start Self-Justification (${nominatedCount} player${
            nominatedCount > 1 ? "s" : ""
          })`}
    </button>
  );
};

export default StartNominatedPlayersSpeakButton;
