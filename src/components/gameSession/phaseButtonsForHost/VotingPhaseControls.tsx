"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GameSessionState } from "@/types/game/type";
import { VOTING } from "@/lib/constants/game";
import {
  initializeVoting,
  startVoteWindow,
  endVoteWindow,
  advanceToNextCandidate,
  processVotingResults,
} from "@/lib/voting/actions";

type Props = {
  gameSessionState: GameSessionState;
};

type VotesMap = Record<string, number[]>;

/**
 * Compact host controls for voting phase.
 * Mobile-friendly with minimal UI.
 *
 * Flow:
 * 1. Host clicks "Vote Now" for candidate #1
 * 2. Timer counts down, voting ends automatically
 * 3. Auto-advance to next candidate, show "Vote Now" again
 * 4. Repeat until all candidates voted
 * 5. Show "Tally Results" button
 */
export default function VotingPhaseControls({ gameSessionState }: Props) {
  const { gameId, votingSession } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(VOTING.VOTE_WINDOW_SECONDS);

  // Initialize voting session on mount
  useEffect(() => {
    if (!votingSession) {
      void initializeVoting(gameId);
    }
  }, [gameId, votingSession]);

  // Timer for voting window - auto ends and advances when time is up
  useEffect(() => {
    if (votingSession?.voting_active && votingSession.voting_started_at) {
      const startTime = new Date(votingSession.voting_started_at).getTime();

      const tick = async () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, VOTING.VOTE_WINDOW_SECONDS - elapsed);
        setTimeLeft(remaining);

        if (remaining === 0) {
          // Clear interval FIRST to prevent multiple calls
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // End voting - host will manually advance with "Next Candidate" button
          setIsLoading(true);
          await endVoteWindow(gameId);
          setIsLoading(false);
        }
      };

      void tick();
      timerRef.current = setInterval(() => void tick(), 100);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      setTimeLeft(VOTING.VOTE_WINDOW_SECONDS);
    }
  }, [votingSession?.voting_active, votingSession?.voting_started_at, gameId]);

  const candidates = votingSession?.candidates ?? [];
  const currentIdx = votingSession?.current_candidate_index ?? 0;
  const currentCandidate = candidates[currentIdx];
  const votes = (votingSession?.votes as VotesMap) ?? {};
  const isVoting = votingSession?.voting_active ?? false;
  const allDone = currentIdx >= candidates.length;
  const isLastCandidate = currentIdx === candidates.length - 1 && !allDone;

  const currentVotes = currentCandidate
    ? (votes[String(currentCandidate)] ?? []).length
    : 0;

  const handleVoteNow = useCallback(async () => {
    if (isLoading || isVoting) return;
    setIsLoading(true);
    setResultMessage(null);
    await startVoteWindow(gameId);
    setIsLoading(false);
  }, [gameId, isLoading, isVoting]);

  const handleNextCandidate = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    await advanceToNextCandidate(gameId);
    setIsLoading(false);
  }, [gameId, isLoading]);

  const handleTally = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    const result = await processVotingResults(gameId);
    if (result.ok) {
      if (result.result === "winner") {
        setResultMessage(`#${result.winner} eliminated`);
      } else {
        setResultMessage(`Tie: ${result.tiedCandidates.join(", ")}`);
      }
    }
    setIsLoading(false);
  }, [gameId, isLoading]);

  if (!votingSession) {
    return <div className="text-xs text-gray-400">Loading...</div>;
  }

  // Determine which button to show
  // voting_started_at persists after vote ends until we advance - indicates we need "Next Candidate"
  const voteEndedForCurrentCandidate =
    !isVoting && votingSession.voting_started_at !== null;
  const showTallyButton = allDone || isLastCandidate;
  const showNextCandidateButton =
    voteEndedForCurrentCandidate && !showTallyButton;
  const showVoteNowButton =
    !isVoting && !showTallyButton && !showNextCandidateButton;

  // Get dot style for progress indicator
  const getDotStyle = (idx: number) => {
    const isCurrent = idx === currentIdx;
    const isPast = idx < currentIdx;

    if (isCurrent) {
      return isVoting
        ? "bg-amber-500 text-white animate-pulse"
        : "bg-amber-500 text-white";
    }
    if (isPast) return "bg-gray-600 text-gray-300";
    return "bg-gray-700 text-gray-400";
  };

  // Get status text
  const getStatusText = () => {
    if (allDone) return "All candidates voted";
    if (isLastCandidate)
      return `#${currentCandidate} • Auto-voted (${currentVotes} votes)`;
    if (voteEndedForCurrentCandidate)
      return `#${currentCandidate} • ${currentVotes} votes`;
    return `#${currentCandidate} (${currentIdx + 1}/${candidates.length})`;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Progress dots */}
      <div className="flex gap-1">
        {candidates.map((seat, idx) => (
          <div
            key={seat}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getDotStyle(
              idx
            )}`}
            title={`#${seat}: ${(votes[String(seat)] ?? []).length} votes`}
          >
            {seat}
          </div>
        ))}
      </div>

      {/* Current state */}
      {isVoting ? (
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-400">{timeLeft}s</div>
          <div className="text-xs text-gray-400">
            #{currentCandidate} • {currentVotes} votes
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-300">{getStatusText()}</div>
      )}

      {/* Result message */}
      {resultMessage && (
        <div className="text-sm text-green-400 font-medium">
          {resultMessage}
        </div>
      )}

      {/* Action buttons */}
      {isVoting && (
        <div className="text-xs text-gray-500">Voting in progress...</div>
      )}

      {showTallyButton && (
        <button
          type="button"
          onClick={handleTally}
          disabled={isLoading}
          className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded-md disabled:opacity-50"
        >
          {isLoading ? "..." : "Tally Results"}
        </button>
      )}

      {showNextCandidateButton && (
        <button
          type="button"
          onClick={handleNextCandidate}
          disabled={isLoading}
          className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-md disabled:opacity-50"
        >
          {isLoading ? "..." : "Next Candidate →"}
        </button>
      )}

      {showVoteNowButton && (
        <button
          type="button"
          onClick={handleVoteNow}
          disabled={isLoading}
          className="px-4 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-md disabled:opacity-50"
        >
          {isLoading ? "..." : "Vote Now"}
        </button>
      )}
    </div>
  );
}
