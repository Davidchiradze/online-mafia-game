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
import { GAME_PHASES } from "@/shared/lib/constants/game";
import type { HostPanelMeta } from "@/features/game-room/lib/hostPanel";

/** Phases during which the summary is meaningful (night_phase … doctor heal). */
const NIGHT_PHASES: readonly string[] = [
  GAME_PHASES[8], // night_phase
  GAME_PHASES[9], // mafia_chooses_target
  GAME_PHASES[10], // don_checks_for_detective
  GAME_PHASES[11], // right_hand_checks_for_yakuza
  GAME_PHASES[12], // yakuza_and_shogun_chooses_target
  GAME_PHASES[13], // detective_checks_for_mafia
  GAME_PHASES[14], // doctor_heals_player
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
      isActive: phase === GAME_PHASES[9],
    },
    {
      id: "yakuza",
      label: "Y",
      value: seat(nightPhaseSession?.yakuzaTarget),
      tone: "violet",
      isActive: phase === GAME_PHASES[12],
    },
    {
      id: "doctor",
      label: "H",
      value: seat(nightPhaseSession?.healedPlayer),
      tone: "emerald",
      isActive: phase === GAME_PHASES[14],
    },
  ];
}
