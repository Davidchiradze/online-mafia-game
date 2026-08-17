/**
 * How a game ends.
 *
 * SILENT FAILURE MODE: `"no_contest"` is stored in the same column as a faction
 * win, and it is host-confirmable like one. Read it as "no winner" and the host
 * loses their Finish button on the single outcome nobody can play out of — the
 * room then sits open until an admin force-ends it, with no error anywhere.
 * The mirror case, `winner: null` with `isFinished`, is that force-end: already
 * over, nothing left to confirm.
 */

import { describe, expect, it } from "vitest";

import { endGameState } from "@/features/game-room/lib/endGame";

describe("endGameState", () => {
  it("leaves a live game alone", () => {
    expect(endGameState(null, false)).toBeNull();
    expect(endGameState(undefined, false)).toBeNull();
  });

  it("holds a decided win for the host to confirm", () => {
    expect(endGameState("mafia", false)).toEqual({
      kind: "pending",
      outcome: "mafia",
    });
  });

  it("holds a total mutual elimination the same way", () => {
    // THE trap: no faction won, but the game is just as over and the host still
    // has to commit it.
    expect(endGameState("no_contest", false)).toEqual({
      kind: "pending",
      outcome: "no_contest",
    });
  });

  it("reports a committed win as finished, outcome intact", () => {
    expect(endGameState("citizens", true)).toEqual({
      kind: "finished",
      outcome: "citizens",
    });
  });

  it("reports a force-end as finished with no outcome", () => {
    // An admin ended it: `isFinished` without a winner. There is nothing to
    // confirm, so this must not come back as pending.
    expect(endGameState(null, true)).toEqual({
      kind: "finished",
      outcome: null,
    });
  });

  it("lets the committed flag outrank the winner in every combination", () => {
    const outcomes = ["mafia", "yakuza", "citizens", "no_contest"] as const;
    for (const outcome of outcomes) {
      expect(endGameState(outcome, true)?.kind).toBe("finished");
      expect(endGameState(outcome, false)?.kind).toBe("pending");
    }
  });
});
