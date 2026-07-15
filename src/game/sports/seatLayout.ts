/**
 * Sports seat geometry — a 10-seat ring (docs/game-types.md §6, sports-mafia.md
 * §1). 10 players + the host, laid out on a 4-col × 3-row grid so there are no
 * phantom empty seats (the §6 bug a 12-ring would show for a 10-player game):
 *
 *     1  2  3  4        row 1 — top (4)
 *    10 [ host  ] 5     row 2 — sides (2) + center panel
 *     9  8  7  6        row 3 — bottom (4)
 *
 * Seats walk clockwise from the top-left. The host (seat 11 =
 * `maxPlayers + 1`) renders in the center panel (grid cols 2–3, row 2).
 *
 * NOTE: proportions (a 1-row-tall center panel vs Japanese's 2-row) want a
 * visual pass once Sports is creatable (Phase 5) — the mapping is correct, the
 * exact sizing is a QA-tunable detail.
 */

import type { GridPosition, SeatLayout } from "../core/types";

function positionForSeat(seatNumber: number): GridPosition {
  switch (seatNumber) {
    case 1:
      return { gridRow: 1, gridColumn: 1 };
    case 2:
      return { gridRow: 1, gridColumn: 2 };
    case 3:
      return { gridRow: 1, gridColumn: 3 };
    case 4:
      return { gridRow: 1, gridColumn: 4 };
    case 5:
      return { gridRow: 2, gridColumn: 4 };
    case 6:
      return { gridRow: 3, gridColumn: 4 };
    case 7:
      return { gridRow: 3, gridColumn: 3 };
    case 8:
      return { gridRow: 3, gridColumn: 2 };
    case 9:
      return { gridRow: 3, gridColumn: 1 };
    case 10:
      return { gridRow: 2, gridColumn: 1 };
    default:
      return { gridRow: 3, gridColumn: 4 };
  }
}

export const SPORTS_SEAT_LAYOUT: SeatLayout = {
  cols: 4,
  rows: 3,
  center: { colStart: 2, colEnd: 4, rowStart: 2, rowEnd: 3 },
  positionForSeat,
};
