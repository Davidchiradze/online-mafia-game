"use client";

import { useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { cardPicking } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Thin wrapper around the cardPicking Convex API.
 *
 * Returns:
 *   - state: reactive `getState` payload (or `null` if no session yet,
 *            `undefined` while the query is loading).
 *   - pickCard: bound mutation; throws on server-side errors.
 */
export function useCardPicking(gameId: Id<"games">) {
  const state = useQuery(cardPicking.getState, { gameId });
  const pickMutation = useMutation(cardPicking.pickCard);

  const pickCard = useCallback(
    (cardId: string) => pickMutation({ gameId, cardId }),
    [pickMutation, gameId],
  );

  return { state, pickCard } as const;
}
