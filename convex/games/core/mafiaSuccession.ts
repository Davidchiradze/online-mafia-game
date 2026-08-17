/**
 * Who holds the mafia's single kill authority — the ONE implementation.
 *
 * Pure (no `ctx.db`, no React) so both sides of the wire share it rather than
 * mirroring it: `games/core/nightPhase.ts` enforces it on the server, and
 * `src/features/game-room/variants/japanese/nightAuthority.ts` uses the same
 * function to decide whether to enable the kill button. Two copies of a
 * succession rule drift, and when they drift the button lights up for a player
 * the server then rejects.
 *
 * THE RULE. The Don kills while the Don lives. Once the Don is gone, authority
 * passes clockwise around the table: the living mafia in the next seat AFTER the
 * Don's, wrapping past the highest seat back to seat 1.
 *
 * The Don's seat is therefore needed even though the Don is dead — that is why
 * this takes EVERY player and filters internally, rather than taking a
 * pre-filtered living list.
 *
 * Seat order (not turn order, not database order) is what makes this
 * deterministic. The previous rule ended in `find(role === "MAFIA")` over a
 * `by_gameId` query, so with two living MAFIA the holder was whichever row the
 * index happened to return first.
 */

import { MAFIA_TEAM_ROLES } from "../../lib/constants";

const MAFIA_ROLE_SET: ReadonlySet<string> = new Set(MAFIA_TEAM_ROLES);

/**
 * One seat at the table, as the succession rule needs it.
 *
 * `seatNumber` is optional because `gamePlayers.seatNumber` is — a player can be
 * in the room without being seated. An unseated player is not part of the walk.
 */
export type SuccessionPlayer = {
  role: string | null;
  seatNumber?: number;
  isAlive: boolean;
};

/**
 * The living mafia who may pick tonight's kill, or `null` if the mafia are wiped
 * out.
 *
 * Generic over the caller's player shape so each side keeps its own extra
 * fields (`playerId` on the server, the room's participant on the client) and
 * gets the same object back rather than a copy.
 */
export function mafiaKillAuthority<T extends SuccessionPlayer>(
  players: readonly T[],
): T | null {
  const livingMafia = players.filter(
    (p) => p.isAlive && p.role !== null && MAFIA_ROLE_SET.has(p.role),
  );
  if (livingMafia.length === 0) return null;

  // The Don keeps authority for as long as the Don is alive — seated or not,
  // since no walk is needed to find them.
  const livingDon = livingMafia.find((p) => p.role === "DON");
  if (livingDon) return livingDon;

  // Succession is by seat, so only seated mafia can inherit.
  const bySeat = livingMafia
    .filter((p): p is T & { seatNumber: number } => p.seatNumber !== undefined)
    .sort((a, b) => a.seatNumber - b.seatNumber);
  if (bySeat.length === 0) return null;

  // Read the Don's seat from ALL players — by now the Don is dead.
  const donSeat = players.find((p) => p.role === "DON")?.seatNumber;

  // An unseated or missing Don is not reachable in a dealt game; fall back to
  // the lowest living mafia seat rather than leaving the team unable to act.
  if (donSeat === undefined) return bySeat[0];

  return bySeat.find((p) => p.seatNumber > donSeat) ?? bySeat[0];
}
