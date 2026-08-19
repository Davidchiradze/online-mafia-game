/**
 * Serial Killer seat geometry — Japanese's 4×4 ring, one seat short
 * (docs/variants/serial_killer/rules.md §10.1).
 *
 * Eleven players walk the same ring cells Japanese uses for seats 1–11; the
 * cell Japanese gives seat 12 (row 1, col 2) is simply left empty. Reusing the
 * exact cells rather than re-deriving an 11-point ring keeps the room visually
 * identical to Japanese for anyone who plays both.
 *
 *     ·   12   1   2      row 1 — seat 12's cell is empty
 *    11  [ host + ctl ]   rows 2–3 centre: merged host panel
 *    10  [           ]  3
 *     9   8   7   6   4   (row 4 bottom, seat 5 at col 4 row 4)
 *
 * `positionForSeat(12)` returns the CENTRE cell, because the host is seat
 * `maxPlayers + 1` = 12 here. Sports fails to handle its own host seat and
 * silently stacks it on a player tile; this returns the centre so the host
 * lands where the merged panel already is.
 */

import type {
  GridPosition,
  SeatLayout,
} from "@/features/game-room/variants/core/types";

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
    // The host (seat maxPlayers + 1 = 12) sits in the centre panel, NOT on the
    // ring — Japanese's seat-12 cell stays empty in this variant.
    case 12:
      return { gridRow: 2, gridColumn: 2 };
    default:
      return { gridRow: 4, gridColumn: 4 };
  }
}

export const SERIAL_KILLER_SEAT_LAYOUT: SeatLayout = {
  cols: 4,
  rows: 4,
  center: { colStart: 2, colEnd: 4, rowStart: 2, rowEnd: 4 },
  positionForSeat,
};
