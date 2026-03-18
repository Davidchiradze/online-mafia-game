"use client";

import { useCallback, useEffect } from "react";
import { useMutation } from "convex/react";
import { voting } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";
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

  const startVoteWindowMutation = useMutation(voting.startVoteWindow);
  const advanceCandidateMutation = useMutation(voting.advanceCandidate);
  const processResultsMutation = useMutation(voting.processResults);
  const startVotingFarewellMutation = useMutation(voting.startVotingFarewell);
  const startTieBreakMutation = useMutation(voting.startTieBreak);

  // Track when we're waiting for real-time sync after advancing to next candidate
  // const [waitingForSync, setWaitingForSync] = useState(false);

  // Clear loading when real-time update confirms the advance
  // (votingStartedAt becomes null after advancing to next candidate)
  useEffect(() => {
    if (!votingSession?.votingStartedAt) {
      // setWaitingForSync(false);
      setIsLoading(false);
    }
  }, [votingSession?.votingStartedAt, setIsLoading]);

  const candidates = votingSession?.candidates ?? [];
  const currentIdx = votingSession?.currentCandidateIndex ?? 0;
  const currentCandidate = candidates[currentIdx];
  const isVotingNow = votingSession?.votingActive ?? false;
  const isVoting = isLocalVoting || isVotingNow;
  const allDone = currentIdx >= candidates.length;
  const isLastCandidate = currentIdx === candidates.length - 1 && !allDone;

  // Tie-break info
  const isTieBreak = votingSession?.isTieBreak ?? false;
  const tieBreakRound = votingSession?.tieBreakRound ?? 0;

  // Vote counts
  const currentVotes = currentCandidate
    ? (voteData.votes[String(currentCandidate)] ?? []).length
    : 0;

  // Determine which button to show
  const voteEndedForCurrentCandidate =
    !isVoting && !!votingSession?.votingStartedAt;
  const showTallyButton = allDone || isLastCandidate;
  const showNextCandidateButton = voteEndedForCurrentCandidate && !showTallyButton;
  const showVoteNowButton = !isVoting && !showTallyButton && !showNextCandidateButton;

  // Handler: Start vote for current candidate
  const handleVoteNow = useCallback(async () => {
    if (isLoading || isVoting) return;

    startLocalVoting();
    setIsLoading(true);
    setResultMessage(null);

    try {
      await startVoteWindowMutation({ gameId: gameId as Id<"games"> });
    } catch (e) {
      console.error("Failed to start vote window:", e);
    } finally {
      stopLocalVoting();
      setIsLoading(false);
    }
  }, [gameId, isLoading, isVoting, startLocalVoting, stopLocalVoting, setIsLoading, setResultMessage, startVoteWindowMutation]);

  // Handler: Advance to next candidate (waits for real-time sync)
  const handleNextCandidate = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      await advanceCandidateMutation({ gameId: gameId as Id<"games"> });
      // Don't clear loading here - wait for real-time sync
      // useEffect above will clear it when votingStartedAt becomes null
    } catch (e) {
      console.error("Failed to advance candidate:", e);
      setIsLoading(false);
    }
  }, [gameId, isLoading, setIsLoading, advanceCandidateMutation]);

  // Handler: Tally results
  const handleTally = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const result = await processResultsMutation({ gameId: gameId as Id<"games"> });
      if (result.result === "winner") {
        await startVotingFarewellMutation({
          gameId: gameId as Id<"games">,
          winnerSeatNumber: result.winner,
        });
        setResultMessage(`#${result.winner} farewell...`);
      } else {
        const tieResult = await startTieBreakMutation({
          gameId: gameId as Id<"games">,
          tiedCandidates: result.tiedCandidates,
        });
        if (tieResult.bothLeaveVote) {
          setResultMessage(`Same tie! Vote: should all leave?`);
        } else {
          setResultMessage(
            `Tie! #${result.tiedCandidates.join(", #")} justify...`
          );
        }
      }
    } catch (e) {
      console.error("Failed to process voting results:", e);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading, setIsLoading, setResultMessage, processResultsMutation, startVotingFarewellMutation, startTieBreakMutation]);

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
        <div className="text-[10px] text-amber-400 uppercase tracking-wide font-medium">
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
