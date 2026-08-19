"use client";

/**
 * Serial Killer host night summary.
 *
 * Same `single-authority` shape as Japanese — three scalars on the reactive
 * night session — with the Serial Killer's shot (S) in the slot Japanese gives
 * the yakuza. Amber matches the faction's chart hue.
 *
 * Pure derivation; it is a hook only to match the shared `NightSummaryHook`
 * signature, which Sports needs because its summary requires a host-only query.
 */

import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import type { HostPanelMeta } from "@/features/game-room/lib/hostPanel";
import { GamePhase } from "@/shared/lib/constants/game";

/** Phases during which the summary is meaningful (night_phase … doctor heal). */
const NIGHT_PHASES: readonly string[] = [
  GamePhase.NIGHT_PHASE,
  GamePhase.MAFIA_CHOOSES_TARGET,
  GamePhase.DON_CHECKS_FOR_DETECTIVE,
  GamePhase.SERIAL_KILLER_CHOOSES_TARGET,
  GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
  GamePhase.DOCTOR_HEALS_PLAYER,
];

const EMPTY: readonly HostPanelMeta[] = [];

export function useSerialKillerNightSummary(): readonly HostPanelMeta[] {
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
      id: "serial-killer",
      label: "S",
      value: seat(nightPhaseSession?.serialKillerTarget),
      tone: "amber",
      isActive: phase === GamePhase.SERIAL_KILLER_CHOOSES_TARGET,
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
