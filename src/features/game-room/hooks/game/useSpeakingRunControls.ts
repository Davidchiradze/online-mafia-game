"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { dayPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { DAY_PHASE_SPEAKING } from "@/shared/lib/constants/game";
import {
  countAliveSeatedPlayers,
  hasShortenedFinalDaySpeech,
} from "@/shared/lib/game/speakingBan";
import {
  useGameRoom,
  type GameSessionState,
} from "@/features/game-room/context/gameRoomContext";
import {
  speakingRun,
  type SpeakingRun,
} from "@/features/game-room/lib/speakingRun";
import type {
  HostPanelAction,
  HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";
import { useHostPanelTimer } from "./useHostPanelTimer";

/** Matches the legacy control's double-click guard on a freshly started speech. */
const FINISH_GUARD_MS = 1000;

export type SpeakingRunControls = {
  run: SpeakingRun;
  /** The descriptor slice the introduction and day compositions share. */
  fields: Pick<HostPanelDescriptor, "timer" | "speakers" | "status">;
  /**
   * Start / Finish for the current mode. `null` once the run is complete —
   * from there the phase's own exit action takes over (night, voting, …), and
   * only the panel that owns the phase knows what that is.
   */
  action: HostPanelAction | null;
};

/**
 * The shared half of a day-style speaking run: the three host mutations, the
 * speaker countdown, and the now/next pills.
 *
 * `introduction_phase` and `day_phase` drive the SAME run with the same
 * mutations and differ only in what happens once it finishes, so the run lives
 * here and each panel supplies its own exit.
 */
export function useSpeakingRunControls(
  gameId: string,
  gameSessionState: GameSessionState,
): SpeakingRunControls {
  const t = useTranslations("game.host");
  const { players, maxPlayers } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const startSpeaking = useMutation(dayPhase.startDaySpeaking);
  const advanceSpeaker = useMutation(dayPhase.advanceSpeaker);
  const finishSpeaker = useMutation(dayPhase.finishCurrentSpeaker);

  const run = speakingRun(
    gameSessionState.speakingOrder ?? [],
    gameSessionState.currentSpeakerIndex,
  );

  // The Sports final-day carve-out (docs/variants/sports.md §4.2): a
  // 3rd-foul-banned player still speaks on the last day, for 30s not 60s. The
  // host's countdown has to agree with the progress bar on the speaker's tile,
  // so it reads the same rule rather than assuming the phase default.
  const activePlayer = players.find(
    (p) => p.seatNumber === run.activeSeat && run.activeSeat !== null,
  );
  const isShortened =
    activePlayer !== undefined &&
    hasShortenedFinalDaySpeech(
      activePlayer,
      gameSessionState.currentNightNumber,
      countAliveSeatedPlayers(players, maxPlayers),
      gameSessionState.gamePhase,
    );

  const timer = useHostPanelTimer(
    run.mode === "active" ? gameSessionState.speakerStartedAt : null,
    isShortened
      ? DAY_PHASE_SPEAKING.FINAL_DAY_BANNED_TIME_MS
      : DAY_PHASE_SPEAKING.MAX_SPEAKING_TIME_MS,
  );

  const runMutation = useCallback(
    async (mutate: (args: { gameId: Id<"games"> }) => Promise<unknown>) => {
      if (isLoading) return;
      setIsLoading(true);
      try {
        await mutate({ gameId: gameId as Id<"games"> });
      } finally {
        setIsLoading(false);
      }
    },
    [gameId, isLoading],
  );

  const speakers: HostPanelDescriptor["speakers"] = [
    ...(run.activeSeat !== null
      ? [
          {
            role: "now" as const,
            label: t("speakingNow"),
            seat: run.activeSeat,
          },
        ]
      : []),
    ...(run.nextSeat !== null
      ? [{ role: "next" as const, label: t("nextUp"), seat: run.nextSeat }]
      : []),
  ];

  const status =
    run.mode === "completed"
      ? t("allSpokenCount", { total: run.total })
      : run.mode === "not-started"
        ? t("waitingToStart")
        : "";

  // The id doubles as the React key, so a mode or speaker change remounts the
  // button — which is exactly what re-arms the finish guard for each speech.
  const actionId = `speaking-${run.mode}-${String(run.activeSeat ?? run.nextSeat)}`;

  const action: HostPanelAction | null =
    run.mode === "completed"
      ? null
      : run.mode === "active"
        ? {
            id: actionId,
            label: t("finish"),
            variant: "danger",
            onClick: () => void runMutation(finishSpeaker),
            isLoading,
            disableOnMountMs: FINISH_GUARD_MS,
          }
        : {
            id: actionId,
            label: t("start"),
            variant: "success",
            onClick: () =>
              void runMutation(
                run.mode === "paused" ? advanceSpeaker : startSpeaking,
              ),
            isLoading,
          };

  return { run, fields: { timer, speakers, status }, action };
}
