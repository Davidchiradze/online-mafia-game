"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { farewellSpeech } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { dayRoundFromNightNumber } from "@convex/games/core/dayRound";
import { FAREWELL_SPEECH, GamePhase } from "@/shared/lib/constants/game";
import {
  useGameRoom,
  type GameSessionState,
} from "@/features/game-room/context/gameRoomContext";
import { useHostPanelTimer } from "@/features/game-room/hooks/game/useHostPanelTimer";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import {
  farewellExit,
  farewellRun,
} from "@/features/game-room/lib/farewellRun";
import type {
  HostPanelAction,
  HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";

type FarewellSpeechPanelProps = {
  gameSessionState: GameSessionState;
};

/** The speech is 60s; matches the other long-speech warning. */
const URGENT_SECONDS = 10;
/** Marking a freshly started speaker dead is almost always a double click. */
const FINISH_GUARD_MS = 1000;

/**
 * The farewell: whoever left the game says goodbye before the table moves on.
 *
 * Three host steps per victim — grant time, listen, mark dead — and the order
 * is SHUFFLED on the way in so nobody can tell a mafia kill from a yakuza one.
 * The panel therefore shows who is up and who follows, never how the order was
 * built.
 *
 * The exit button names its destination (`farewellExit`), because the same
 * phase lets out into a night after a vote and into a day after the dawn
 * resolution, and "Advance" told the host nothing about which one they were
 * about to trigger.
 *
 * An empty run gets that exit button too. The server skips this phase entirely
 * when nobody dies, so it should be unreachable — but the legacy controls
 * rendered a bare "nothing to do" line with no way out, which turns a
 * should-never-happen into a stuck game.
 */
export default function FarewellSpeechPanel({
  gameSessionState,
}: FarewellSpeechPanelProps) {
  const t = useTranslations("game.host");
  const tPhases = useTranslations("game.phases");
  const { gameId, players } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const grantFarewellTime = useMutation(farewellSpeech.grantFarewellTime);
  const markDeadAndAdvance = useMutation(farewellSpeech.markDeadAndAdvance);
  const advanceFromFarewell = useMutation(farewellSpeech.advanceFromFarewell);

  const deadSeats = new Set(
    players
      .filter((player) => !player.isAlive)
      .map((player) => player.seatNumber),
  );
  const run = farewellRun(
    gameSessionState.speakingOrder ?? [],
    gameSessionState.currentSpeakerIndex,
    (seat) => deadSeats.has(seat),
  );
  const exit = farewellExit(gameSessionState.nominatedPlayers);

  const timer = useHostPanelTimer(
    run.mode === "speaking" ? gameSessionState.speakerStartedAt : null,
    FAREWELL_SPEECH.MAX_SPEAKING_TIME_MS,
    URGENT_SECONDS,
  );

  const callMutation = async (
    mutate: (args: { gameId: Id<"games"> }) => Promise<unknown>,
  ) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await mutate({ gameId: gameId as Id<"games"> });
    } catch (error) {
      console.error("Farewell step failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // The id doubles as the React key, so each new speaker remounts the button
  // and re-arms the finish guard.
  const action: HostPanelAction =
    run.mode === "speaking"
      ? {
          id: `farewell-finish-${String(run.activeSeat)}`,
          label: t("finish"),
          variant: "danger",
          onClick: () => void callMutation(markDeadAndAdvance),
          isLoading,
          disableOnMountMs: FINISH_GUARD_MS,
        }
      : run.mode === "waiting"
        ? {
            id: `farewell-start-${String(run.nextSeat)}`,
            label: t("start"),
            variant: "success",
            onClick: () => void callMutation(grantFarewellTime),
            isLoading,
          }
        : {
            id: "farewell-exit",
            label: exit === "night" ? t("startNight") : t("startDay"),
            variant: "primary",
            onClick: () => void callMutation(advanceFromFarewell),
            isLoading,
          };

  const descriptor: HostPanelDescriptor = {
    // A farewell after a vote belongs to the day that voted; one after the
    // night's kills belongs to the dawn that revealed them.
    eyebrow:
      exit === "night"
        ? t("dayCounter", {
            day: dayRoundFromNightNumber(gameSessionState.currentNightNumber),
          })
        : t("dawnCounter", {
            night: Math.max(1, gameSessionState.currentNightNumber),
          }),
    title: tPhases(GamePhase.FAREWELL_SPEECH),
    timer,
    speakers:
      run.activeSeat !== null
        ? [{ role: "now", label: t("sayingGoodbye"), seat: run.activeSeat }]
        : run.nextSeat !== null
          ? [{ role: "next", label: t("nextUp"), seat: run.nextSeat }]
          : undefined,
    // Only worth a bar when there is more than one goodbye to get through.
    progress:
      run.total > 1
        ? { value: run.doneSeats.length, total: run.total }
        : undefined,
    status:
      run.mode === "completed"
        ? t("allFarewellCompleted")
        : run.mode === "empty"
          ? t("noFarewellNeeded")
          : undefined,
    actions: [action],
  };

  return <HostPanel descriptor={descriptor} />;
}
