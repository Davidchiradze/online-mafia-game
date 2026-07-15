/**
 * Japanese seat geometry — the current 4×4 ring (docs/game-types.md §6).
 *
 * The `positionForSeat` mapping is moved verbatim from the old hardcoded switch
 * in `useSeatShuffleAnimation`; only its home changed (imports-only, pinned by
 * tests/game/seatLayout.test.ts). 12 seats walk the ring clockwise around the
 * center host+controls panel (grid cols 2–3, rows 2–3).
 */

import type { GridPosition, SeatLayout } from "../core/types";

function positionForSeat(seatNumber: number): GridPosition {
  switch (seatNumber) {
    case 1:
      return { gridRow: 1, gridColumn: 3 };
    case 2:
      return { gridRow: 1, gridColumn: 4 };
    case 3:
      return { gridRow: 2, gridColumn: 4 };
    case 4:
      return { gridRow: 3, gridColumn: 4 };
    case 5:
      return { gridRow: 4, gridColumn: 4 };
    case 6:
      return { gridRow: 4, gridColumn: 3 };
    case 7:
      return { gridRow: 4, gridColumn: 2 };
    case 8:
      return { gridRow: 4, gridColumn: 1 };
    case 9:
      return { gridRow: 3, gridColumn: 1 };
    case 10:
      return { gridRow: 2, gridColumn: 1 };
    case 11:
      return { gridRow: 1, gridColumn: 1 };
    case 12:
      return { gridRow: 1, gridColumn: 2 };
    case 13:
      return { gridRow: 2, gridColumn: 2 };
    default:
      return { gridRow: 4, gridColumn: 4 };
  }
}

export const JAPANESE_SEAT_LAYOUT: SeatLayout = {
  cols: 4,
  rows: 4,
  center: { colStart: 2, colEnd: 4, rowStart: 2, rowEnd: 4 },
  positionForSeat,
};
