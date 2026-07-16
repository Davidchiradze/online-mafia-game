import { describe, it, expect } from "vitest";
import { JAPANESE_SEAT_LAYOUT } from "@/game/japanese/seatLayout";
import { SPORTS_SEAT_LAYOUT } from "@/game/sports/seatLayout";
import type { GridPosition } from "@/game/core/types";

/**
 * CHARACTERIZATION TEST — the participant-circle ring geometry (oracle gap G4,
 * extended in P4-T5). The Japanese 12-ring assertions are UNCHANGED from when
 * `gridPositionForSeat` was a hardcoded switch in `useSeatShuffleAnimation` —
 * P4-T5 only moved it into `JAPANESE_SEAT_LAYOUT.positionForSeat` (imports-only,
 * same values). The Sports block pins the NEW 10-ring, so the variant geometry
 * is a visible, tested diff (docs/game-types.md §6).
 */

// ---------------------------------------------------------------------------
// Japanese — the 4×4, 12-seat ring (values unchanged from the old switch).
// ---------------------------------------------------------------------------

const JAPANESE_GRID: Record<number, GridPosition> = {
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

describe("JAPANESE_SEAT_LAYOUT — 12-seat grid (G4 oracle, unchanged)", () => {
  const { positionForSeat } = JAPANESE_SEAT_LAYOUT;

  it("is a 4×4 grid with the center host+controls panel at cols 2–3, rows 2–3", () => {
    expect(JAPANESE_SEAT_LAYOUT.cols).toBe(4);
    expect(JAPANESE_SEAT_LAYOUT.rows).toBe(4);
    expect(JAPANESE_SEAT_LAYOUT.center).toEqual({
      colStart: 2,
      colEnd: 4,
      rowStart: 2,
      rowEnd: 4,
    });
  });

  it("maps every seat 1–13 to its fixed grid cell", () => {
    for (const [seat, cell] of Object.entries(JAPANESE_GRID)) {
      expect(positionForSeat(Number(seat))).toEqual(cell);
    }
  });

  it("places seat 1 top-center and walks the ring clockwise", () => {
    expect(positionForSeat(2)).toEqual({ gridRow: 1, gridColumn: 4 }); // top-right
    expect(positionForSeat(5)).toEqual({ gridRow: 4, gridColumn: 4 }); // bottom-right
    expect(positionForSeat(8)).toEqual({ gridRow: 4, gridColumn: 1 }); // bottom-left
    expect(positionForSeat(11)).toEqual({ gridRow: 1, gridColumn: 1 }); // top-left
  });

  it("falls back to the bottom-right cell for an unknown seat", () => {
    for (const seat of [0, 14, 99, -1]) {
      expect(positionForSeat(seat)).toEqual({ gridRow: 4, gridColumn: 4 });
    }
  });
});

// ---------------------------------------------------------------------------
// Sports — the new 4×3, 10-seat ring (top 4, sides 2, bottom 4).
// ---------------------------------------------------------------------------

const SPORTS_GRID: Record<number, GridPosition> = {
  1: { gridRow: 1, gridColumn: 3 },
  2: { gridRow: 1, gridColumn: 4 },
  3: { gridRow: 2, gridColumn: 4 },
  4: { gridRow: 3, gridColumn: 4 },
  5: { gridRow: 3, gridColumn: 3 },
  6: { gridRow: 3, gridColumn: 2 },
  7: { gridRow: 3, gridColumn: 1 },
  8: { gridRow: 2, gridColumn: 1 },
  9: { gridRow: 1, gridColumn: 1 },
  10: { gridRow: 1, gridColumn: 2 },
};

describe("SPORTS_SEAT_LAYOUT — 10-seat grid (P4-T5)", () => {
  const { positionForSeat } = SPORTS_SEAT_LAYOUT;

  it("is a 4×3 grid with a SPLIT center: host col 2, controls col 3 (row 2)", () => {
    expect(SPORTS_SEAT_LAYOUT.cols).toBe(4);
    expect(SPORTS_SEAT_LAYOUT.rows).toBe(3);
    expect(SPORTS_SEAT_LAYOUT.hostPanel).toEqual({
      colStart: 2,
      colEnd: 3,
      rowStart: 2,
      rowEnd: 3,
    });
    expect(SPORTS_SEAT_LAYOUT.controlsPanel).toEqual({
      colStart: 3,
      colEnd: 4,
      rowStart: 2,
      rowEnd: 3,
    });
  });

  it("maps every seat 1–10 to its ring cell (top 4, sides, bottom 4)", () => {
    for (const [seat, cell] of Object.entries(SPORTS_GRID)) {
      expect(positionForSeat(Number(seat))).toEqual(cell);
    }
  });

  it("leaves the split-center cells (2,2) and (2,3) free of seats", () => {
    const seatCells = new Set(
      Object.values(SPORTS_GRID).map((c) => `${String(c.gridRow)},${String(c.gridColumn)}`),
    );
    expect(seatCells.has("2,2")).toBe(false); // host cell
    expect(seatCells.has("2,3")).toBe(false); // controls cell
  });

  it("keeps all 10 seats within the 4×3 grid (no phantom row-4 cells)", () => {
    for (let seat = 1; seat <= 10; seat++) {
      const { gridRow, gridColumn } = positionForSeat(seat);
      expect(gridRow).toBeGreaterThanOrEqual(1);
      expect(gridRow).toBeLessThanOrEqual(3);
      expect(gridColumn).toBeGreaterThanOrEqual(1);
      expect(gridColumn).toBeLessThanOrEqual(4);
    }
  });

  it("uses 10 distinct cells (no two seats overlap)", () => {
    const seen = new Set<string>();
    for (let seat = 1; seat <= 10; seat++) {
      const { gridRow, gridColumn } = positionForSeat(seat);
      seen.add(`${String(gridRow)},${String(gridColumn)}`);
    }
    expect(seen.size).toBe(10);
  });
});
