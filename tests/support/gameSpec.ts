/**
 * Generates docs/generated/game-spec.md from the game definitions.
 *
 * WHY THIS EXISTS: the rules were written down twice — once as data in
 * convex/games/*, once as prose across four docs — and only the prose could rot.
 * It did. game-design.md claimed `CITIZEN (2x)` against a deck holding five, and
 * stated a naive-parity win rule that the shipping code contradicts. Four copies
 * of the role roster disagreed with each other.
 *
 * Anything derivable is derived here, so the disagreement becomes unrepresentable.
 *
 * WHY IT RUNS UNDER VITEST rather than as a script: CI pins Node 20, which
 * cannot import TypeScript. A scripts/*.mjs importing @convex/games/registry
 * would need tsx or a Node bump. Vitest already has the transform, both path
 * aliases, and the node environment — and `toMatchFileSnapshot` gives the
 * drift guard for free, since `npm test` already fails on a stale snapshot.
 *
 * EVERYTHING ITERATES THE REGISTRY. No variant is named in a literal here, so a
 * third variant gets full tables the day it registers.
 *
 * Consumers: tests/docs/gameSpec.test.ts.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { getGameDefinition } from "@convex/games/registry";
import type {
  GameDefinition,
  NightState,
  WinStateContext,
} from "@convex/games/core/types";
import { GAME_PHASES as BACKEND_PHASES } from "@convex/lib/constants";
import {
  GAME_PHASES as UI_PHASES,
  GAME_PHASE_LABELS,
  GAME_TYPES,
  PHASE_TIMERS, GamePhase } from "@/shared/lib/constants/game";
import { advanceUpdates } from "@/features/game-room/variants/japanese/phaseFlow";
import { sportsAdvanceUpdates } from "@/features/game-room/variants/sports/phaseFlow";
import { serialKillerAdvanceUpdates } from "@/features/game-room/variants/serialkiller/phaseFlow";
import { JAPANESE_VISIBILITY } from "@/features/game-room/variants/japanese/visibility";
import { SPORTS_VISIBILITY } from "@/features/game-room/variants/sports/visibility";
import { SERIAL_KILLER_VISIBILITY } from "@/features/game-room/variants/serialkiller/visibility";
import type { VisibilityRuleset } from "@/features/game-room/variants/core/types";

const REPO_ROOT = new URL("../../", import.meta.url).pathname;
const p = (rel: string) => join(REPO_ROOT, rel);

export const BUFFER_PHASE = GamePhase.PHASE_TRANSITION;

// ---------------------------------------------------------------------------
// Registered variants
// ---------------------------------------------------------------------------

/**
 * The UI-side halves that are NOT reachable from the backend definition.
 *
 * Import the LEAF modules only. Never a variant's `ruleset.ts`, and never
 * `variants/registry.ts` — both transitively pull `phaseControls.tsx`, which
 * drags React into what is a node-environment test.
 */
const UI_BY_ID: Record<
  string,
  { advance: (phase: string) => { gamePhase: string; nextPhase?: string }; visibility: VisibilityRuleset }
> = {
  japanese_mafia: { advance: advanceUpdates, visibility: JAPANESE_VISIBILITY },
  sports_mafia: { advance: sportsAdvanceUpdates, visibility: SPORTS_VISIBILITY },
  serial_killer_mafia: {
    advance: serialKillerAdvanceUpdates,
    visibility: SERIAL_KILLER_VISIBILITY,
  },
};

export type Variant = {
  id: string;
  def: GameDefinition;
  ui?: (typeof UI_BY_ID)[string];
};

/** Resolvable through the registry — `city_mafia` is in the union but unbuilt. */
export function registeredVariants(): Variant[] {
  return GAME_TYPES.flatMap((id) => {
    try {
      return [{ id, def: getGameDefinition(id), ui: UI_BY_ID[id] }];
    } catch {
      return [];
    }
  });
}

