"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { gamePlayers } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Ready state for the local participant, backed by the `gamePlayers.isReady`
 * column in Convex. The mutation acts on the authenticated user's own player
 * record, so only the local participant can toggle their own ready flag.
 *
 * `isReady` is read from the player document (passed in) so it stays in sync
 * with the reactive Convex query — no LiveKit metadata involved.
 */
export function useParticipantReady(gameId: string, isReady: boolean) {
  const [isLoading, setIsLoading] = useState(false);
  const setReady = useMutation(gamePlayers.setReady);

  const setReadyState = useCallback(
    async (ready: boolean) => {
      if (!gameId) return;
      try {
        setIsLoading(true);
        await setReady({ gameId: gameId as Id<"games">, ready });
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [gameId, setReady],
  );

  const markReady = useCallback(() => setReadyState(true), [setReadyState]);
  const markUnready = useCallback(() => setReadyState(false), [setReadyState]);

  const toggleReady = useCallback(async () => {
    if (isLoading) return;
    await setReadyState(!isReady);
  }, [isReady, isLoading, setReadyState]);

  return { isReady, markReady, markUnready, toggleReady, isLoading } as const;
}
