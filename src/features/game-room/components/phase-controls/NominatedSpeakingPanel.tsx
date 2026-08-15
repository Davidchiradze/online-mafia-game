"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { dayPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { dayRoundFromNightNumber } from "@convex/games/core/dayRound";
import { NOMINATED_PLAYERS_SPEAKING } from "@/shared/lib/constants/game";
import type { GameSessionState } from "@/features/game-room/context/gameRoomContext";
import { useHostPanelTimer } from "@/features/game-room/hooks/game/useHostPanelTimer";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import {
  speakingRun,
  speakingRunChips,
} from "@/features/game-room/lib/speakingRun";
import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";

type NominatedSpeakingPanelProps = {
  gameId: string;
  gameSessionState: GameSessionState;
};

/** Matches the legacy control's double-click guard between nominee speeches. */
const ADVANCE_GUARD_MS = 2000;
/** The 30s speech gets a 5s warning, not the 10s a 60s speech gets. */
const URGENT_SECONDS = 5;

/**
 * Self-justification: each nominated seat defends itself for 30 seconds.
 *
 * Short enough that the FULL order is shown as chips rather than now/next
 * pills — with two or three nominees the host wants the whole picture, and it
 * fits. A 4th foul landing mid-round overrides everything: the vote is
 * cancelled, and the only remaining action is to finish out to night.
 */
export default function NominatedSpeakingPanel({
  gameId,
  gameSessionState,
}: NominatedSpeakingPanelProps) {
  const t = useTranslations("game.host");
  const tPhases = useTranslations("game.phases");
  const [isLoading, setIsLoading] = useState(false);
  const advanceNominatedSpeaker = useMutation(dayPhase.advanceNominatedSpeaker);
  const finishCurrentNominatedSpeaker = useMutation(
    dayPhase.finishCurrentNominatedSpeaker,
  );

  const run = speakingRun(
    gameSessionState.speakingOrder ?? [],
    gameSessionState.currentSpeakerIndex,
  );
  const foulEliminationOccurred =
    gameSessionState.foulEliminationOccurred ?? false;

  const timer = useHostPanelTimer(
    run.mode === "active" ? gameSessionState.speakerStartedAt : null,
    NOMINATED_PLAYERS_SPEAKING.MAX_SPEAKING_TIME_MS,
    URGENT_SECONDS,
  );

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

  const eyebrow = t("dayCounter", {
    day: dayRoundFromNightNumber(gameSessionState.currentNightNumber),
  });
  const title = tPhases("nominated_players_speak");

  // An EMPTY order is the only real dead end — the phase was entered with
  // nobody to run. A "not-started" run that still has seats in it is the queued
  // state a tie-break arrives in (`voting:startTieBreak` deliberately leaves the
  // cursor unset so the host can announce the tied seats), and it falls through
  // to the Start button below.
  if (run.total === 0) {
    return (
      <HostPanel
        descriptor={{
          eyebrow,
          title,
          status: t("noNominatedPlayersSpeaking"),
          actions: [],
        }}
      />
    );
  }

  const isActive = run.mode === "active";
  // Advancing past the last speaker ENDS the round, so that button is a
  // "finish", not a "next" — same for every state once a foul has cancelled
  // the vote, where the run is only being played out.
  const endsTheRound = foulEliminationOccurred || run.isLastSpeaker;

  const status = foulEliminationOccurred
    ? isActive
      ? t("speakerCanFinishThenNight")
      : t("continueToNightPhase")
    : isActive && run.activeSeat !== null
      ? t("nomineeSpeaking", {
          seat: run.activeSeat,
          position: run.position,
          total: run.total,
        })
      : run.nextSeat !== null
        ? t("nomineeNext", { seat: run.nextSeat })
        : t("allSpokenShort");

  const descriptor: HostPanelDescriptor = {
    eyebrow,
    title,
    timer,
    note: foulEliminationOccurred
      ? { text: t("playerEliminatedByFouls"), tone: "amber" }
      : undefined,
    chipsLabel: t("speakingOrderLabel"),
    chips: speakingRunChips(run),
    status,
    actions: [
      {
        id: `nominee-${run.mode}-${String(run.activeSeat ?? run.nextSeat)}`,
        label: isActive || endsTheRound ? t("finish") : t("start"),
        variant: isActive || endsTheRound ? "danger" : "success",
        onClick: () =>
          void callMutation(
            isActive ? finishCurrentNominatedSpeaker : advanceNominatedSpeaker,
          ),
        isLoading,
        disableOnMountMs: ADVANCE_GUARD_MS,
      },
    ],
  };

  return <HostPanel descriptor={descriptor} />;
}
