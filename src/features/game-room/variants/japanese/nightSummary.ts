"use client";

/**
 * Japanese host night summary (docs/engine/variant-architecture.md §2.4).
 *
 * The Japanese night is the `single-authority` model: one picker per team, so
 * the night records three SCALARS — the mafia's target (M), the yakuza's (Y)
 * and the doctor's heal (H). All three are already on the reactive night
 * session, so this is a pure derivation; it is a hook only to match the Sports
 * counterpart, which needs a host-only query.
 *
 * Returns pills for the host panel's data zone. The panel renders them; this
 * decides what they say.
 */

import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import type { HostPanelMeta } from "@/features/game-room/lib/hostPanel";
import { GamePhase } from "@/shared/lib/constants/game";

/** Phases during which the summary is meaningful (night_phase … doctor heal). */
const NIGHT_PHASES: readonly string[] = [
  GamePhase.NIGHT_PHASE,
  GamePhase.MAFIA_CHOOSES_TARGET,
  GamePhase.DON_CHECKS_FOR_DETECTIVE,
  GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET,
  GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
  GamePhase.DOCTOR_HEALS_PLAYER,
];

const EMPTY: readonly HostPanelMeta[] = [];

export function useJapaneseNightSummary(): readonly HostPanelMeta[] {
  const { nightPhaseSession, gameSessionState, isHost } = useGameRoom();

  if (!isHost || !gameSessionState) return EMPTY;
  const phase = gameSessionState.gamePhase;
  if (!NIGHT_PHASES.includes(phase)) return EMPTY;

  const seat = (value: number | undefined) =>
    value === undefined ? "—" : `#${String(value)}`;

  return [
    {
      id: "mafia",
      label: "M",
      value: seat(nightPhaseSession?.mafiaTarget),
      tone: "rose",
      isActive: phase === GamePhase.MAFIA_CHOOSES_TARGET,
    },
    {
      id: "yakuza",
      label: "Y",
      value: seat(nightPhaseSession?.yakuzaTarget),
      tone: "violet",
      isActive: phase === GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET,
    },
    {
      id: "doctor",
      label: "H",
      value: seat(nightPhaseSession?.healedPlayer),
      tone: "emerald",
      isActive: phase === GamePhase.DOCTOR_HEALS_PLAYER,
    },
  ];
}
