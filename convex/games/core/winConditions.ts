/**
 * Shared, cross-variant win vocabulary + presentation.
 *
 * This module holds only what every variant shares: the win-decision types
 * (`WinContext`, `Winner`, `GameOutcome`, `WinMethod`) and the generic
 * `winMethodLabel` formatter. The per-variant decision tables live in the game
 * definitions — Japanese in `convex/games/japanese/winConditions.ts`, Sports in
 * `convex/games/sports/winConditions.ts` — and are dispatched via
 * `getGameDefinition(gameType)`.
 */

export type WinContext = "beforeNight" | "beforeDay";
export type Winner = "mafia" | "yakuza" | "citizens" | "serial_killer";
/**
 * A finished-game outcome: a faction win, or a `"no_contest"` — a total mutual
 * elimination where no player is left alive (e.g. the last survivors all voted
 * to leave in a "both leave" vote). A no-contest is not a faction win: it is
 * logged with `winner: null` and applies no ELO change — the same terminal
 * outcome as an admin force-end.
 */
export type GameOutcome = Winner | "no_contest";

/**
 * Structured snapshot of the endgame state at the moment a winner is decided.
 * The human label is derived separately via `winMethodLabel` — not stored.
 */
export type WinMethod = {
  faction: Winner;
  aliveTotal: number; // N
  mafiaAlive: number; // m
  yakuzaAlive: boolean;
  shogunAlive: boolean;
  decidedRole?: string; // headline role, e.g. "SHOGUN" in a 1v1
};

/**
 * Derive a human-readable label for a win method, e.g. "Shogun in 1vs1",
 * "Mafia in 2vs2", "Citizens in 3vs0". Pure — safe to call from the UI later.
 *
 * The matchup is always *winning clan alive* vs *everyone else alive*. The only
 * per-faction difference is how many survivors make up the winning clan:
 *   - mafia:  the alive mafia team
 *   - yakuza: only the surviving Yakuza + Shogun
 *   - serial_killer: always exactly 1 — the faction is one player, and a win
 *     requires them alive, so this needs no extra snapshot field
 *   - citizens: a sweep, so every survivor is town
 */
export function winMethodLabel(method: WinMethod): string {
  const { faction, aliveTotal, mafiaAlive, yakuzaAlive, shogunAlive } = method;

  const clanAlive =
    faction === "mafia"
      ? mafiaAlive
      : faction === "yakuza"
        ? (yakuzaAlive ? 1 : 0) + (shogunAlive ? 1 : 0)
        : faction === "serial_killer"
          ? 1
          : aliveTotal;

  return `${clanAlive}vs${aliveTotal - clanAlive}`;
}
