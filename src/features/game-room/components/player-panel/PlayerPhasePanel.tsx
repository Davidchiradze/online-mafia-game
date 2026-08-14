"use client";

import { usePlayerPanelFields } from "@/features/game-room/hooks/game/usePlayerPanelFields";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";

/**
 * The player's read-only view of the current phase.
 *
 * One component for every phase that asks nothing of the player, which is
 * almost all of them: they watch, and the host drives. There is no per-phase
 * map on this side for exactly that reason — the host needs one because each
 * phase has a different action, and a player has only ever had one (the vote).
 *
 * `actions: []` leaves the shell's action track empty rather than filling it,
 * so the identity and speaker pills get the whole cell.
 */
export default function PlayerPhasePanel() {
  const fields = usePlayerPanelFields();

  return <HostPanel descriptor={{ ...fields, actions: [] }} />;
}
