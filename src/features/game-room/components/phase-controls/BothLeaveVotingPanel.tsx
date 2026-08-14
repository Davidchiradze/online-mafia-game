"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { voting } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { useVotingRound } from "@/features/game-room/hooks/game/useVotingRound";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import type {
  HostPanelAction,
  HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";

type BothLeaveVotingPanelProps = {
  /** Carried over from the tally that created this vote — see `VotingPanel`. */
  note: string | null;
  setNote: (note: string | null) => void;
};

/**
 * The deadlock breaker: the same candidates tied twice, so instead of a third
 * round the table is asked one yes/no question — should they ALL leave?
 *
 * A strict majority of living, non-host seats carries it (`BOTH_LEAVE_THRESHOLD`);
 * anything less and the day ends with nobody eliminated. The host does not get
 * to choose between those outcomes — `processBothLeaveResult` reports which one
 * the count produced and the panel dispatches accordingly — so the button says
 * "See Result", not "Eliminate".
 *
 * The title replaces the phase name here on purpose. "Voting" would be true and
 * useless: what the host has to read out is the question.
 */
export default function BothLeaveVotingPanel({
  note,
  setNote,
}: BothLeaveVotingPanelProps) {
  const t = useTranslations("game");
  const tHost = useTranslations("game.host");
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const { round, timer, bothLeaveVotes } = useVotingRound();

  const startBothLeaveVote = useMutation(voting.startBothLeaveVote);
  const processBothLeaveResult = useMutation(voting.processBothLeaveResult);
  const startBothLeaveFarewell = useMutation(voting.startBothLeaveFarewell);
  const skipToNightAfterTie = useMutation(voting.skipToNightAfterTie);

  const run = async (work: () => Promise<unknown>) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await work();
    } catch (error) {
      console.error("Both-leave step failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeeResult = () =>
    run(async () => {
      const id = gameId as Id<"games">;
      const result = await processBothLeaveResult({ gameId: id });
      if (result.allLeave) {
        await startBothLeaveFarewell({ gameId: id, candidates: result.candidates });
        setNote(
          t("bothLeaveFarewellResult", { count: result.candidates.length }),
        );
        return;
      }
      await skipToNightAfterTie({ gameId: id });
      setNote(
        t("bothLeaveFailResult", {
          voteCount: result.voteCount,
          totalVoters: result.totalVoters,
        }),
      );
    });

  const action: HostPanelAction =
    round.step === "counting"
      ? {
          id: "both-leave-counting",
          label: t("votingInProgress"),
          variant: "danger",
          onClick: () => undefined,
          disabled: true,
        }
      : round.step === "result"
        ? {
            id: "both-leave-result",
            label: t("seeResult"),
            variant: "primary",
            onClick: () => void handleSeeResult(),
            isLoading,
          }
        : {
            id: "both-leave-open",
            label: t("voteNow"),
            variant: "danger",
            onClick: () =>
              void run(() =>
                startBothLeaveVote({ gameId: gameId as Id<"games"> }),
              ),
            isLoading,
          };

  const descriptor: HostPanelDescriptor = {
    eyebrow: t("tieBreakLabel", { round: round.tieBreakRound }),
    title: t("bothLeaveVoteLabel"),
    timer,
    nominated:
      round.candidates.length > 0
        ? { label: tHost("nominatedLabel"), seats: round.candidates }
        : undefined,
    // The result of the last tally outranks the question: it is what explains
    // to the host why they are suddenly asking a different one.
    note: {
      text: note ?? t("bothLeaveQuestion", { count: round.candidates.length }),
      tone: "amber",
    },
    status:
      round.step === "open-window"
        ? t("readyToVote")
        : t("bothLeaveVotedYes", { count: bothLeaveVotes }),
    actions: [action],
  };

  return <HostPanel descriptor={descriptor} />;
}
