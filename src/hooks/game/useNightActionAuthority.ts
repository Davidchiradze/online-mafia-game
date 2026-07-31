"use client";

import { useMemo } from "react";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import type { NightActionAuthority } from "@/game/core/types";

export type { NightActionAuthority };

/**
 * Derives night-action authority for the viewer from the room context.
 *
 * The variant-specific rule (Japanese single kill authority vs Sports "every
 * living mafia acts") lives in `ruleset.nightAuthority`; this hook just gathers
 * the room context and delegates, so shared UI never branches on `gameType`.
 */
export function useNightActionAuthority(): NightActionAuthority {
  const {
    userId,
    isHost,
    gameSessionState,
    players,
    viewerRole,
    playerRolesMap,
    ruleset,
  } = useGameRoom();

  const phase = gameSessionState?.gamePhase ?? null;

  return useMemo(
    () =>
      ruleset.nightAuthority({
        phase,
        isHost,
        userId,
        viewerRole,
        players: players.map((p) => ({
          playerId: p.playerId as string,
          isAlive: p.isAlive,
        })),
        roleOf: (playerId) => playerRolesMap.get(playerId) ?? null,
      }),
    [ruleset, phase, isHost, userId, viewerRole, players, playerRolesMap],
  );
}