// ---------------------------------------------------------------------------
// Non-derivable branching edges
// ---------------------------------------------------------------------------

/**
 * Phase edges the generator CANNOT derive: they are owned by Convex mutations
 * that read ctx.db, so `definition.nextPhase` returns null for them.
 *
 * SILENT FAILURE MODE: delete or reshape one of these branches and nothing
 * fails — the generated diagram keeps drawing an edge the code no longer has.
 * Hence `guard`, a verbatim substring that must still be present in `owner`.
 * Same idiom as EXTRA_RAW_PATHS in tests/convex/apiIntegrity.test.ts.
 */
export type BranchEdge = {
  variants: readonly string[];
  from: string;
  to: string;
  when: string;
  owner: string;
  guard: string;
};

export const BRANCHING_EDGES: readonly BranchEdge[] = [
  {
    variants: ["sports_mafia"],
    from: GamePhase.DAY_PHASE,
    to: GamePhase.NIGHT_PHASE,
    when: "first day round AND exactly one nominee",
    owner: "convex/games/core/dayPhase.ts",
    guard: "definition.flags.firstDaySingleNomineeSkipsToNight &&",
  },
  {
    variants: ["sports_mafia"],
    from: GamePhase.DAY_PHASE,
    to: GamePhase.FAREWELL_SPEECH,
    when: "later day round AND exactly one nominee — eliminated without a vote",
    owner: "convex/games/core/dayPhase.ts",
    guard: "isFirstDayRound(session.currentNightNumber)",
  },
  {
    variants: ["japanese_mafia", "sports_mafia"],
    from: GamePhase.DAY_PHASE,
    to: GamePhase.VOTING,
    when: "self-justification skipped, or exactly one nominee",
    owner: "convex/games/core/dayPhase.ts",
    guard: "session.withoutSelfJustification || nominatedPlayers.length === 1",
  },
  {
    variants: ["japanese_mafia", "sports_mafia"],
    from: GamePhase.NIGHT_PHASE,
    to: GamePhase.DAY_PHASE,
    when: "night resolved to zero kills — the farewell is skipped",
    owner: "convex/games/core/farewellSpeech.ts",
    guard: "if (killedPlayers.length === 0) {",
  },
  {
    variants: ["sports_mafia"],
    from: GamePhase.NIGHT_PHASE,
    to: GamePhase.BEST_MOVE,
    when: "variant grants best move AND the victim is eligible",
    owner: "convex/games/core/farewellSpeech.ts",
    guard: "definition.flags.hasBestMove &&",
  },
  {
    variants: ["japanese_mafia", "sports_mafia"],
    from: GamePhase.VOTING,
    to: GamePhase.NIGHT_PHASE,
    when: "repeated tie — nobody is eliminated",
    owner: "convex/games/core/voting.ts",
    guard: "skipToNightAfterTie",
  },
];

export function brokenBranchGuards(): string[] {
  const broken: string[] = [];
  for (const edge of BRANCHING_EDGES) {
    const abs = p(edge.owner);
    if (!existsSync(abs)) {
      broken.push(`${edge.from}→${edge.to} → owner missing: ${edge.owner}`);
      continue;
    }
    if (!readFileSync(abs, "utf8").includes(edge.guard)) {
      broken.push(
        `${edge.owner} no longer contains ${JSON.stringify(edge.guard)} — the ${edge.from}→${edge.to} branch moved or changed shape`,
      );
    }
  }
  return broken;
}

/** Hand-authored edges that `nextPhase` has since learned to derive. */
export function redundantBranchEdges(): string[] {
  return BRANCHING_EDGES.filter((edge) =>
    edge.variants.some((id) => {
      try {
        return getGameDefinition(id).nextPhase(edge.from) === edge.to;
      } catch {
        return false;
      }
    }),
  ).map((edge) => `${edge.from}→${edge.to} — nextPhase now derives this; delete the hand-authored entry`);
}

