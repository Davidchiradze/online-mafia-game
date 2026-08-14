/**
 * How a game ends, from the two fields that record it.
 *
 * SILENT FAILURE MODE: `"no_contest"` is a WINNER. Total mutual elimination —
 * nobody left alive — is stored in the same column as a faction win
 * (`gameSessions.winner`) precisely so it pauses on the end screen like one and
 * waits for the host to confirm. Treat it as "no winner" and the host loses
 * their Finish button on the one outcome nobody can play out of, and the room
 * sits there until an admin force-ends it.
 *
 * The mirror-image trap is `winner: null` WITH `isFinished`: that is an admin
 * force-end, already over, nothing left to confirm. So neither field decides
 * alone — `isFinished` says whether the end has been committed, `winner` says
 * what the end was, and only the pair distinguishes the three screens.
 */

export type EndGameOutcome = "mafia" | "yakuza" | "citizens" | "no_contest";

export type EndGameState =
  /** Decided, not yet committed: the host still has to confirm the end. */
  | { kind: "pending"; outcome: EndGameOutcome }
  /** Committed. A null outcome is a force-end, which recorded no winner. */
  | { kind: "finished"; outcome: EndGameOutcome | null };

/**
 * `null` while the game is still being played — the caller keeps rendering
 * phase controls. Anything else means the centre cell belongs to the end
 * screen, whatever `gamePhase` still says.
 */
export function endGameState(
  winner: EndGameOutcome | null | undefined,
  isFinished: boolean,
): EndGameState | null {
  if (isFinished) return { kind: "finished", outcome: winner ?? null };
  if (winner) return { kind: "pending", outcome: winner };
  return null;
}
