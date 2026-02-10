"use client";

import { useCallback } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import {
  startBothLeaveVote,
  processBothLeaveResult,
  startBothLeaveFarewell,
  skipToNightAfterTie,
} from "@/lib/voting/actions";
import { useVotingTimer } from "./useVotingTimer";
import { CandidateDots } from "./CandidateDots";
import { VotingTimer } from "./VotingTimer";
import { ResultMessage } from "./ResultMessage";
import { VotingActionButton, getBothLeaveActionState } from "./VotingActionButton";

type Props = {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  resultMessage: string | null;
  setResultMessage: (message: string | null) => void;
};

/**
 * UI controls for "both leave" vote mode.
 * Shown when the same candidates tie twice.
 */
export function BothLeaveVoteControls({
  isLoading,
  setIsLoading,
  resultMessage,
  setResultMessage,
}: Props) {
  const { gameId, votingSession, voteData } = useGameRoom();
  const { timeLeft, isLocalVoting, startLocalVoting, stopLocalVoting } = useVotingTimer();

  const candidates = votingSession?.candidates ?? [];
  const bothLeaveVotes = voteData.bothLeaveVoters;
  const isVotingNow = votingSession?.voting_active ?? false;
  const isVoting = isLocalVoting || isVotingNow;

  const voteEnded =
    !isVoting && votingSession?.voting_started_at !== null;

  // Handler to start "both leave" vote
  const handleVoteNow = useCallback(async () => {
    if (isLoading || isVoting) return;

    startLocalVoting();
    setIsLoading(true);
    setResultMessage(null);

    await startBothLeaveVote(gameId);

    stopLocalVoting();
    setIsLoading(false);
  }, [gameId, isLoading, isVoting, startLocalVoting, stopLocalVoting, setIsLoading, setResultMessage]);

  // Handler to process "both leave" result
  const handleSeeResult = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    const result = await processBothLeaveResult(gameId);
    if (result.ok) {
      if (result.allLeave) {
        await startBothLeaveFarewell(gameId, result.candidates);
        setResultMessage(`All ${result.candidates.length} players farewell...`);
      } else {
        await skipToNightAfterTie(gameId);
        setResultMessage(
          `Vote failed (${result.voteCount}/${result.totalVoters}). Night...`
        );
      }
    }

    setIsLoading(false);
  }, [gameId, isLoading, setIsLoading, setResultMessage]);

  const actionState = getBothLeaveActionState({ isLoading, isVoting, voteEnded });

  // Status text for when not voting
  const getStatusText = () => {
    if (voteEnded) return `${bothLeaveVotes.length} voted yes`;
    return "Ready to vote";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Tied candidates */}
      <CandidateDots
        candidates={candidates}
        currentIdx={0}
        isVoting={isVoting}
        votes={voteData.votes}
        variant="both_leave"
      />

      {/* Question */}
      <div className="text-xs text-center text-white/70">
        Should all {candidates.length} leave?
      </div>

      {/* Timer / Status */}
      {isVoting ? (
        <VotingTimer
          timeLeft={timeLeft}
          subtitle={`${bothLeaveVotes.length} votes`}
        />
      ) : (
        <div className="text-xs text-white/60">{getStatusText()}</div>
      )}

      {/* Result message */}
      {resultMessage && <ResultMessage message={resultMessage} />}

      {/* Action button */}
      <VotingActionButton
        state={actionState}
        onVoteNow={handleVoteNow}
        onSeeResult={handleSeeResult}
        variant="both_leave"
      />
    </div>
  );
}