// ---------------------------------------------------------------------------
// Derivations
// ---------------------------------------------------------------------------

/** Deck counts, plus 1 for roles reachable only by in-game promotion. */
export function maxRoleCounts(def: GameDefinition): Map<string, number> {
  const counts = new Map<string, number>();
  for (const role of def.roleDistribution) counts.set(role, (counts.get(role) ?? 0) + 1);
  for (const role of def.roles) if (!counts.has(role)) counts.set(role, 1);
  return counts;
}

export function deckCounts(def: GameDefinition): Map<string, number> {
  const counts = new Map<string, number>();
  for (const role of def.roleDistribution) counts.set(role, (counts.get(role) ?? 0) + 1);
  return counts;
}

/** `[from, to]` for every edge the definition can derive on its own. */
export function derivedEdges(def: GameDefinition): [string, string][] {
  return def.phases
    .map((phase) => [phase, def.nextPhase(phase)] as const)
    .filter((pair): pair is [string, string] => pair[1] !== null)
    .map(([from, to]) => [from, to]);
}

/** Sources whose host-advance parks in the shared sleep buffer first. */
export function bufferedSources(v: Variant): Set<string> {
  const out = new Set<string>();
  if (!v.ui) return out;
  for (const phase of v.def.phases) {
    try {
      if (v.ui.advance(phase).gamePhase === BUFFER_PHASE) out.add(phase);
    } catch {
      // Phases with no host-advance throw by design.
    }
  }
  return out;
}

/** Every phase reachable in a variant's flow, including via the buffer. */
function reachablePhases(v: Variant): Set<string> {
  const out = new Set<string>(v.def.phases);
  for (const [, to] of derivedEdges(v.def)) out.add(to);
  if (v.ui) {
    for (const phase of v.def.phases) {
      try {
        const updates = v.ui.advance(phase);
        out.add(updates.gamePhase);
        if (updates.nextPhase) out.add(updates.nextPhase);
      } catch {
        /* no host-advance */
      }
    }
  }
  for (const edge of BRANCHING_EDGES) {
    if (edge.variants.includes(v.id)) {
      out.add(edge.from);
      out.add(edge.to);
    }
  }
  return out;
}

/** Phases a variant's flow routes through that its own phase list omits. */
export function phaseUniverseDrift(): string[] {
  const drift = new Set<string>();
  for (const v of registeredVariants()) {
    const declared = new Set(v.def.phases);
    for (const phase of reachablePhases(v)) if (!declared.has(phase)) drift.add(phase);
  }
  return [...drift].sort();
}

// ---------------------------------------------------------------------------
// Win-condition enumeration
// ---------------------------------------------------------------------------

const CONTEXTS = ["beforeNight", "beforeDay"] as const;
type Ctx = (typeof CONTEXTS)[number];

type Roster = { roles: string[]; counts: Map<string, number> };

type StateAxis = { id: string; state?: WinStateContext };

/**
 * The SECOND enumerated axis: `WinStateContext` — facts a win rule may read
 * that the alive roster cannot express.
 *
 * SILENT FAILURE MODE this exists to close. The enumeration used to call
 * `decideWinner(roles, ctx)` with `state` left undefined. A rule that reads
 * `state` would then answer ONCE per roster, every key would map to exactly one
 * outcome, `ambiguous` would stay empty, `tests/docs/gameSpec.test.ts` would
 * pass, and `docs/generated/game-spec.md` would publish a confidently wrong
 * table. The ambiguity alarm cannot fire on a variable the generator never
 * varies — so the variable has to be enumerated, not merely allowed.
 */
const WIN_STATES: readonly StateAxis[] = [
  { id: "shot held", state: { serialKillerHasShot: true } },
  { id: "shot spent", state: { serialKillerHasShot: false } },
];

/** The single column set for a variant whose rules ignore `WinStateContext`. */
const NO_WIN_STATE: readonly StateAxis[] = [{ id: "" }];

