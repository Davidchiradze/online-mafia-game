"use client";

import { useEffect, useRef } from "react";
import { Room as LiveKitRoom } from "livekit-client";
import type { Tables } from "@/db/supabase/database.types";

/**
 * Hook that automatically disables microphone and camera for dead players.
 *
 * Once a player is dead (is_alive === false), they:
 * - Cannot speak (microphone disabled)
 * - Cannot show video (camera disabled)
 *
 * This is enforced client-side and persists across reconnections since
 * the death state is stored in the database.
 *
 * @param room - The LiveKit Room instance
 * @param players - Array of game players (to find current user's alive status)
 * @param userId - The current user's ID
 * @param enabled - Whether to enable this behavior (default: true)
 */
export function useDeadPlayerMute(
  room: LiveKitRoom | null | undefined,
  players: Tables<"game_players">[],
  userId: string,
  enabled: boolean = true
) {
  // Track previous dead state to avoid redundant updates
  const prevIsDeadRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!room || !enabled) return;

    // Find current user's player record
    const myPlayer = players.find((p) => p.player_id === userId);

    // If no player record found, do nothing (player might not have joined yet)
    if (!myPlayer) return;

    // Check if player is dead
    const isDead = myPlayer.is_alive === false;

    // Avoid redundant updates
    if (prevIsDeadRef.current === isDead) return;
    prevIsDeadRef.current = isDead;
    if (isDead) {
      // Dead player: disable both microphone and camera
      void room.localParticipant.setMicrophoneEnabled(false);
      void room.localParticipant.setCameraEnabled(false);
    } else {
      void room.localParticipant.setMicrophoneEnabled(true);
      void room.localParticipant.setCameraEnabled(true);
    }
    // Note: We don't re-enable on "resurrection" since death is permanent
    // If a player was dead and is now somehow alive (shouldn't happen),
    // they would need to manually enable their devices
  }, [room, players, userId, enabled]);
}
