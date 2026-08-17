"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { voting } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { dayRoundFromNightNumber } from "@convex/games/core/dayRound";
import {
  useGameRoom,
  type GameSessionState,
} from "@/features/game-room/context/gameRoomContext";
import { useVotingRound } from "@/features/game-room/hooks/game/useVotingRound";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import type {
  HostPanelAction,
  HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";
import { GamePhase } from "@/shared/lib/constants/game";

type RegularVotingPanelProps = {
  gameSessionState: GameSessionState;
  /** Survives the swap to the both-leave panel — see `VotingPanel`. */
  note: string | null;
  setNote: (note: string | null) => void;
};

/**
 * The candidate queue: open a 3s window on each nominee in turn, then tally.
 *
 * The step machine is `votingRound()`, including the two rules that are not
 * visible from the session alone — the last candidate is auto-voted and a
 * fully-voted table cuts the queue short, so both land on "Tally" rather than
 * on another window.
 *
 * Tallying is two mutations, not one: `processResults` only reports who won,
 * and the follow-up decides the game's direction (a farewell for a clear
 * winner, self-justification for a fresh tie, a both-leave vote for a repeat
 * of the same tie). The sentence explaining which one fired is the note.
 */
export default function RegularVotingPanel({
  gameSessionState,
  note,
  setNote,
}: RegularVotingPanelProps) {
  const t = useTranslations("game");
  const tHost = useTranslations("game.host");
  const tPhases = useTranslations("game.phases");
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const { round, tally, timer, currentVotes } = useVotingRound();

  const startVoteWindow = useMutation(voting.startVoteWindow);
  const advanceCandidate = useMutation(voting.advanceCandidate);
  const processResults = useMutation(voting.processResults);
  const startVotingFarewell = useMutation(voting.startVotingFarewell);
  const startTieBreak = useMutation(voting.startTieBreak);

  const run = async (work: () => Promise<unknown>) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await work();
    } catch (error) {
      console.error("Voting step failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTally = () =>
    run(async () => {
      const id = gameId as Id<"games">;
      const result = await processResults({ gameId: id });
      if (result.result === "winner") {
        await startVotingFarewell({ gameId: id, winnerSeatNumber: result.winner });
        setNote(t("winnerFarewellResult", { seat: result.winner }));
        return;
      }
      const tie = await startTieBreak({
        gameId: id,
        tiedCandidates: result.tiedCandidates,
      });
      setNote(
        tie.bothLeaveVote
          ? t("sameTieResult")
          : t("tieResult", {
              seats: result.tiedCandidates.map((s) => `#${s}`).join(", "),
            }),
      );
    });

  const action: HostPanelAction =
    round.step === "counting"
      ? {
          id: "voting-counting",
          label: t("votingInProgress"),
          variant: "primary",
          onClick: () => undefined,
          disabled: true,
        }
      : round.step === "tally"
        ? {
            id: "voting-tally",
            label: t("tallyResults"),
            variant: "success",
            onClick: () => void handleTally(),
            isLoading,
          }
        : round.step === "next-candidate"
          ? {
              id: `voting-next-${round.currentIndex}`,
              label: t("nextCandidate"),
              variant: "secondary",
              onClick: () =>
                void run(() =>
                  advanceCandidate({ gameId: gameId as Id<"games"> }),
                ),
              isLoading,
            }
          : {
              id: `voting-open-${round.currentIndex}`,
              label: t("voteNow"),
              variant: "primary",
              onClick: () =>
                void run(() =>
                  startVoteWindow({ gameId: gameId as Id<"games"> }),
                ),
              isLoading,
            };

  // A complete queue and an out-of-range cursor are the same fact — there is
  // no candidate on the clock to say anything about.
  const seat = round.currentCandidate;
  const status =
    round.isQueueComplete || seat === null
      ? t("allCandidatesVoted")
      : round.isFinalCandidate
        ? t("candidateAutoVoted", { seat, votes: currentVotes })
        : round.step === "open-window"
          ? t("candidateProgress", {
              seat,
              current: round.currentIndex + 1,
              total: round.candidates.length,
            })
          : t("candidateVotes", { seat, votes: currentVotes });

  const descriptor: HostPanelDescriptor = {
    // A tie-break is a round of its own, and which one matters — the second
    // identical tie is what turns the vote into "should both leave".
    eyebrow: round.isTieBreak
      ? t("tieBreakLabel", { round: round.tieBreakRound })
      : tHost("dayCounter", {
          day: dayRoundFromNightNumber(gameSessionState.currentNightNumber),
        }),
    title: tPhases(GamePhase.VOTING),
    timer,
    note: note ? { text: note, tone: "amber" } : undefined,
    meta: tally.length > 0 ? tally : undefined,
    status,
    actions: [action],
  };

  return <HostPanel descriptor={descriptor} />;
}
