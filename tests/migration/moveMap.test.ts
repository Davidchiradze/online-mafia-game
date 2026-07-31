/**
 * TEMPORARY — delete after the folder migration completes.
 * (Tracked in `docs/folder-migration-progress.md` → Post-migration cleanup.)
 *
 * The migration's central claim is **zero behavior change**. This test is the
 * mechanical proof for the backend half of that claim.
 *
 * It holds the function inventory frozen at tag `pre-folder-migration` and
 * asserts that the LIVE inventory equals the frozen one with the declared module
 * moves applied. Nothing else may differ — not a function name, not a kind, not
 * a visibility, not an arg or return validator.
 *
 * HOW TO USE
 * ----------
 * When a commit moves a Convex module, add one line to `MODULE_MOVES`:
 *
 *     "game/voting": "games/core/voting",
 *
 * Then re-run. Green means: every function that existed before still exists,
 * at its new path, with a byte-identical signature. Red means the move dropped,
 * renamed, or altered something — which is exactly the failure this migration
 * must not ship.
 *
 * A rename that is NOT a pure move (e.g. `game/sportsNightPhase` →
 * `games/sports/nightPhase`) is still just a module-path change, so it belongs
 * here too.
 */

import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { inventoryLine, loadConvexFunctions } from "../support/convexModules";
import { routeManifestText } from "../support/routeManifest";

const REPO_ROOT = new URL("../../", import.meta.url).pathname;

/**
 * Declared module-path moves: OLD module path → NEW module path.
 * Empty at the start of the migration; one entry per moved Convex module.
 */
const MODULE_MOVES: Record<string, string> = {
  // ── Phase 1, Commit B (convex/game/* → convex/games/*) ──
  "game/bestMove": "games/core/bestMove",
  "game/broadcasts": "games/core/broadcasts",
  "game/cardPicking": "games/core/cardPicking",
  "game/dayPhase": "games/core/dayPhase",
  "game/farewellSpeech": "games/core/farewellSpeech",
  "game/gameLogs": "games/core/gameLogs",
  "game/leaderboard": "games/core/leaderboard",
  "game/nightPhase": "games/core/nightPhase",
  "game/players": "games/core/players",
  "game/roles": "games/core/roles",
  "game/sessions": "games/core/sessions",
  "game/spectators": "games/core/spectators",
  "game/voting": "games/core/voting",
  "game/webhookHandler": "games/core/webhookHandler",
  "game/sportsNightPhase": "games/sports/nightPhase",
};

/** Rewrite the module half of a `module/path:export` id. */
function applyMoves(id: string): string {
  const idx = id.lastIndexOf(":");
  const modulePath = id.slice(0, idx);
  const exportName = id.slice(idx + 1);
  const moved = MODULE_MOVES[modulePath] ?? modulePath;
  return `${moved}:${exportName}`;
}

function parseInventory(text: string) {
  return text
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((line) => {
      const [kind, visibility, id, argsHash, returnsHash] = line
        .split("|")
        .map((s) => s.trim());
      return { kind, visibility, id, argsHash, returnsHash };
    });
}

it("preserves every Convex function across the declared module moves", async () => {
  const frozen = parseInventory(
    readFileSync(`${REPO_ROOT}tests/migration/baseline.frozen.txt`, "utf8"),
  );

  const expected = frozen
    .map((f) =>
      [f.kind, f.visibility, applyMoves(f.id), f.argsHash, f.returnsHash].join(" | "),
    )
    .sort();

  const { functions } = await loadConvexFunctions();
  const actual = functions.map(inventoryLine).sort();

  // Report the two directions separately — "a function disappeared" and "a
  // function appeared" are different bugs and the distinction matters at 3am.
  const lost = expected.filter((l) => !actual.includes(l));
  const gained = actual.filter((l) => !expected.includes(l));

  expect(
    { lost, gained },
    "the live Convex function set diverged from the frozen baseline. `lost` = " +
      "functions that vanished or changed signature (add the module to MODULE_MOVES " +
      "if this was an intentional move). `gained` = unexpected new/changed functions.",
  ).toEqual({ lost: [], gained: [] });
});

it("preserves the public URL surface", () => {
  // Route changes are never part of this migration — src/app/** is immovable.
  // Computed fresh (not read from the structure test's snapshot) so this does
  // not depend on test execution order.
  const frozen = readFileSync(`${REPO_ROOT}tests/migration/routes.frozen.txt`, "utf8");
  expect(
    routeManifestText(),
    "the route manifest changed. The migration must not touch src/app/**.",
  ).toBe(frozen);
});

it("has no stale MODULE_MOVES entries", async () => {
  const { modulePaths } = await loadConvexFunctions();
  const live = new Set(modulePaths);
  const notYetMoved = Object.keys(MODULE_MOVES).filter((old) => live.has(old));
  const badDestination = Object.values(MODULE_MOVES).filter((dest) => !live.has(dest));

  expect(
    { notYetMoved, badDestination },
    "MODULE_MOVES describes moves that did not happen: `notYetMoved` still exists " +
      "at its old path, `badDestination` does not exist at its new path.",
  ).toEqual({ notYetMoved: [], badDestination: [] });
});