type Column = { label: string; ctx: Ctx; state?: WinStateContext };

/**
 * The outcome columns for a variant — one per context, multiplied by the state
 * axis only if the variant's rules actually read it.
 *
 * PROBED, not declared. A variant is given the axis iff some roster answers
 * differently under two states. So Japanese and Sports collapse back to plain
 * `beforeNight` / `beforeDay` columns and their generated tables are
 * byte-identical to before this axis existed — the spec gains noise only where
 * the extra dimension carries real information.
 */
function columnsFor(def: GameDefinition, rosters: Roster[]): Column[] {
  const varies = rosters.some((r) =>
    CONTEXTS.some(
      (c) =>
        new Set(
          WIN_STATES.map(
            (s) => def.decideWinner([...r.roles], c, s.state) ?? "continue",
          ),
        ).size > 1,
    ),
  );

  return (varies ? WIN_STATES : NO_WIN_STATE).flatMap((s) =>
    CONTEXTS.map((c) => ({
      label: s.id ? `${c} (${s.id})` : c,
      ctx: c,
      state: s.state,
    })),
  );
}

/** Every alive-roster reachable from the deck (Japanese 2304, Sports 84). */
function enumerateRosters(def: GameDefinition): Roster[] {
  const max = maxRoleCounts(def);
  const roles = def.roles.filter((r) => (max.get(r) ?? 0) > 0);
  const out: Roster[] = [];

  const walk = (index: number, counts: Map<string, number>) => {
    if (index === roles.length) {
      const flat: string[] = [];
      for (const [role, n] of counts) for (let i = 0; i < n; i++) flat.push(role);
      out.push({ roles: flat, counts: new Map(counts) });
      return;
    }
    const role = roles[index];
    for (let n = 0; n <= (max.get(role) ?? 0); n++) {
      counts.set(role, n);
      walk(index + 1, counts);
    }
    counts.delete(role);
  };
  walk(0, new Map());
  return out;
}

const factionCount = (def: GameDefinition, r: Roster, faction: string) =>
  r.roles.filter((role) => def.roleToFaction(role) === faction).length;

export type WinRow = {
  key: string;
  n: number;
  m: number;
  flags: Record<string, boolean>;
  /** Keyed by column label — see `columnsFor`. */
  outcomes: Record<string, string>;
  naive: string;
  differsFromNaive: boolean;
};

export type WinTable = {
  /** Roles the key had to include, discovered rather than assumed. */
  keyRoles: string[];
  /** Outcome column labels in render order, discovered the same way. */
  columns: string[];
  rows: WinRow[];
  /** Keys that map to more than one outcome — must be empty. */
  ambiguous: string[];
};

/**
 * Collapse the full roster space into the smallest table that still predicts
 * the outcome, by GROWING the key until it is sufficient.
 *
 * The starting key is (N, m). Roles are added one at a time, in definition
 * order, only while some key still maps to two different outcomes. So the
 * resulting `keyRoles` is a derived fact — "these are the roles that actually
 * change the answer" — rather than an assumption baked into the generator. If a
 * future rule starts reading a role nobody expected, it shows up here.
 */
