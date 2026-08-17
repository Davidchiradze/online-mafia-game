"use client";

import { useTranslations } from "next-intl";
import { PHASE_TIMERS } from "@/shared/lib/constants/game";
import { GamePhase } from "@/shared/lib/game/visibility";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { nightPhaseLabelKey } from "@/features/game-room/lib/nightPhase";
import { canSeePhaseTimer, phaseClock } from "@/features/game-room/lib/playerPanel";
import { farewellRun } from "@/features/game-room/lib/farewellRun";
import { speakingRun } from "@/features/game-room/lib/speakingRun";
import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";
import { useHostPanelTimer } from "./useHostPanelTimer";

/** The descriptor slice every player-side state shares. */
export type PlayerPanelFields = Pick<
  HostPanelDescriptor,
  "eyebrow" | "title" | "timer" | "speakers"
>;

/**
 * Identity, countdown and speaker pills for the player's centre cell.
 *
 * Deliberately NOT `useNightPanelFields`: that one carries the night summary
 * (who the mafia picked, who the doctor healed), which is the host's alone. The
 * only fields shared with the host are the ones the whole table can see anyway.
 *
 * The title runs through `nightPhaseLabelKey` for the same reason the host's
 * does — on the first night the mafia meet, they do not kill — and it takes no
 * `nextPhase` argument at all, so the sleep buffer can never name its
 * destination the way the host's title does.
 */
export function usePlayerPanelFields(): PlayerPanelFields {
  const t = useTranslations("game.host");
  const tPhases = useTranslations("game.phases");
  const {
    gameSessionState,
    viewerRole,
    isHost,
    isSpectator,
    ruleset,
  } = useGameRoom();

  const phase = gameSessionState?.gamePhase ?? "";
  const nightNumber = gameSessionState?.currentNightNumber ?? 0;
  const clock = phaseClock(
    phase,
    nightNumber,
    gameSessionState?.nominatedPlayers.length ?? 0,
  );

  const maySeeTimer =
    phase !== "" &&
    canSeePhaseTimer({
      isHost,
      isSpectator,
      viewerRole,
      awakeRoles: ruleset.visibility.getAwakeRoles(phase as GamePhase),
    });

  const timer = useHostPanelTimer(
    maySeeTimer ? (gameSessionState?.phaseStartedAt ?? null) : null,
    PHASE_TIMERS[phase as GamePhase],
  );
  const speakers = useSpeakerPills();

  return {
    eyebrow: clock
      ? clock.kind === "day"
        ? t("dayCounter", { day: clock.value })
        : clock.kind === "dawn"
          ? t("dawnCounter", { night: clock.value })
          : t("nightCounter", { night: clock.value })
      : t("preGame"),
    title: tPhases(nightPhaseLabelKey(phase, nightNumber)),
    timer,
    speakers,
  };
}

/**
 * Who holds the floor, as the table sees it.
 *
 * The farewell stores its cursor as a bare SEAT while every other speaking
 * phase stores the `SPEAKING_STATE`-encoded one, so the two runs are decoded by
 * their own functions — see `farewellRun`. Players are shown only the seat
 * SPEAKING during a farewell: who is queued behind them is the order the night
 * killed in, and the host reveals that one goodbye at a time.
 */
function useSpeakerPills(): HostPanelDescriptor["speakers"] {
  const t = useTranslations("game.host");
  const { gameSessionState, players } = useGameRoom();

  const order = gameSessionState?.speakingOrder ?? [];
  if (order.length === 0) return undefined;

  const phase = gameSessionState?.gamePhase;

  if (phase === GamePhase.FAREWELL_SPEECH) {
    const deadSeats = new Set(
      players.filter((player) => !player.isAlive).map((p) => p.seatNumber),
    );
    const run = farewellRun(
      order,
      gameSessionState?.currentSpeakerIndex,
      (seat) => deadSeats.has(seat),
    );
    return run.activeSeat !== null
      ? [{ role: "now", label: t("sayingGoodbye"), seat: run.activeSeat }]
      : undefined;
  }

  const run = speakingRun(order, gameSessionState?.currentSpeakerIndex);
  const pills: NonNullable<HostPanelDescriptor["speakers"]> = [
    ...(run.activeSeat !== null
      ? [{ role: "now" as const, label: t("speakingNow"), seat: run.activeSeat }]
      : []),
    ...(run.nextSeat !== null
      ? [{ role: "next" as const, label: t("nextUp"), seat: run.nextSeat }]
      : []),
  ];
  return pills.length > 0 ? pills : undefined;
}
