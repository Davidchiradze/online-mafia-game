"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { voting } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { useVotingTimer } from "./useVotingTimer";
import { CandidateDots } from "./CandidateDots";
import { VotingTimer } from "./VotingTimer";
import { ResultMessage } from "./ResultMessage";
import {
  VotingActionButton,
  getBothLeaveActionState,
} from "./VotingActionButton";

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
  const t = useTranslations("game");
  const { gameId, votingSession, voteData } = useGameRoom();
  const { timeLeft, isLocalVoting, startLocalVoting, stopLocalVoting } =
    useVotingTimer();

  const startBothLeaveVoteMutation = useMutation(voting.startBothLeaveVote);
  const processBothLeaveResultMutation = useMutation(
    voting.processBothLeaveResult,
  );
  const startBothLeaveFarewellMutation = useMutation(
    voting.startBothLeaveFarewell,
  );
  const skipToNightAfterTieMutation = useMutation(voting.skipToNightAfterTie);

  const candidates = votingSession?.candidates ?? [];
  const bothLeaveVotes = voteData.bothLeaveVoters;
  const isVotingNow = votingSession?.votingActive ?? false;
  const isVoting = isLocalVoting || isVotingNow;

  const voteEnded = !isVoting && !!votingSession?.votingStartedAt;

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
  }, [
    gameId,
    isLoading,
    isVoting,
    startLocalVoting,
    stopLocalVoting,
    setIsLoading,
    setResultMessage,
    startBothLeaveVoteMutation,
  ]);

  // Handler to process "both leave" result
  const handleSeeResult = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const result = await processBothLeaveResultMutation({
        gameId: gameId as Id<"games">,
      });
      if (result.allLeave) {
        await startBothLeaveFarewellMutation({
          gameId: gameId as Id<"games">,
          candidates: result.candidates,
        });
        setResultMessage(
          t("bothLeaveFarewellResult", { count: result.candidates.length }),
        );
      } else {
        await skipToNightAfterTieMutation({ gameId: gameId as Id<"games"> });
        setResultMessage(
          t("bothLeaveFailResult", {
            voteCount: result.voteCount,
            totalVoters: result.totalVoters,
          }),
        );
      }
    } catch (e) {
      console.error("Failed to process both leave result:", e);
    } finally {
      setIsLoading(false);
    }
  }, [
    gameId,
    isLoading,
    setIsLoading,
    setResultMessage,
    processBothLeaveResultMutation,
    startBothLeaveFarewellMutation,
    skipToNightAfterTieMutation,
  ]);

  const actionState = getBothLeaveActionState({
    isLoading,
    isVoting,
    voteEnded,
  });

  // Status text for when not voting
  const getStatusText = () => {
    if (voteEnded) return t("bothLeaveVotedYes", { count: bothLeaveVotes.length });
    return t("readyToVote");
  };

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* "Both Leave" label */}
      <div
        className="w-full px-4 py-2 rounded-lg border text-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.25) 100%)",
          borderColor: "rgba(245,158,11,0.5)",
        }}
      >
        <span
          className="text-amber-300 text-xs uppercase tracking-wider"
          style={{
            fontFamily: "var(--font-orbitron), sans-serif",
            fontWeight: 700,
          }}
        >
          {t("bothLeaveVoteLabel")}
        </span>
      </div>

      {/* Tied candidates */}
      <CandidateDots
        candidates={candidates}
        currentIdx={0}
        isVoting={isVoting}
        votes={voteData.votes}
        variant="both_leave"
      />

      {/* Question */}
      <div
        className="text-xs text-center text-white/50"
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        {t("bothLeaveQuestion", { count: candidates.length })}
      </div>

      {/* Timer / Status */}
      {isVoting ? (
        <VotingTimer
          timeLeft={timeLeft}
          subtitle={t("bothLeaveVotedYes", { count: bothLeaveVotes.length })}
        />
      ) : (
        <div
          className="text-xs text-white/50 uppercase tracking-wider"
          style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
        >
          {getStatusText()}
        </div>
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
