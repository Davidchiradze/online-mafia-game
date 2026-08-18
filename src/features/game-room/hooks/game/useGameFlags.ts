"use client";

import { useMemo } from "react";
import { getGameDefinition } from "@convex/games/registry";
import { JAPANESE_DEFINITION } from "@convex/games/japanese/definition";
import type { GameFlags } from "@convex/games/core/types";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";

/**
 * This room's engine flags, resolved from `gameType`.
 *
 * Definitions are pure, so the frontend imports the same module the server
 * reads — a variant switch has one definition, not a backend one and a mirrored
 * frontend copy that can drift.
 *
 * Falls back to the Japanese flags while the game is still loading, and for a
 * game type with no registered definition — matching what `getUiRuleset`
 * already does with the UI ruleset. A throw here would take down the whole
 * room, and Japanese is the shape every unregistered type was implicitly
 * getting before this hook existed anyway.
 */
export function useGameFlags(): GameFlags {
  const { gameData } = useGameRoom();
  const gameType = gameData?.gameType;

  return useMemo(() => {
    try {
      return getGameDefinition(gameType ?? "").flags;
    } catch {
      return JAPANESE_DEFINITION.flags;
    }
  }, [gameType]);
}
