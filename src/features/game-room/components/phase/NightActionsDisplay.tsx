"use client";

import { useGameRoom } from "@/features/game-room/context/gameRoomContext";

/**
 * Host-only night-actions summary strip. This is a pure DISPATCH boundary: it
 * renders the resolved variant's `ruleset.nightActionsDisplay` (Japanese shows
 * the single-authority M/Y/H scalars; Sports shows each living mafia's private
 * pick via the host-only `getHostSelections`). No `gameType` branching here —
 * the ruleset owns the variant behavior (docs/engine/variant-architecture.md §2.2).
 */
export default function NightActionsDisplay() {
  const { ruleset } = useGameRoom();
  const NightActions = ruleset.nightActionsDisplay;
  return <NightActions />;
}
