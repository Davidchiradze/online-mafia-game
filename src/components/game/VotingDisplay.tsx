"use client";

import React, { useMemo } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { useVotingButton } from "@/hooks/game/useVotingButton";

/**
 * Compact voting display for players (mobile-friendly).
 * Shows current candidate and vote button.
 * Dead players see nothing.
 */
export default function VotingDisplay() {
  const { votingSession, gameSessionState, players, userId, gameId } =
    useGameRoom();

  // Get current player info
  const currentPlayer = useMemo(() => {
    return players.find((p) => p.player_id === userId);
  }, [players, userId]);

  const playerSeatNumber = currentPlayer?.seat_number ?? null;
  const isPlayerDead = currentPlayer?.is_alive === false;

  const {
    isEnabled,
    hasVoted,
    isSubmitting,
    timeLeft,
    isVotingActive,
    isBothLeaveMode,
    submitVote,
  } = useVotingButton({
    votingSession,
    playerSeatNumber,
    gameId,
  });

  // Don't render if not in voting phase
  if (!votingSession || gameSessionState?.game_phase !== "voting") {
    return null;
  }

  // Dead players don't see voting UI
  if (isPlayerDead) {
    return null;
  }

  const candidates = votingSession.candidates ?? [];
  const currentIdx = votingSession.current_candidate_index ?? 0;
  const currentCandidate = candidates[currentIdx];
  const isLastCandidate = currentIdx === candidates.length - 1;

  // "Both leave" vote mode
  if (isBothLeaveMode) {
    return (
      <div className="flex flex-col items-center gap-2 p-2 bg-gray-800/80 rounded-lg">
        <div className="text-center">
          <div className="text-[10px] text-red-400 uppercase">All leave?</div>
          <div className="text-lg font-bold text-white">
            #{candidates.join(", #")}
          </div>
        </div>

        {hasVoted ? (
          <div className="px-3 py-1.5 bg-green-600/30 border border-green-500/50 rounded text-green-400 text-xs">
            ✓ Voted Yes
          </div>
        ) : isVotingActive ? (
          <button
            type="button"
            onClick={submitVote}
            disabled={!isEnabled || isSubmitting}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              isEnabled
                ? "bg-red-500 hover:bg-red-400 text-white animate-pulse"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "..." : `👍 Yes (${timeLeft}s)`}
          </button>
        ) : (
          <div className="px-3 py-1.5 bg-gray-700 rounded text-gray-400 text-xs">
            Wait for host...
          </div>
        )}
      </div>
    );
  }

  // All candidates voted
  if (currentIdx >= candidates.length) {
    return (
      <div className="text-center p-2 bg-gray-800/80 rounded-lg">
        <div className="text-xs text-gray-400">Waiting for results...</div>
      </div>
    );
  }

  // Last candidate: auto-voted, show message
  if (isLastCandidate) {
    return (
      <div className="flex flex-col items-center gap-2 p-2 bg-gray-800/80 rounded-lg">
        <div className="text-center">
          <div className="text-[10px] text-amber-400 uppercase">
            Last Candidate
          </div>
          <div className="text-xl font-bold text-white">
            #{currentCandidate}
          </div>
        </div>
        {hasVoted ? (
          <div className="px-3 py-1.5 bg-green-600/30 border border-green-500/50 rounded text-green-400 text-xs">
            ✓ Voted
          </div>
        ) : (
          <div className="px-3 py-1.5 bg-amber-600/30 border border-amber-500/50 rounded text-amber-400 text-xs">
            Auto-voted
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 p-2 bg-gray-800/80 rounded-lg">
      {/* Candidate */}
      <div className="text-center">
        <div className="text-[10px] text-amber-400 uppercase">Vote</div>
        <div className="text-xl font-bold text-white">#{currentCandidate}</div>
        <div className="text-[10px] text-gray-400">
          {currentIdx + 1}/{candidates.length}
        </div>
      </div>

      {/* Vote button or status */}
      {hasVoted ? (
        <div className="px-3 py-1.5 bg-green-600/30 border border-green-500/50 rounded text-green-400 text-xs">
          ✓ Voted
        </div>
      ) : isVotingActive ? (
        <button
          type="button"
          onClick={submitVote}
          disabled={!isEnabled || isSubmitting}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            isEnabled
              ? "bg-amber-500 hover:bg-amber-400 text-white animate-pulse"
              : "bg-gray-600 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? "..." : `👍 Vote (${timeLeft}s)`}
        </button>
      ) : (
        <div className="px-3 py-1.5 bg-gray-700 rounded text-gray-400 text-xs">
          Wait for host...
        </div>
      )}
    </div>
  );
}
