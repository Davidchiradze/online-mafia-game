/**
 * Serial Killer Mafia win conditions
 * (docs/variants/serial_killer/win-conditions.md §6).
 *
 * This is a DECLARED table, not a simulation. Where a plausible reading of the
 * night mechanics disagrees with §5's lookup, §5 wins.
 *
 * The variant's whole difficulty is one fact: the Serial Killer's single shot is
 * spent or it is not, and two IDENTICAL alive rosters resolve differently
 * because of it. Every other rule in this engine is a function of who is alive.
 * That is why `describeWin` takes a third argument at all — see
 * `WinStateContext`.
 */

import type {
  Outcome,
  Role,
  WinContext,
  WinMethod,
  WinStateContext,
} from "../core/types";

const MAFIA_ROLES: ReadonlySet<string> = new Set(["DON", "MAFIA"]);

/** The Serial Killer's standing, which the alive roster alone cannot express. */
type ShotState = "dead" | "holding" | "spent";

/**
 * A position, reduced to the four numbers the rules actually read.
 *
 * `town` counts every living non-mafia, non-Serial-Killer player INCLUDING the
 * Doctor, so `doctor === true` implies `town >= 1`.
 */
type Position = {
  mafia: number;
  shot: ShotState;
  doctor: boolean;
  town: number;
};

const alive = (p: Position) =>
  p.mafia + (p.shot === "dead" ? 0 : 1) + p.town;

/**
 * The declared outcome for a position, or `null` to continue.
 *
 * Priority order is load-bearing and three orderings in particular
 * (docs/variants/serial_killer/win-conditions.md §6):
 *
 * - **Serial Killer before the parity check.** At two alive with one mafia and
 *   a living Serial Killer both rules match; the Serial Killer takes it, empty
 *   gun or not.
 * - **The citizens' sweep requires the Serial Killer DEAD.** Otherwise they
 *   claim every `mafia === 0` position and the Serial Killer's whole win
 *   condition disappears.
 * - **Parity before the lookahead.** Looking a night ahead is only meaningful
 *   at a parity position; above it the game simply continues.
 */
function decide(p: Position): Outcome | null {
  const n = alive(p);

  // 1. Total mutual elimination.
  if (n === 0) return "no_contest";

  // 2. Every 1-on-1 involving the Serial Killer is theirs (§5.1).
  if (p.shot !== "dead" && n <= 2) return "serial_killer";

  // 3. Town sweep — only once the Serial Killer is also gone.
  if (p.shot === "dead" && p.mafia === 0) return "citizens";

  // 4. Mafia sweep.
  if (p.mafia === n) return "mafia";

  // 5. Ceiling: nothing is decided above six players (§5.6), exactly as in
  //    Japanese. A sweep is the only way out, and both are handled above.
  if (n > 6) return null;

  // 6. Not parity → the mafia cannot close it out.
  if (2 * p.mafia < n) return null;

  // 7. Parity with no bullet left: nothing can change the count in the
  //    non-mafia side's favour, so it ends here.
  if (p.shot !== "holding") return "mafia";

  // 8. Parity with the shot still live. Look ONE night ahead: the Serial Killer
  //    spends it on a mafia, and the mafia kill someone. If every position that
  //    can result is still a mafia win, the shot changes nothing and the game is
  //    already over. Otherwise some line saves the others, so play continues.
  //
  //    Terminates trivially: every branch moves the Serial Killer out of
  //    "holding", and only "holding" reaches this step, so the depth is 1.
  const nonDoctorTown = p.town - (p.doctor ? 1 : 0);
  const tomorrow: Position[] = [];

  // The mafia kill an ordinary townsperson; the Serial Killer's shot lands.
  if (nonDoctorTown >= 1) {
    tomorrow.push({
      mafia: p.mafia - 1,
      shot: "spent",
      doctor: p.doctor,
      town: p.town - 1,
    });
  }
  // The mafia kill the Doctor.
  if (p.doctor) {
    tomorrow.push({
      mafia: p.mafia - 1,
      shot: "spent",
      doctor: false,
      town: p.town - 1,
    });
  }
  // The Doctor saves the mafia's target — one death tonight instead of two.
  // This is the ONLY branch that can break parity, and the only reason the
  // Doctor appears in this rule at all (§5.5).
  if (p.doctor) {
    tomorrow.push({
      mafia: p.mafia - 1,
      shot: "spent",
      doctor: p.doctor,
      town: p.town,
    });
  }
  // The mafia kill the Serial Killer. Modelled as costing the mafia nobody,
  // which is §6's literal form and the reading most generous to them (an
  // argument says the shot still lands, so `mafia - 1`). It does not matter:
  // both readings were evaluated over all 180 reachable positions and agree on
  // every one, so the choice is presentation, not rules.
  tomorrow.push({
    mafia: p.mafia,
    shot: "dead",
    doctor: p.doctor,
    town: p.town,
  });

  return tomorrow.every((next) => decide(next) === "mafia") ? "mafia" : null;
}

/**
 * Structured endgame snapshot for Serial Killer Mafia.
 *
 * `yakuzaAlive` / `shogunAlive` are always false — there is no Yakuza clan. A
 * Serial Killer win needs no extra snapshot field: their faction is one player
 * and winning requires them alive, so `winMethodLabel` reads a clan size of 1
 * and renders `1vs1` / `1vs0` correctly.
 *
 * `context` is unused: this variant's rules are boundary-independent, like
 * Sports'. The parameter stays for interface compatibility.
 *
 * `state` absent is read as "the shot is still live" — the position a game
 * starts in, and the answer that continues play rather than ending it early.
 */
export function describeSerialKillerWin(
  aliveRoles: Role[],
  _context: WinContext,
  state?: WinStateContext,
): WinMethod | "no_contest" | null {
  const n = aliveRoles.length;
  if (n === 0) return "no_contest";

  const mafia = aliveRoles.filter((r) => MAFIA_ROLES.has(r)).length;
  const skAlive = aliveRoles.includes("SERIAL_KILLER");
  const doctor = aliveRoles.includes("DOCTOR");

  const outcome = decide({
    mafia,
    shot: !skAlive
      ? "dead"
      : (state?.serialKillerHasShot ?? true)
        ? "holding"
        : "spent",
    doctor,
    town: n - mafia - (skAlive ? 1 : 0),
  });

  if (outcome === null || outcome === "no_contest") return outcome;

  return {
    faction: outcome,
    aliveTotal: n,
    mafiaAlive: mafia,
    yakuzaAlive: false,
    shogunAlive: false,
    ...(outcome === "serial_killer" ? { decidedRole: "SERIAL_KILLER" } : {}),
  };
}

/** The faction-only convenience. Delegates, so the two cannot drift. */
export function decideSerialKillerWinner(
  aliveRoles: Role[],
  context: WinContext,
  state?: WinStateContext,
): Outcome | null {
  const result = describeSerialKillerWin(aliveRoles, context, state);
  if (result === null || result === "no_contest") return result;
  return result.faction;
}
