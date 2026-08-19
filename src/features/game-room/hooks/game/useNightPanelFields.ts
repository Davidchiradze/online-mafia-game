"use client";

import { useTranslations } from "next-intl";
import { PHASE_TIMERS } from "@/shared/lib/constants/game";
import type { GamePhase } from "@/shared/lib/game/visibility";
import {
  useGameRoom,
  type GameSessionState,
} from "@/features/game-room/context/gameRoomContext";
import { nightPhaseLabelKey } from "@/features/game-room/lib/nightPhase";
import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";
import { useGameFlags } from "./useGameFlags";
import { useHostPanelTimer } from "./useHostPanelTimer";

/** The descriptor slice every night phase shares. */
export type NightPanelFields = Pick<
  HostPanelDescriptor,
  "eyebrow" | "title" | "timer" | "meta"
>;

/**
 * Identity, countdown and night summary for a night phase.
 *
 * Every night state is the same shape — a role is awake, the night records
 * what they picked, the host closes the window — so all of it is derived from
 * the phase name plus the reactive session rather than restated per phase. The
 * summary pills come from `ruleset.useNightSummary`, which is the ONLY part
 * that differs between variants (Japanese single-authority scalars vs Sports'
 * per-mafia private picks).
 *
 * There is deliberately no status line: the title already names the phase, and
 * a second line saying "Don awake" under "Don checks for detective" is noise.
 * A panel that has live state worth a line sets `status` itself.
 *
 * `timerOverride` is for the one phase that does not run on the generic phase
 * clock: the Sports kill window counts from when the HOST opened it, not from
 * phase entry.
 */
export function useNightPanelFields(
  gameSessionState: GameSessionState,
  timerOverride?: HostPanelDescriptor["timer"] | "none",
): NightPanelFields {
  const t = useTranslations("game.host");
  const tPhases = useTranslations("game.phases");
  const { ruleset } = useGameRoom();
  const { mafiaKillsOnFirstNight } = useGameFlags();

  const phase = gameSessionState.gamePhase;
  const nightNumber = gameSessionState.currentNightNumber;
  const meta = ruleset.useNightSummary();

  const phaseTimer = useHostPanelTimer(
    gameSessionState.phaseStartedAt,
    PHASE_TIMERS[phase as GamePhase],
  );

  return {
    eyebrow: t("nightCounter", { night: Math.max(1, nightNumber) }),
    title: tPhases(
      nightPhaseLabelKey(phase, nightNumber, mafiaKillsOnFirstNight),
    ),
    timer: timerOverride === "none" ? undefined : (timerOverride ?? phaseTimer),
    meta: meta.length > 0 ? meta : undefined,
  };
}
