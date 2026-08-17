"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { dayRoundFromNightNumber } from "@convex/games/core/dayRound";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { useVotingButton } from "@/features/game-room/hooks/game/useVotingButton";
import { votingRound } from "@/features/game-room/lib/votingRound";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import type {
  HostPanelAction,
  HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";
import { GamePhase } from "@/shared/lib/constants/game";

/**
 * The one thing a player does from the centre cell: vote.
 *
 * Reads the SAME `votingRound` step machine as the host, which is what keeps
 * the two views agreeing about the last candidate — the server auto-votes every
 * silent seat onto them, so the button must not be offered there or a player
 * taps it and gets a duplicate-vote rejection for a vote they already have.
 *
 * What it does NOT reuse is the host's tally: running vote counts per candidate
 * are the host's to read out. A player sees who is on the block and whether
 * their own vote is in.
 */
export default function PlayerVotingPanel() {
  const t = useTranslations("game.voting");
  const tHost = useTranslations("game.host");
  const tPhases = useTranslations("game.phases");
  const tGame = useTranslations("game");
  const { gameId, gameSessionState, votingSession, voteData, players, userId } =
    useGameRoom();

  const currentPlayer = useMemo(
    () => players.find((player) => player.playerId === userId),
    [players, userId],
  );
  const seat = currentPlayer?.seatNumber ?? null;
  const isDead = currentPlayer?.isAlive === false;

  const {
    isEnabled,
    hasVoted,
    isSubmitting,
    timeLeft,
    isVotingActive,
    isBothLeaveMode,
    submitVote,
  } = useVotingButton({ votingSession, playerSeatNumber: seat, gameId, voteData });

  const round = votingRound({
    candidates: votingSession?.candidates ?? [],
    currentCandidateIndex: votingSession?.currentCandidateIndex ?? 0,
    votingActive: isVotingActive,
    hasWindowRun: votingSession?.votingStartedAt != null,
    bothLeaveVoteActive: isBothLeaveMode,
    isTieBreak: votingSession?.isTieBreak ?? false,
    tieBreakRound: votingSession?.tieBreakRound ?? 0,
    // Zero on purpose: the counts feed `step`, which is the HOST's "which
    // button next" and is not read here. Handing a player the tally of who has
    // voted so far would leak how the room is leaning mid-window.
    eligibleVoterCount: 0,
    votedCount: 0,
  });

  const isAutoVoted = round.isFinalCandidate && !isBothLeaveMode;
  // The exact gap between windows: nothing decided yet (not auto-voted, no
  // queue result pending) and the host hasn't opened this one yet.
  const isPreVoteWait =
    !hasVoted && !round.isQueueComplete && !isAutoVoted && !isVotingActive;

  // Dead players still watch the vote — it is public — they just cannot cast,
  // so they get the status line below instead of either button.
  const action: HostPanelAction | null =
    isDead || hasVoted || round.isQueueComplete || isAutoVoted
      ? null
      : isVotingActive
        ? {
            id: `player-vote-${String(round.currentIndex)}`,
            label: isBothLeaveMode
              ? t("voteYes", { seconds: timeLeft })
              : t("voteNow", { seconds: timeLeft }),
            variant: isBothLeaveMode ? "danger" : "success",
            onClick: () => void submitVote(),
            disabled: !isEnabled,
            isLoading: isSubmitting,
          }
        : {
            // Same slot, disabled: the host hasn't opened the window yet. It
            // becomes the live vote button above in place the moment they do,
            // rather than a status line a player could miss entirely.
            id: "player-vote-waiting",
            label: t("waitForHost"),
            variant: "secondary",
            onClick: () => {},
            disabled: true,
          };

  const status = hasVoted
    ? t("voted")
    : round.isQueueComplete
      ? t("waitingForResults")
      : isAutoVoted
        ? t("autoVoted")
        : isPreVoteWait && isDead
          // The only case with neither button: a dead player before the
          // window opens still needs to be told what is happening.
          ? t("waitForHost")
          : undefined;

  const onTheBlock = isBothLeaveMode
    ? round.candidates
    : round.currentCandidate !== null
      ? [round.currentCandidate]
      : [];

  const descriptor: HostPanelDescriptor = {
    eyebrow: round.isTieBreak
      ? tGame("tieBreakLabel", { round: round.tieBreakRound })
      : tHost("dayCounter", {
          day: dayRoundFromNightNumber(
            gameSessionState?.currentNightNumber ?? 0,
          ),
        }),
    title: isBothLeaveMode ? t("bothLeaveVote") : tPhases(GamePhase.VOTING),
    nominated:
      onTheBlock.length > 0
        ? {
            label: round.isFinalCandidate && !isBothLeaveMode
              ? t("lastCandidate")
              : t("voteAgainst"),
            seats: onTheBlock,
            // The seat being voted against is the fact that matters; the
            // phrase names it, so it reads best right after the number.
            seatsFirst: true,
          }
        : undefined,
    note: isBothLeaveMode
      ? {
          text: t("shouldAllLeave", { count: round.candidates.length }),
          tone: "amber",
        }
      : undefined,
    status,
    actions: action ? [action] : [],
  };

  return <HostPanel descriptor={descriptor} />;
}
