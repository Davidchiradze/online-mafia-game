---
name: add-game-variant
description: Checklist for adding or changing a game variant - the definition modules, the parallel UI ruleset, both registries, schema, rating config, labels, i18n, docs, and the test guarding each step. Use when adding a variant, or when adding a role, phase, faction, or rule flag to an existing one.
---

# Adding or changing a variant

Rare, and expensive to get wrong: a variant touches two registries, ~14
modules, the schema, and rating. The trap is already set — `city_mafia` exists
in the `GameType` union, in `GAME_TYPES`, and in `GAME_TYPE_MAX_PLAYER_NUMBER`,
with **no definition registered**. It is half-declared, so the compiler will not
tell you what is missing.

Work from `sports_mafia`, not `japanese_mafia`. Sports was authored *after* the
abstraction and owns its own `roles.ts`; Japanese still reads its deck and teams
from `convex/lib/constants.ts`, which is a known open item, not the pattern.

## Backend

1. **`convex/games/<variant>/roles.ts`** — role list, deck, team map,
   `roleToFaction`. The deck length **must equal** `seatCount`.
2. **`convex/games/<variant>/phases.ts`** — the ordered phase list and a private
   `HOST_ADVANCE` record. Return `null` for any phase whose successor depends on
   DB state; a Convex mutation owns those.
3. **`convex/games/<variant>/winConditions.ts`** — write `describeWin` as the
   real implementation and have `decideWinner` delegate to it, so the two cannot
   drift.
4. **`convex/games/<variant>/nightModel.ts`** — `kind`, `actingRoles`, and a
   **pure** `resolveKills(state, context?)`.
5. **`convex/games/<variant>/definition.ts`** — assemble it and set **all** flags
   explicitly. A flag left off is a silent behaviour choice.
6. **Register** in `convex/games/registry.ts`.

Keep every one of these pure — no `ctx.db`, no React. The frontend and the spec
generator both import them.

## Frontend

7. Seven modules mirroring `src/features/game-room/variants/sports/`:
   `visibility.ts`, `phaseFlow.ts`, `phaseControls.tsx`, `nightActionsDisplay.tsx`,
   `nightAuthority.ts`, `seatLayout.ts`, `ruleset.ts`.
8. **Register** in `src/features/game-room/variants/registry.ts`. Note it
   currently falls back to Japanese with a dev warning for an unknown type —
   tighten that to a throw once your variant ships.

## Wiring that is easy to miss

9. **Schema** — add the id to the validator union in `convex/tables/games.ts`.
10. **`RATING_CONFIG`** in `convex/lib/constants.ts`. **A missing entry means the
    variant is silently UNRATED** — `archiveGameLog` skips rating entirely, with
    no error. That is a legitimate choice, but it must be a choice, not an
    oversight. Rating is **per variant**: its own ladder, its own E values, its
    own payouts, covering exactly its own factions. Decide how E is derived
    (measured from ~200 decided games, or declared), whether the archive is
    backfilled, and check K lands in the shared level brackets' volatility band.
    Full contract: `docs/ranking-system.md` §13.
11. **Labels** — `GAME_TYPE_LABEL` and `GAME_TYPE_MAX_PLAYER_NUMBER` in
    `src/shared/lib/constants/game.ts`, and the creatability filter in
    `CreateGameModal`.
12. **i18n** — keys in **both** `messages/en.json` and `messages/ka.json`.
13. **Docs** — `docs/variants/<slug>/` (a folder; a bare `<slug>.md` also
    satisfies the guard). This is **enforced**:
    `tests/structure/variantDocs.test.ts` fails the build the moment you
    register a variant with no doc. Slug is the id minus `_mafia`. Both current
    variants ship `rules.md` + `win-conditions.md` + `rating.md` — mirror that
    split rather than one long file, and cite sections by their full path
    (`docs/variants/<slug>/rules.md §4`), because a bare basename now matches
    more than one variant and `tests/structure/docLinks.test.ts` says so.
14. **Regenerate the spec** — `npm run docs:generate`. Roles, phases, state
    machine and win tables appear automatically because everything iterates the
    registry.

## Tests

Mirror the Sports set, which is the complete template:
`tests/game/sportsDefinition.test.ts`, `phaseFlow.test.ts`,
`phaseTransitionGraph.test.ts`, `seatLayout.test.ts`, `uiRegistry.test.ts`.

Two guards will speak up on their own, and both are useful signal:

- **Win-table ambiguity.** The generator derives the smallest key that predicts
  the outcome. If your rules read a variable the key omits, `tests/docs`
  fails saying a key maps to two outcomes.
- **Vocabulary firewall.** Adding a role or phase that not every variant has
  automatically bans that word from `docs/engine/**`. If a shared doc names it,
  the rule belongs in your variant doc instead.

## Changing an existing variant

Same rules, smaller blast radius — but `tests/game/*` are **characterization
tests**. If an assertion has to change, you changed behaviour, not structure.
Confirm that is intended, then regenerate the spec and read the diff: it is the
clearest statement of what you altered.
