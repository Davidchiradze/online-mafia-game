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
 * goes to the living mafia in the LOWEST-numbered seat. The Don's own seat does
 * not enter into it — there is no walk and no wrap-around.
 *
 * Seat order (not turn order, not database order) is what makes this
 * deterministic. The original rule ended in `find(role === "MAFIA")` over a
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

  // Succession is by seat, so only seated mafia can inherit. Lowest seat wins.
  const seated = livingMafia.filter(
    (p): p is T & { seatNumber: number } => p.seatNumber !== undefined,
  );
  if (seated.length === 0) return null;

  return seated.reduce((lowest, p) =>
    p.seatNumber < lowest.seatNumber ? p : lowest,
  );
}