export function winTable(def: GameDefinition): WinTable {
  const rosters = enumerateRosters(def);
  const mafiaFaction = "mafia";
  const columns = columnsFor(def, rosters);

  // Outcomes are pure and the roster space is walked many times during the
  // key search, so evaluate once up front.
  const outcomeOf = new Map<Roster, Record<string, string>>();
  for (const r of rosters) {
    outcomeOf.set(
      r,
      Object.fromEntries(
        columns.map((col) => [
          col.label,
          def.decideWinner([...r.roles], col.ctx, col.state) ?? "continue",
        ]),
      ),
    );
  }
  const evaluate = (r: Roster, label: string) => outcomeOf.get(r)![label];

  const keyFor = (r: Roster, roles: string[]) => {
    const n = r.roles.length;
    const m = factionCount(def, r, mafiaFaction);
    const flags = roles.map((role) => `${role}=${(r.counts.get(role) ?? 0) > 0 ? "Y" : "n"}`);
    return [`N=${n}`, `m=${m}`, ...flags].join(" ");
  };

  /**
   * Impurity = how many ROSTERS sit under a key that predicts two different
   * outcomes. Counting ambiguous *keys* instead would be wrong: refining a key
   * can split one bad key into two still-bad keys, so the key count rises and a
   * greedy search concludes, incorrectly, that nothing helps.
   */
  const impurityOf = (roles: string[]) => {
    const groups = new Map<string, Map<string, number>>();
    for (const r of rosters) {
      const key = keyFor(r, roles);
      const value = columns.map((col) => evaluate(r, col.label)).join("/");
      let group = groups.get(key);
      if (!group) groups.set(key, (group = new Map()));
      group.set(value, (group.get(value) ?? 0) + 1);
    }
    let impure = 0;
    const bad = new Set<string>();
    for (const [key, group] of groups) {
      if (group.size > 1) {
        bad.add(key);
        for (const count of group.values()) impure += count;
      }
    }
    return { impure, bad };
  };

  // Grow the key until it predicts the outcome, re-scanning every remaining
  // role each pass: a role can become useful only after another is added.
  let keyRoles: string[] = [];
  let current = impurityOf(keyRoles);
  let improved = true;
  while (current.impure > 0 && improved) {
    improved = false;
    let best: { role: string; result: ReturnType<typeof impurityOf> } | null = null;
    for (const role of def.roles) {
      if (keyRoles.includes(role)) continue;
      const result = impurityOf([...keyRoles, role]);
      if (result.impure < current.impure && (!best || result.impure < best.result.impure)) {
        best = { role, result };
      }
    }
    if (best) {
      keyRoles = [...keyRoles, best.role];
      current = best.result;
      improved = true;
    }
  }
  const bad = current.bad;

  const byKey = new Map<string, WinRow>();
  for (const r of rosters) {
    const key = keyFor(r, keyRoles);
    if (byKey.has(key)) continue;
    const n = r.roles.length;
    const m = factionCount(def, r, mafiaFaction);
    const outcomes = Object.fromEntries(
      columns.map((col) => [col.label, evaluate(r, col.label)]),
    );
    // The rule game-design.md claimed for years: mafia win on bare parity.
    const naive = n === 0 ? "no_contest" : m === 0 ? "citizens" : 2 * m >= n ? "mafia" : "continue";
    byKey.set(key, {
      key,
      n,
      m,
      flags: Object.fromEntries(keyRoles.map((role) => [role, (r.counts.get(role) ?? 0) > 0])),
      outcomes,
      naive,
      differsFromNaive: columns.some((col) => outcomes[col.label] !== naive),
    });
  }

  const rows = [...byKey.values()].sort((a, b) => a.n - b.n || a.m - b.m || a.key.localeCompare(b.key));
  return {
    keyRoles,
    columns: columns.map((col) => col.label),
    rows,
    ambiguous: [...bad].sort(),
  };
}

// ---------------------------------------------------------------------------
// Night model probes
// ---------------------------------------------------------------------------

const NIGHT_FIXTURES: { name: string; state: NightState; livingMafiaSeats?: number[] }[] = [
  { name: "mafia only", state: { mafiaTarget: 3 } },
  { name: "mafia target healed", state: { mafiaTarget: 3, healedPlayer: 3 } },
  { name: "two factions, distinct targets", state: { mafiaTarget: 3, yakuzaTarget: 5 } },
  { name: "two factions, same target", state: { mafiaTarget: 3, yakuzaTarget: 3 } },
  { name: "nothing chosen", state: {} },
  {
    name: "unanimous private picks",
    state: { mafiaTargetSelections: [{ mafiaSeat: 1, targetSeat: 4 }, { mafiaSeat: 2, targetSeat: 4 }] },
    livingMafiaSeats: [1, 2],
  },
  {
    name: "split private picks",
    state: { mafiaTargetSelections: [{ mafiaSeat: 1, targetSeat: 4 }, { mafiaSeat: 2, targetSeat: 6 }] },
    livingMafiaSeats: [1, 2],
  },
];

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const yn = (b: boolean) => (b ? "yes" : "—");
const ms = (n: number | undefined) => (n === undefined ? "—" : `${n / 1000}s`);

