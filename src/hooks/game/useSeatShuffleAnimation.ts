"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import type { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import type { GridPosition } from "@/game/core/types";

type GamePlayer = ReturnType<typeof useGameRoom>["players"][number];

export type { GridPosition };

export type SeatShuffleResult = {
  seatedPlayers: GamePlayer[];
  occupiedSeats: Set<number>;
  trackByPlayerId: Map<string, TrackReferenceOrPlaceholder>;
  hostTrack: TrackReferenceOrPlaceholder | undefined;
  arcLiftByPlayer: Record<string, number>;
};

const ARC_CLEAR_DELAY_MS = 1800;

/**
 * Manages identity-keyed seat data and Start Game shuffle arc animation.
 *
 * Tracks previous seat assignments for each player. When a game session
 * first appears (Start Game), computes per-player arc lift values based
 * on grid distance moved. The arc values auto-clear after the animation
 * window so subsequent renders are static.
 */
export function useSeatShuffleAnimation({
  players,
  tracks,
  hostUserId,
  maxPlayers,
  gameSessionId,
  gridPositionForSeat,
}: {
  players: GamePlayer[];
  tracks: TrackReferenceOrPlaceholder[];
  hostUserId: string | null;
  maxPlayers: number;
  gameSessionId: string | null;
  /** Ring geometry from the resolved variant's `seatLayout` (arc-distance math). */
  gridPositionForSeat: (seatNumber: number) => GridPosition;
}): SeatShuffleResult {
  const seatedPlayers = useMemo(
    () =>
      players.filter(
        (player) =>
          typeof player.seatNumber === "number" &&
          player.seatNumber >= 1 &&
          player.seatNumber <= maxPlayers,
      ),
    [players, maxPlayers],
  );

  const occupiedSeats = useMemo(() => {
    const set = new Set<number>();
    for (const player of seatedPlayers) {
      if (typeof player.seatNumber === "number") {
        set.add(player.seatNumber);
      }
    }
    return set;
  }, [seatedPlayers]);

  const trackByPlayerId = useMemo(() => {
    const map = new Map<string, TrackReferenceOrPlaceholder>();
    for (const track of tracks) {
      const identity = track?.participant?.identity;
      if (!identity || identity === hostUserId) continue;
      map.set(identity, track);
    }
    return map;
  }, [tracks, hostUserId]);

  const hostTrack = useMemo(
    () => tracks.find((t) => t.participant.identity === hostUserId),
    [tracks, hostUserId],
  );

  const previousSeatsRef = useRef(new Map<string, number>());
  const previousSessionRef = useRef<string | null>(null);
  const clearArcTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [arcLiftByPlayer, setArcLiftByPlayer] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    const currentSeatMap = new Map<string, number>();
    for (const player of seatedPlayers) {
      const playerId = String(player.playerId);
      if (typeof player.seatNumber === "number") {
        currentSeatMap.set(playerId, player.seatNumber);
      }
    }

    const previousSeats = previousSeatsRef.current;
    const movedPlayers: Record<string, number> = {};

    for (const [playerId, currentSeat] of currentSeatMap.entries()) {
      const previousSeat = previousSeats.get(playerId);
      if (previousSeat === undefined || previousSeat === currentSeat) continue;

      const from = gridPositionForSeat(previousSeat);
      const to = gridPositionForSeat(currentSeat);
      const dx = to.gridColumn - from.gridColumn;
      const dy = to.gridRow - from.gridRow;
      const distance = Math.sqrt(dx * dx + dy * dy);
      movedPlayers[playerId] = Math.max(34, Math.round(24 + distance * 20));
    }

    const gameStartedNow =
      previousSessionRef.current === null && gameSessionId !== null;

    if (gameStartedNow && Object.keys(movedPlayers).length > 0) {
      setArcLiftByPlayer(movedPlayers);
      if (clearArcTimeoutRef.current) {
        clearTimeout(clearArcTimeoutRef.current);
      }
      clearArcTimeoutRef.current = setTimeout(() => {
        setArcLiftByPlayer({});
      }, ARC_CLEAR_DELAY_MS);
    }

    previousSeatsRef.current = currentSeatMap;
    previousSessionRef.current = gameSessionId;
  }, [gameSessionId, seatedPlayers, gridPositionForSeat]);

  useEffect(() => {
    return () => {
      if (clearArcTimeoutRef.current) {
        clearTimeout(clearArcTimeoutRef.current);
        clearArcTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    seatedPlayers,
    occupiedSeats,
    trackByPlayerId,
    hostTrack,
    arcLiftByPlayer,
  };
}
