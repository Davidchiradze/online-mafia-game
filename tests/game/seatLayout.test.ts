import { describe, it, expect } from "vitest";
import {
  gridPositionForSeat,
  type GridPosition,
} from "@/hooks/game/useSeatShuffleAnimation";

/**
 * CHARACTERIZATION TEST — the current seat-ring geometry (oracle gap G4,
 * docs/game-types-refactor-tasks.md §2). `gridPositionForSeat` is the single
 * hardcoded 4×4 grid the participant circle renders against today (Japanese,
 * 12-seat + host). Phase 4 (P4-T5) replaces this hardcoded function with a
 * variant-driven `seatLayout` (a 10-ring + host for Sports); pinning the exact
 * mapping here makes that change a visible diff instead of a silent one.
 *
 * These assertions are the CURRENT behavior, not a preference — do not change
 * them during a pure relocation of the function (imports-only per testing.md).
 */

// The full 4×4 ring, seat → cell, exactly as the function returns today.
const GRID: Record<number, GridPosition> = {
  1: { gridRow: 1, gridColumn: 3 },
  2: { gridRow: 1, gridColumn: 4 },
  3: { gridRow: 2, gridColumn: 4 },
  4: { gridRow: 3, gridColumn: 4 },
  5: { gridRow: 4, gridColumn: 4 },
  6: { gridRow: 4, gridColumn: 3 },
  7: { gridRow: 4, gridColumn: 2 },
  8: { gridRow: 4, gridColumn: 1 },
  9: { gridRow: 3, gridColumn: 1 },
  10: { gridRow: 2, gridColumn: 1 },
  11: { gridRow: 1, gridColumn: 1 },
  12: { gridRow: 1, gridColumn: 2 },
  13: { gridRow: 2, gridColumn: 2 },
};

describe("gridPositionForSeat — 12-seat grid (G4 oracle)", () => {
  it("maps every seat 1–13 to its fixed grid cell", () => {
    for (const [seat, cell] of Object.entries(GRID)) {
      expect(gridPositionForSeat(Number(seat))).toEqual(cell);
    }
  });

  it("places seat 1 top-center and walks the ring clockwise", () => {
    // Corners of the ring, to pin orientation (not just the raw table).
    expect(gridPositionForSeat(2)).toEqual({ gridRow: 1, gridColumn: 4 }); // top-right
    expect(gridPositionForSeat(5)).toEqual({ gridRow: 4, gridColumn: 4 }); // bottom-right
    expect(gridPositionForSeat(8)).toEqual({ gridRow: 4, gridColumn: 1 }); // bottom-left
    expect(gridPositionForSeat(11)).toEqual({ gridRow: 1, gridColumn: 1 }); // top-left
  });

  it("falls back to the bottom-right cell for an unknown seat", () => {
    for (const seat of [0, 14, 99, -1]) {
      expect(gridPositionForSeat(seat)).toEqual({ gridRow: 4, gridColumn: 4 });
    }
  });
});