function renderProvenance(): string {
  return [
    "<!-- DO NOT EDIT — generated from the game definitions. -->",
    "",
    "# Game Spec (generated)",
    "",
    "> **DO NOT EDIT THIS FILE.** It is generated from the code and rewritten in",
    "> place; a hand edit is discarded by the next run.",
    ">",
    "> Regenerate: `npm run docs:generate` · Verify: `npm run docs:check`",
    "> (`npm test` also fails on drift, so CI catches a stale file.)",
    ">",
    "> Derived from `convex/games/registry.ts` and each variant's definition,",
    "> plus the UI leaf modules `variants/<id>/{phaseFlow,visibility}.ts`.",
    "> Everything iterates the registry, so a newly registered variant appears",
    "> here automatically.",
    ">",
    "> **This file is the authority on roles, decks, phase order and win",
    "> conditions.** Where a hand-written doc disagrees with it, the hand-written",
    "> doc is wrong.",
    "",
  ].join("\n");
}

function renderVariants(variants: Variant[]): string {
  const flagKeys = [...new Set(variants.flatMap((v) => Object.keys(v.def.flags)))].sort();
  const lines = [
    "## Variants",
    "",
    `| | ${variants.map((v) => `\`${v.id}\``).join(" | ")} |`,
    `| --- | ${variants.map(() => "---").join(" | ")} |`,
    `| Seats | ${variants.map((v) => v.def.seatCount).join(" | ")} |`,
    `| Roles | ${variants.map((v) => v.def.roles.length).join(" | ")} |`,
    `| Deck size | ${variants.map((v) => v.def.roleDistribution.length).join(" | ")} |`,
    `| Factions | ${variants.map((v) => v.def.factions.join(", ")).join(" | ")} |`,
    `| Phases | ${variants.map((v) => v.def.phases.length).join(" | ")} |`,
    `| Night model | ${variants.map((v) => `\`${v.def.night.kind}\``).join(" | ")} |`,
  ];
  for (const flag of flagKeys) {
    const cells = variants.map((v) => yn(Boolean((v.def.flags as Record<string, boolean>)[flag])));
    lines.push(`| \`${flag}\` | ${cells.join(" | ")} |`);
  }
  lines.push("");
  return lines.join("\n");
}

function renderRoles(variants: Variant[]): string {
  const out = ["## Roles", ""];
  for (const v of variants) {
    const deck = deckCounts(v.def);
    const acting = new Set(v.def.night.actingRoles);
    out.push(`### \`${v.id}\``, "");
    out.push("| Role | In deck | Faction | Acts at night |");
    out.push("| --- | --- | --- | --- |");
    for (const role of v.def.roles) {
      const n = deck.get(role) ?? 0;
      out.push(
        `| \`${role}\` | ${n === 0 ? "— (promoted in game)" : `×${n}`} | ${v.def.roleToFaction(role)} | ${yn(acting.has(role))} |`,
      );
    }
    out.push("", `Deck is ${v.def.roleDistribution.length} cards for ${v.def.seatCount} seats.`, "");
  }
  return out.join("\n");
}

