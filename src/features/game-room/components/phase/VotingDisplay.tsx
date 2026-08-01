"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { useVotingButton } from "@/features/game-room/hooks/game/useVotingButton";

export default function VotingDisplay() {
  const t = useTranslations("game.voting");
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
            {t("bothLeaveVote")}
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
          {t("shouldAllLeave", { count: candidates.length })}
        </div>

        {hasVoted ? (
          <VotedBadge t={t} />
        ) : isVotingActive ? (
          <VoteButton
            label={isSubmitting ? "..." : t("voteYes", { seconds: timeLeft })}
            enabled={isEnabled && !isSubmitting}
            onClick={submitVote}
            variant="danger"
          />
        ) : (
          <WaitingBadge t={t} />
        )}
      </div>
    );
  }

  if (currentIdx >= candidates.length) {
    return (
      <div className="results-waiting w-full px-4 py-3 rounded-lg border text-center">
        <span className="font-orbitron text-xs text-white/50 uppercase tracking-wider">
          {t("waitingForResults")}
        </span>
      </div>
    );
  }

  if (isLastCandidate) {
    return (
      <div className="w-full flex flex-col items-center gap-3">
        <div className="font-orbitron text-xs uppercase tracking-wider text-amber-400/80">
          {t("lastCandidate")}
        </div>

        <CandidateBadge seat={currentCandidate} color="amber" />

        {hasVoted ? <VotedBadge t={t} /> : <AutoVotedBadge t={t} />}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="font-orbitron text-xs uppercase tracking-wider text-white/50">
        {t("voteAgainst")}
      </div>

      <CandidateBadge seat={currentCandidate} color="red" />

      {hasVoted ? (
        <VotedBadge t={t} />
      ) : isVotingActive ? (
        <VoteButton
          label={isSubmitting ? "..." : t("voteNow", { seconds: timeLeft })}
          enabled={isEnabled && !isSubmitting}
          onClick={submitVote}
          variant="success"
        />
      ) : (
        <WaitingBadge t={t} />
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

type TFunction = ReturnType<typeof useTranslations<"game.voting">>;

function VotedBadge({ t }: { t: TFunction }) {
  return (
    <div className="badge-voted font-orbitron text-xs">
      ✓ {t("voted")}
    </div>
  );
}

function AutoVotedBadge({ t }: { t: TFunction }) {
  return (
    <div className="badge-auto-voted font-orbitron text-xs">
      {t("autoVoted")}
    </div>
  );
}

function WaitingBadge({ t }: { t: TFunction }) {
  return (
    <div className="badge-waiting font-orbitron text-xs">
      {t("waitForHost")}
    </div>
  );
}
