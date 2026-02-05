"use client";

import { useCallback, useState, useEffect } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import {
  startVoteWindow,
  advanceToNextCandidate,
  processVotingResults,
  startVotingFarewell,
  startTieBreak,
} from "@/lib/voting/actions";
import { useVotingTimer } from "./useVotingTimer";
import { CandidateDots } from "./CandidateDots";
import { VotingTimer } from "./VotingTimer";
import { ResultMessage } from "./ResultMessage";
import { StatusText } from "./StatusText";
import { VotingActionButton, getRegularVotingActionState } from "./VotingActionButton";

type Props = {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  resultMessage: string | null;
  setResultMessage: (message: string | null) => void;
};

/**
 * UI controls for regular voting mode.
 * Host votes on each candidate sequentially.
 */
export function RegularVotingControls({
  isLoading,
  setIsLoading,
  resultMessage,
  setResultMessage,
}: Props) {
  const { gameId, votingSession, voteData } = useGameRoom();
  const { timeLeft, isLocalVoting, startLocalVoting, stopLocalVoting } = useVotingTimer();
  
  // Track when we're waiting for real-time sync after advancing to next candidate
  // const [waitingForSync, setWaitingForSync] = useState(false);

  // Clear loading when real-time update confirms the advance
  // (voting_started_at becomes null after advancing to next candidate)
  useEffect(() => {
    if (votingSession?.voting_started_at === null) {
      // setWaitingForSync(false);
      setIsLoading(false);
    }
  }, [ votingSession?.voting_started_at, setIsLoading]);

  const candidates = votingSession?.candidates ?? [];
  const currentIdx = votingSession?.current_candidate_index ?? 0;
  const currentCandidate = candidates[currentIdx];
  const isVotingNow = votingSession?.voting_active ?? false;
  const isVoting = isLocalVoting || isVotingNow;
  const allDone = currentIdx >= candidates.length;
  const isLastCandidate = currentIdx === candidates.length - 1 && !allDone;

  // Tie-break info
  const isTieBreak = votingSession?.is_tie_break ?? false;
  const tieBreakRound = votingSession?.tie_break_round ?? 0;

  // Vote counts
  const currentVotes = currentCandidate
    ? (voteData.votes[String(currentCandidate)] ?? []).length
    : 0;

  // Determine which button to show
  const voteEndedForCurrentCandidate =
    !isVoting && votingSession?.voting_started_at !== null;
  const showTallyButton = allDone || isLastCandidate;
  const showNextCandidateButton = voteEndedForCurrentCandidate && !showTallyButton;
  const showVoteNowButton = !isVoting && !showTallyButton && !showNextCandidateButton;

  // Handler: Start vote for current candidate
  const handleVoteNow = useCallback(async () => {
    if (isLoading || isVoting) return;

    startLocalVoting();
    setIsLoading(true);
    setResultMessage(null);

    await startVoteWindow(gameId);

    stopLocalVoting();
    setIsLoading(false);
  }, [gameId, isLoading, isVoting, startLocalVoting, stopLocalVoting, setIsLoading, setResultMessage]);

  // Handler: Advance to next candidate (waits for real-time sync)
  const handleNextCandidate = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    await advanceToNextCandidate(gameId);
    
    // Don't clear loading here - wait for real-time sync
    // useEffect above will clear it when voting_started_at becomes null
    // setWaitingForSync(true);
  }, [gameId, isLoading, setIsLoading]);

  // Handler: Tally results
  const handleTally = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    const result = await processVotingResults(gameId);
    if (result.ok) {
      if (result.result === "winner") {
        await startVotingFarewell(gameId, result.winner);
        setResultMessage(`#${result.winner} farewell...`);
      } else {
        const tieResult = await startTieBreak(gameId, result.tiedCandidates);
        if (tieResult.ok) {
          if (tieResult.bothLeaveVote) {
            setResultMessage(`Same tie! Vote: should all leave?`);
          } else {
            setResultMessage(
              `Tie! #${result.tiedCandidates.join(", #")} justify...`
            );
          }
        }
      }
    }

    setIsLoading(false);
  }, [gameId, isLoading, setIsLoading, setResultMessage]);

  // Compute action state
  const actionState = getRegularVotingActionState({
    isLoading,
    isVoting,
    showTallyButton,
    showNextCandidateButton,
    showVoteNowButton,
  });

  // Get status text for when not voting
  const getStatusText = () => {
    if (allDone) return "All candidates voted";
    if (isLastCandidate) return `#${currentCandidate} • Auto-voted (${currentVotes} votes)`;
    if (voteEndedForCurrentCandidate) return `#${currentCandidate} • ${currentVotes} votes`;
    return `#${currentCandidate} (${currentIdx + 1}/${candidates.length})`;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Tie-break indicator */}
      {isTieBreak && (
        <div className="text-[10px] text-red-400 uppercase tracking-wide">
          Tie-break #{tieBreakRound}
        </div>
      )}

      {/* Progress dots */}
      <CandidateDots
        candidates={candidates}
        currentIdx={currentIdx}
        isVoting={isVoting}
        votes={voteData.votes}
      />

      {/* Current state */}
      {isVoting ? (
        <VotingTimer
          timeLeft={timeLeft}
          subtitle={`#${currentCandidate} • ${currentVotes} votes`}
        />
      ) : (
        <StatusText text={getStatusText()} />
      )}

      {/* Result message */}
      {resultMessage && <ResultMessage message={resultMessage} />}

      {/* Action button */}
      <VotingActionButton
        state={actionState}
        onVoteNow={handleVoteNow}
        onNextCandidate={handleNextCandidate}
        onTally={handleTally}
      />
    </div>
  );
}

