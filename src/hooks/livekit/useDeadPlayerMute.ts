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
 * When the game is finished (isGameFinished === true, from game_sessions.is_finished):
 * - All players have their cameras enabled (even dead players)
 * - Microphones remain disabled (to avoid chaos)
 *
 * This is enforced client-side and persists across reconnections since
 * the death state is stored in the database.
 *
 * @param room - The LiveKit Room instance
 * @param players - Array of game players (to find current user's alive status)
 * @param userId - The current user's ID
 * @param isGameFinished - Whether the game has finished (from gameSessionState.is_finished)
 * @param enabled - Whether to enable this behavior (default: true)
 */
export function useDeadPlayerMute(
  room: LiveKitRoom | null | undefined,
  players: Tables<"game_players">[],
  userId: string,
  isGameFinished?: boolean,
  enabled: boolean = true
) {
  // Track previous state to avoid redundant updates
  const prevStateRef = useRef<{ isDead: boolean; isFinished: boolean } | null>(
    null
  );

  useEffect(() => {
    if (!room || !enabled) return;

    // Find current user's player record
    const myPlayer = players.find((p) => p.player_id === userId);

    // If no player record found, do nothing (player might not have joined yet)
    if (!myPlayer) return;

    // Check if player is dead and if game is finished
    const isDead = myPlayer.is_alive === false;
    const isFinished = Boolean(isGameFinished);

    // Avoid redundant updates
    const prevState = prevStateRef.current;
    if (
      prevState &&
      prevState.isDead === isDead &&
      prevState.isFinished === isFinished
    ) {
      return;
    }
    prevStateRef.current = { isDead, isFinished };

    // When game is finished, enable camera for everyone (reveal phase)
    if (isFinished) {
      void room.localParticipant.setCameraEnabled(true);
      // Keep microphone disabled to avoid chaos
      void room.localParticipant.setMicrophoneEnabled(false);
      return;
    }

    // Normal game logic: dead players have camera and mic disabled
    if (isDead) {
      void room.localParticipant.setMicrophoneEnabled(false);
      void room.localParticipant.setCameraEnabled(false);
    }
  }, [room, players, userId, isGameFinished, enabled]);
}