function renderPhases(variants: Variant[]): string {
  const out = ["## Phases", ""];
  for (const v of variants) {
    const buffered = bufferedSources(v);
    out.push(`### \`${v.id}\``, "");
    out.push("| # | Phase | Label | Timer | Awake | Host advances to | Via buffer |");
    out.push("| --- | --- | --- | --- | --- | --- | --- |");
    v.def.phases.forEach((phase, i) => {
      const label = (GAME_PHASE_LABELS as Record<string, string>)[phase] ?? "—";
      const timer = ms((PHASE_TIMERS as Record<string, number | undefined>)[phase]);
      let awake = "—";
      try {
        const roles = v.ui?.visibility.getAwakeRoles(phase as never) ?? [];
        awake = roles.length ? roles.map((r) => `\`${r}\``).join(" ") : "—";
      } catch {
        /* not a night phase */
      }
      const next = v.def.nextPhase(phase);
      out.push(
        `| ${i + 1} | \`${phase}\` | ${label} | ${timer} | ${awake} | ${next ? `\`${next}\`` : "server-owned"} | ${yn(buffered.has(phase))} |`,
      );
    });
    out.push(
      "",
      "`server-owned` means `nextPhase` returns null: the next phase depends on",
      "database state, so a Convex mutation decides it. Those edges are listed",
      "under **Branching edges** below.",
      "",
    );
  }
  return out.join("\n");
}

function renderPhaseUniverse(variants: Variant[]): string {
  const all = [...new Set([...BACKEND_PHASES, ...UI_PHASES, ...variants.flatMap((v) => [...v.def.phases])])].sort();
  const drift = new Set(phaseUniverseDrift());
  const out = [
    "## Phase universe",
    "",
    "Three phase lists exist and they are not the same length:",
    `\`convex/lib/constants.ts\` (${BACKEND_PHASES.length}),`,
    `\`src/shared/lib/constants/game.ts\` (${UI_PHASES.length}),`,
    "and each variant's own `definition.phases`.",
    "",
    "| Phase | backend list | UI list | " + variants.map((v) => `\`${v.id}\``).join(" | ") + " | verdict |",
    "| --- | --- | --- | " + variants.map(() => "---").join(" | ") + " | --- |",
  ];
  for (const phase of all) {
    const cells = variants.map((v) => yn(v.def.phases.includes(phase)));
    const verdict = drift.has(phase)
      ? "⚠️ reachable in a flow that omits it"
      : variants.every((v) => v.def.phases.includes(phase))
        ? "shared"
        : "variant-specific";
    out.push(
      `| \`${phase}\` | ${yn((BACKEND_PHASES as readonly string[]).includes(phase))} | ${yn((UI_PHASES as readonly string[]).includes(phase))} | ${cells.join(" | ")} | ${verdict} |`,
    );
  }
  out.push("");
  return out.join("\n");
}

function renderStateMachines(variants: Variant[]): string {
  const out = ["## State machine", "", "Solid = derived from `definition.nextPhase`. Dotted = branch owned by a Convex mutation.", ""];
  for (const v of variants) {
    const buffered = bufferedSources(v);
    out.push(`### \`${v.id}\``, "", "```mermaid", "stateDiagram-v2");
    for (const [from, to] of derivedEdges(v.def)) {
      out.push(`    ${from} --> ${to}${buffered.has(from) ? " : via buffer" : ""}`);
    }
    for (const edge of BRANCHING_EDGES.filter((e) => e.variants.includes(v.id))) {
      out.push(`    ${edge.from} --> ${edge.to} : ${edge.when}`);
    }
    out.push("```", "");
  }
  return out.join("\n");
}

function renderWinConditions(variants: Variant[]): string {
  const out = ["## Win conditions", ""];
  for (const v of variants) {
    const table = winTable(v.def);
    const differing = table.rows.filter((r) => r.differsFromNaive).length;
    out.push(`### \`${v.id}\``, "");
    out.push(
      `Every reachable alive-roster was enumerated and collapsed by the smallest`,
      `sufficient key. The key had to include ${table.keyRoles.length ? table.keyRoles.map((r) => `\`${r}\``).join(", ") : "**nothing beyond N and m**"} —`,
      `that is a derived result, not an assumption: those are exactly the roles`,
      `whose presence changes the answer.`,
      "",
      `\`N\` = alive players, \`m\` = alive mafia-faction players.`,
      `**${differing} of ${table.rows.length} rows disagree with naive parity** (\`2m ≥ N\`),`,
      `which is why a parity rule cannot be used as a shortcut.`,
      "",
    );
    // Only variants whose rules read `WinStateContext` get the extra columns,
    // so this paragraph appears exactly where it carries information.
    if (table.columns.length > CONTEXTS.length) {
      out.push(
        `This variant's outcome also depends on state the alive roster does not`,
        `carry, so each context is split across it. Two rosters can be identical`,
        `and still resolve differently.`,
        "",
      );
    }
    const flagCols = table.keyRoles.map((r) => ` ${r} |`).join("");
    const outcomeCols = table.columns.map((c) => ` ${c} |`).join("");
    out.push(`| N | m |${flagCols}${outcomeCols} naive parity | ≠ |`);
    out.push(
      `| --- | --- |${table.keyRoles.map(() => " --- |").join("")}${table.columns.map(() => " --- |").join("")} --- | --- |`,
    );
    for (const row of table.rows) {
      const flags = table.keyRoles.map((r) => ` ${row.flags[r] ? "yes" : "—"} |`).join("");
      const outs = table.columns.map((c) => ` ${row.outcomes[c]} |`).join("");
      out.push(
        `| ${row.n} | ${row.m} |${flags}${outs} ${row.naive} | ${row.differsFromNaive ? "⚠️" : ""} |`,
      );
    }
    out.push("");
  }
  return out.join("\n");
}

