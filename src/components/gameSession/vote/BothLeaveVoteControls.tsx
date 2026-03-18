"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { voting } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";
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

  const startBothLeaveVoteMutation = useMutation(voting.startBothLeaveVote);
  const processBothLeaveResultMutation = useMutation(voting.processBothLeaveResult);
  const startBothLeaveFarewellMutation = useMutation(voting.startBothLeaveFarewell);
  const skipToNightAfterTieMutation = useMutation(voting.skipToNightAfterTie);

  const candidates = votingSession?.candidates ?? [];
  const bothLeaveVotes = voteData.bothLeaveVoters;
  const isVotingNow = votingSession?.votingActive ?? false;
  const isVoting = isLocalVoting || isVotingNow;

  const voteEnded =
    !isVoting && !!votingSession?.votingStartedAt;

  // Handler to start "both leave" vote
  const handleVoteNow = useCallback(async () => {
    if (isLoading || isVoting) return;

    startLocalVoting();
    setIsLoading(true);
    setResultMessage(null);

    try {
      await startBothLeaveVoteMutation({ gameId: gameId as Id<"games"> });
    } finally {
      stopLocalVoting();
      setIsLoading(false);
    }
  }, [gameId, isLoading, isVoting, startLocalVoting, stopLocalVoting, setIsLoading, setResultMessage, startBothLeaveVoteMutation]);

  // Handler to process "both leave" result
  const handleSeeResult = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const result = await processBothLeaveResultMutation({ gameId: gameId as Id<"games"> });
      if (result.allLeave) {
        await startBothLeaveFarewellMutation({
          gameId: gameId as Id<"games">,
          candidates: result.candidates,
        });
        setResultMessage(`All ${result.candidates.length} players farewell...`);
      } else {
        await skipToNightAfterTieMutation({ gameId: gameId as Id<"games"> });
        setResultMessage(
          `Vote failed (${result.voteCount}/${result.totalVoters}). Night...`
        );
      }
    } catch (e) {
      console.error("Failed to process both leave result:", e);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading, setIsLoading, setResultMessage, processBothLeaveResultMutation, startBothLeaveFarewellMutation, skipToNightAfterTieMutation]);

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
