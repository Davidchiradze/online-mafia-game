/**
 * Generates and guards docs/generated/game-spec.md.
 *
 * SILENT FAILURE MODE: a hand-written rules table has no relationship to the
 * code it describes. `game-design.md` said `CITIZEN (2x)` against a five-citizen
 * deck, and stated a naive-parity win rule the shipping code contradicts —
 * neither was caught by anything, for as long as they existed.
 *
 * The generated spec makes that unrepresentable, and this file is what keeps it
 * honest: the snapshot fails on any drift, so a rule change that is not
 * reflected in the doc fails CI.
 *
 * Regenerate deliberately with `npm run docs:generate`. Read the diff first —
 * a change here means the RULES changed.
 */

import { describe, expect, it } from "vitest";

import {
  BRANCHING_EDGES,
  brokenBranchGuards,
  deckCounts,
  gameSpecMarkdown,
  phaseUniverseDrift,
  redundantBranchEdges,
  registeredVariants,
  winTable,
} from "../support/gameSpec";

const variants = registeredVariants();

describe("generated game spec", () => {
  it("writes docs/generated/game-spec.md", async () => {
    await expect(gameSpecMarkdown()).toMatchFileSnapshot("../../docs/generated/game-spec.md");
  });

  it("covers every registered variant", () => {
    // Guards the guard: an empty registry would make every check below vacuous.
    expect(variants.map((v) => v.id).sort()).toEqual(["japanese_mafia", "sports_mafia"]);
  });

  it("keeps each deck the same size as its seat count", () => {
    const mismatched = variants
      .filter((v) => v.def.roleDistribution.length !== v.def.seatCount)
      .map((v) => `${v.id}: deck ${v.def.roleDistribution.length} vs ${v.def.seatCount} seats`);
    expect(mismatched, "a deck that does not fill the table deals a game nobody can start").toEqual([]);
  });
});

describe("win-condition tables", () => {
  it.each(variants.map((v) => [v.id, v] as const))("%s collapses to an unambiguous key", (_id, v) => {
    const table = winTable(v.def);
    // The alarm for "somebody added a rule that reads a variable this table
    // does not show". If a key maps to two outcomes, the table is lying.
    expect(
      table.ambiguous,
      "these keys map to more than one outcome — the win rule now reads something the key omits, so the generated table is no longer sufficient",
    ).toEqual([]);
    expect(table.rows.length, "no rows enumerated — the roster walk is broken").toBeGreaterThan(0);
  });

  it("still disagrees with naive parity where it matters", () => {
    // docs/game-design.md claimed mafia win on bare parity for years. If this
    // ever reaches zero, either the rules were simplified or the enumeration
    // silently stopped working — both are worth a human look.
    const japanese = variants.find((v) => v.id === "japanese_mafia")!;
    const differing = winTable(japanese.def).rows.filter((r) => r.differsFromNaive);
    expect(differing.length, "naive parity now matches the real rule everywhere — verify that is intended").toBeGreaterThan(0);
  });
});

describe("hand-authored branching edges", () => {
  it("keeps every owning code path present verbatim", () => {
    expect(
      brokenBranchGuards(),
      "the generated phase diagram is drawing edges the code no longer has",
    ).toEqual([]);
  });

  it("hand-authors only what the definition cannot derive", () => {
    // Anti-bloat ratchet: if nextPhase ever learns an edge, the duplicate goes.
    expect(redundantBranchEdges(), "these are derivable now — stop hand-authoring them").toEqual([]);
  });

  it("names only registered variants", () => {
    const known = new Set(variants.map((v) => v.id));
    const unknown = BRANCHING_EDGES.flatMap((e) => e.variants)
      .filter((id) => !known.has(id))
      .map((id) => `${id} — branch edge references an unregistered variant`);
    expect([...new Set(unknown)]).toEqual([]);
  });
});

describe("phase universe", () => {
  it("has exactly one known drift", () => {
    // KNOWN DRIFT: the backend GAME_PHASES predates the phase_transition sleep
    // buffer, so JAPANESE_DEFINITION.phases omits a phase its own UI flow routes
    // through on 8 of its 14 host-advance edges. Pinned in tests/game/phases.test.ts.
    //
    // Asserted exactly, not with toBeLessThan, so this fails in BOTH directions:
    // new drift fails, and CLOSING this drift also fails until the generated
    // spec is regenerated to match.
    expect(
      phaseUniverseDrift(),
      "the set of phases reachable-but-undeclared changed — regenerate the spec and confirm the change is intended",
    ).toEqual(["phase_transition"]);
  });

  it("deals a promoted role that is absent from the deck", () => {
    // MAFIA_RIGHT_HAND exists in Japanese's role list but not its deck — it is
    // reached by in-game promotion. The generator has to model that or the
    // roles table silently drops a role.
    const japanese = variants.find((v) => v.id === "japanese_mafia")!;
    expect(japanese.def.roles).toContain("MAFIA_RIGHT_HAND");
    expect(deckCounts(japanese.def).get("MAFIA_RIGHT_HAND")).toBeUndefined();
  });
});