function renderNightModel(variants: Variant[]): string {
  const out = ["## Night model", ""];
  for (const v of variants) {
    out.push(`### \`${v.id}\``, "");
    out.push(`Kind: \`${v.def.night.kind}\`. Acting roles: ${v.def.night.actingRoles.map((r) => `\`${r}\``).join(", ") || "—"}.`, "");
    out.push("| Night state | Resolves to seats |");
    out.push("| --- | --- |");
    for (const fixture of NIGHT_FIXTURES) {
      let result: string;
      try {
        const kills = v.def.night.resolveKills(
          fixture.state,
          fixture.livingMafiaSeats ? { livingMafiaSeats: fixture.livingMafiaSeats } : undefined,
        );
        result = kills.length ? kills.join(", ") : "nobody";
      } catch (error) {
        result = `throws (${(error as Error).message})`;
      }
      out.push(`| ${fixture.name} | ${result} |`);
    }
    out.push("");
  }
  return out.join("\n");
}

function renderBranchingEdges(): string {
  const out = [
    "## Branching edges (hand-authored)",
    "",
    "These are the only entries in this file that are not derived. Their target",
    "depends on database state, so `definition.nextPhase` returns null and a",
    "Convex mutation decides. Each carries a guard string that must still appear",
    "verbatim in its owning file — if a branch is moved or reshaped, the guard",
    "test fails rather than this table quietly going stale.",
    "",
    "| Variants | From | To | When | Owner |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const edge of BRANCHING_EDGES) {
    out.push(
      `| ${edge.variants.map((v) => `\`${v}\``).join(", ")} | \`${edge.from}\` | \`${edge.to}\` | ${edge.when} | \`${edge.owner}\` |`,
    );
  }
  out.push("");
  return out.join("\n");
}

export function gameSpecMarkdown(): string {
  const variants = registeredVariants();
  return [
    renderProvenance(),
    renderVariants(variants),
    renderRoles(variants),
    renderPhases(variants),
    renderPhaseUniverse(variants),
    renderStateMachines(variants),
    renderWinConditions(variants),
    renderNightModel(variants),
    renderBranchingEdges(),
  ].join("\n");
}
