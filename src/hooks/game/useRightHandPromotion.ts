"use client";

import { useMemo } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";

export interface RightHandPromotionResult {
  /** True only for the Don during `don_chooses_right_hand` when no Right
   *  Hand has been chosen yet AND the target is a live MAFIA non-host. */
  canShowPromoteButton: boolean;
}

/**
 * Hook that gates the per-tile "Promote to Right Hand" button.
 *
 * Visibility rules (mirror of the server-side `promoteToRightHand` mutation):
 *   - Phase must be `don_chooses_right_hand`.
 *   - Viewer's role must be `DON`.
 *   - Target's currently-visible role must be `MAFIA`.
 *   - Target must not be the host.
 *   - Target must be alive (defensive — Don's pick is the very first night).
 *   - No `MAFIA_RIGHT_HAND` may already exist in the game (single-shot rule).
 *
 * Visual hint of "who is now Right Hand" is implicit: as soon as the Don
 * promotes, the target's role row flips to `MAFIA_RIGHT_HAND`, which is
 * already mafia-team-visible via `getVisible`. No separate indicator needed.
 *
 * @param targetPlayerId The profileId of the tile being rendered. Pass `null`
 *                       for empty seats / host tile.
 * @param isTargetHost   Whether the tile being rendered is the host's tile.
 * @param isPlayerAlive  Whether the target is alive.
 */
export function useRightHandPromotion(
  targetPlayerId: string | null,
  isTargetHost: boolean,
  isPlayerAlive: boolean,
): RightHandPromotionResult {
  const { gameSessionState, viewerRole, playerRolesMap } = useGameRoom();

  const canShowPromoteButton = useMemo(() => {
    if (!targetPlayerId) return false;
    if (isTargetHost) return false;
    if (!isPlayerAlive) return false;
    if (gameSessionState?.gamePhase !== "don_chooses_right_hand") return false;
    if (viewerRole !== "DON") return false;

    const targetRole = playerRolesMap.get(targetPlayerId) ?? null;
    if (targetRole !== "MAFIA") return false;

    let alreadyHasRightHand = false;
    for (const role of playerRolesMap.values()) {
      if (role === "MAFIA_RIGHT_HAND") {
        alreadyHasRightHand = true;
        break;
      }
    }
    if (alreadyHasRightHand) return false;

    return true;
  }, [
    targetPlayerId,
    isTargetHost,
    isPlayerAlive,
    gameSessionState?.gamePhase,
    viewerRole,
    playerRolesMap,
  ]);

  return { canShowPromoteButton };
}
