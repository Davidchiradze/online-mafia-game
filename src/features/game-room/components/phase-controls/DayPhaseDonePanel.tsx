"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { dayPhase, nightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { dayRoundFromNightNumber } from "@convex/games/core/dayRound";
import type { GameSessionState } from "@/features/game-room/context/gameRoomContext";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import type {
  HostPanelAction,
  HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";

type DayPhaseDonePanelProps = {
  gameId: string;
  gameSessionState: GameSessionState;
};

/**
 * Everyone has spoken — where the day goes next.
 *
 * Three exits, in priority order:
 *  1. A 4th foul eliminated someone mid-day. The round ends with no vote at
 *     all; the host goes straight to night.
 *  2. Nobody was nominated. Nothing to vote on, so also straight to night.
 *  3. Someone was nominated. `startNominatedPlayersSpeaking` is the single
 *     mutation for both outcomes — it skips the speeches itself when the game
 *     was started without self-justification, or when a lone nominee makes
 *     them pointless — so only the LABEL changes between "start voting" and
 *     "start self-justification".
 */
export default function DayPhaseDonePanel({
  gameId,
  gameSessionState,
}: DayPhaseDonePanelProps) {
  const t = useTranslations("game.host");
  const tPhases = useTranslations("game.phases");
  const [isLoading, setIsLoading] = useState(false);
  const startNominatedSpeaking = useMutation(
    dayPhase.startNominatedPlayersSpeaking,
  );
  const enterNight = useMutation(nightPhase.enterNight);

  const nominatedSeats = gameSessionState.nominatedPlayers ?? [];
  const foulEliminationOccurred =
    gameSessionState.foulEliminationOccurred ?? false;
  const skipsSpeeches =
    (gameSessionState.withoutSelfJustification ?? false) ||
    nominatedSeats.length === 1;

  const callMutation = async (
    mutate: (args: { gameId: Id<"games"> }) => Promise<unknown>,
  ) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await mutate({ gameId: gameId as Id<"games"> });
    } finally {
      setIsLoading(false);
    }
  };

  const toNight: HostPanelAction = {
    id: "to-night",
    label: foulEliminationOccurred ? t("start") : t("startNight"),
    variant: "primary",
    onClick: () => void callMutation(enterNight),
    isLoading,
  };

  // The phase has not changed — the host is still in the day round — so the
  // title must not change either. Only the data zone and the action move on.
  const base = {
    eyebrow: t("dayCounter", {
      day: dayRoundFromNightNumber(gameSessionState.currentNightNumber),
    }),
    title: tPhases("day_phase"),
  };

  let descriptor: HostPanelDescriptor;
  if (foulEliminationOccurred) {
    descriptor = {
      ...base,
      note: { text: t("playerEliminatedByFoulsTitle"), tone: "amber" },
      status: t("noVotingThisRound"),
      actions: [toNight],
    };
  } else if (nominatedSeats.length === 0) {
    descriptor = {
      ...base,
      status: t("noPlayersNominated"),
      actions: [toNight],
    };
  } else {
    descriptor = {
      ...base,
      nominated: { label: t("nominatedLabel"), seats: nominatedSeats },
      status: t("allSpokenShort"),
      actions: [
        {
          id: "to-nominated",
          label: skipsSpeeches ? t("startVoting") : t("startSelfJustification"),
          variant: "warning",
          onClick: () => void callMutation(startNominatedSpeaking),
          isLoading,
        },
      ],
    };
  }

  return <HostPanel descriptor={descriptor} />;
}
