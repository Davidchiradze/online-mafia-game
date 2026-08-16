/**
 * Sports seat geometry — a 10-seat ring (docs/engine/variant-architecture.md §6, variants/sports/rules.md
 * §1). 10 players + the host, laid out on a 4-col × 3-row grid so there are no
 * phantom empty seats (the §6 bug a 12-ring would show for a 10-player game):
 *
 *     9  10  1  2       row 1 — top (4)
 *     8 [host][ctl] 3   row 2 — sides (2) + SPLIT center: host | controls
 *     7  6   5  4       row 3 — bottom (4)
 *
 * Seats walk clockwise from the top. The center row is SPLIT (unlike Japanese's
 * merged panel): the host video sits in cell (row 2, col 2) and the host
 * controls / voting sit in cell (row 2, col 3). The host is seat 11
 * (`maxPlayers + 1`), rendered in `hostPanel`.
 */

import type { GridPosition, SeatLayout } from "@/features/game-room/variants/core/types";

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
      return { gridRow: 3, gridColumn: 3 };
    case 6:
      return { gridRow: 3, gridColumn: 2 };
    case 7:
      return { gridRow: 3, gridColumn: 1 };
    case 8:
      return { gridRow: 2, gridColumn: 1 };
    case 9:
      return { gridRow: 1, gridColumn: 1 };
    case 10:
      return { gridRow: 1, gridColumn: 2 };
    default:
      return { gridRow: 3, gridColumn: 4 };
  }
}

export const SPORTS_SEAT_LAYOUT: SeatLayout = {
  cols: 4,
  rows: 3,
  center: { colStart: 2, colEnd: 4, rowStart: 2, rowEnd: 3 },
  // Split center: host in column 2, controls in column 3 (both row 2).
  hostPanel: { colStart: 2, colEnd: 3, rowStart: 2, rowEnd: 3 },
  controlsPanel: { colStart: 3, colEnd: 4, rowStart: 2, rowEnd: 3 },
  positionForSeat,
};
