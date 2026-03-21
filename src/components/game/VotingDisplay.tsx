"use client";

import React, { useMemo } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { useVotingButton } from "@/hooks/game/useVotingButton";

export default function VotingDisplay() {
  const { votingSession, gameSessionState, players, userId, gameId, voteData } =
    useGameRoom();

  const currentPlayer = useMemo(
    () => players.find((p) => p.playerId === userId),
    [players, userId],
  );

  const playerSeatNumber = currentPlayer?.seatNumber ?? null;
  const isPlayerDead = currentPlayer?.isAlive === false;

  const {
    isEnabled,
    hasVoted,
    isSubmitting,
    timeLeft,
    isVotingActive,
    isBothLeaveMode,
    submitVote,
  } = useVotingButton({ votingSession, playerSeatNumber, gameId, voteData });

  if (!votingSession || gameSessionState?.gamePhase !== "voting") return null;
  if (isPlayerDead) return null;

  const candidates = votingSession.candidates ?? [];
  const currentIdx = votingSession.currentCandidateIndex ?? 0;
  const currentCandidate = candidates[currentIdx];
  const isLastCandidate = currentIdx === candidates.length - 1;

  if (isBothLeaveMode) {
    return (
      <div className="w-full flex flex-col items-center gap-3">
        <div className="both-leave-header w-full px-4 py-2 rounded-lg border text-center">
          <span className="font-orbitron text-amber-300 text-xs uppercase tracking-wider font-bold">
            Both Leave Vote
          </span>
        </div>

        <div className="flex gap-2">
          {candidates.map((seat) => (
            <div key={seat} className="candidate-dot w-8 h-8 rounded-full flex items-center justify-center border-2">
              <span className="font-orbitron text-xs font-bold text-red-300">
                {seat}
              </span>
            </div>
          ))}
        </div>

        <div className="font-inter text-xs text-white/50 text-center">
          Should all {candidates.length} leave?
        </div>

        {hasVoted ? (
          <VotedBadge />
        ) : isVotingActive ? (
          <VoteButton
            label={isSubmitting ? "..." : `👍 Yes (${timeLeft}s)`}
            enabled={isEnabled && !isSubmitting}
            onClick={submitVote}
            variant="danger"
          />
        ) : (
          <WaitingBadge />
        )}
      </div>
    );
  }

  if (currentIdx >= candidates.length) {
    return (
      <div className="results-waiting w-full px-4 py-3 rounded-lg border text-center">
        <span className="font-orbitron text-xs text-white/50 uppercase tracking-wider">
          Waiting for results...
        </span>
      </div>
    );
  }

  if (isLastCandidate) {
    return (
      <div className="w-full flex flex-col items-center gap-3">
        <div className="font-orbitron text-xs uppercase tracking-wider text-amber-400/80">
          Last Candidate
        </div>

        <CandidateBadge seat={currentCandidate} color="amber" />

        {hasVoted ? <VotedBadge /> : <AutoVotedBadge />}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="font-orbitron text-xs uppercase tracking-wider text-white/50">
        Vote against
      </div>

      <CandidateBadge seat={currentCandidate} color="red" />

      {hasVoted ? (
        <VotedBadge />
      ) : isVotingActive ? (
        <VoteButton
          label={isSubmitting ? "..." : `👍 Vote (${timeLeft}s)`}
          enabled={isEnabled && !isSubmitting}
          onClick={submitVote}
          variant="success"
        />
      ) : (
        <WaitingBadge />
      )}
    </div>
  );
}

function CandidateBadge({
  seat,
  color,
}: {
  seat: number;
  color: "red" | "amber";
}) {
  const badgeClass = color === "red" ? "candidate-badge-red" : "candidate-badge-amber";
  const textClass = color === "red" ? "text-red-300" : "text-amber-300";
  
  return (
    <div className={`${badgeClass} px-5 py-2 rounded-lg border`}>
      <span className={`font-orbitron text-xl font-bold ${textClass}`}>
        #{seat}
      </span>
    </div>
  );
}

function VoteButton({
  label,
  enabled,
  onClick,
  variant,
}: {
  label: string;
  enabled: boolean;
  onClick: () => void;
  variant: "success" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      className={`phase-btn phase-btn-${variant}`}
    >
      {label}
    </button>
  );
}

function VotedBadge() {
  return (
    <div className="badge-voted font-orbitron text-xs">
      ✓ Voted
    </div>
  );
}

function AutoVotedBadge() {
  return (
    <div className="badge-auto-voted font-orbitron text-xs">
      Auto-voted
    </div>
  );
}

function WaitingBadge() {
  return (
    <div className="badge-waiting font-orbitron text-xs">
      Wait for host...
    </div>
  );
}
