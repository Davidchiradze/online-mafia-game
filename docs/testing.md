# Testing

> Unit tests over the game's **pure logic**, plus CI that runs them on every
> push. The suite's primary job right now is to be the **regression oracle** for
> the game-types refactor (see [game-types.md](./game-types.md) §8: "Japanese is
> the regression oracle").

## Stack

- **Vitest** — pinned to the **v3 line** (`vitest@^3`), _not_ v4. Vitest 4 pulls
  in `rolldown`, whose native binding fails to install on darwin-arm64
  (`Cannot find module ./rolldown-binding.darwin-arm64.node`). Stay on v3 until
  that upstream issue is resolved.
- **Config**: [`vitest.config.mts`](../vitest.config.mts) — `node` environment,
  ESM (avoids the "CJS Vite Node API deprecated" warning). Aliases `@` → `src`
  and `@convex` → `convex` mirror `tsconfig.json` so tests import exactly like
  the app does. They point at directory roots, so they keep resolving as the
  refactor relocates modules.
- No `convex-test`, no running backend, no React renderer needed — the modules
  under test are pure functions.

## Commands

| Command | What it does |
| --- | --- |
| `npm test` | Run the whole suite once (what CI runs). |
| `npm run test:watch` | Watch mode for local development. |
| `npx tsc --noEmit` | Typecheck (also gated in CI). |

## What is tested

Pure, DB-free logic lives in `tests/`, mirroring the source tree:

| Test file | Covers |
| --- | --- |
| `tests/convex/winConditions.test.ts` | `decideWinner` / `describeWin` / `winMethodLabel` — all N, sweeps, the N=5 Doctor+Yakuza `beforeNight` exception, N=4 clan exception, 1v1s |
| `tests/convex/roles.test.ts` | `roleToFaction` for every role + unknown → citizens |
| `tests/convex/speakingOrder.test.ts` | `computeSpeakingOrder` / `getNextSpeaker` (opener selection, wrap, dead-skip) |
| `tests/game/visibility.test.ts` | `canSeeParticipant`, `getAwakeRoles`, `isNightActivityPhase`, `getVisibilityState`/`WithDeath` |
| `tests/game/phases.test.ts` | Exact `GAME_PHASES` ordering, Japanese role set, 12-card deck, team membership |

Tests live in a top-level `tests/` tree **on purpose** — not colocated inside
`convex/` — so they stay out of the Convex function bundler.

## The testing tiers (strategy)

1. **Unit (now).** Pure logic — highest ROI, deterministic, fast. This is the
   whole current suite.
2. **Integration — deferred to refactor Phase 3.** When the night-session DB
   shape changes (`mafiaTargetSelections`), add a thin layer of
   [`convex-test`](https://docs.convex.dev/testing/convex-test) tests around
   night resolution + phase transitions. `convex-test` needs the
   `edge-runtime` environment; add it via a Vitest `projects` split so it does
   not disturb the `node` unit config.
3. **E2E — deferred / likely skipped.** A real-time, multi-player, WebRTC game
   is a poor fit for E2E and can't serve as a _precise_ regression oracle. If
   ever added, one Playwright smoke test with LiveKit mocked — never the safety
   net.

## Using the suite during the game-types refactor

These are **characterization tests**: they pin _current Japanese behavior_, not
idealized behavior.

- As the refactor moves modules (e.g. `convex/lib/winConditions.ts` →
  `convex/games/japanese/winConditions.ts`), update **only the import paths** in
  the tests. **The assertions must stay constant.**
- If an assertion has to change to stay green, that is a **behavior regression**,
  not a refactor — investigate before changing it.
- New pure logic (e.g. the Sports `decideWinner`) gets its own characterization
  tests _as it is written_ (refactor Phase 2), validated against
  [sports-mafia.md](./sports-mafia.md).

### Known drift the suite pins

`GAME_PHASES` is **duplicated and out of sync**:
`src/lib/constants/game.ts` has **22** phases (includes `phase_transition`),
`convex/lib/constants.ts` has **21** (no `phase_transition`).
`tests/game/phases.test.ts` locks both current forms and flags this, so when the
refactor collapses them into `definition.phases` it is a deliberate, visible
diff rather than a silent change.

## Pre-push hook (local)

A local Git **pre-push** hook runs the same checks before a push leaves your
machine, so failures are caught earlier than CI:

- Script: [`.githooks/pre-push`](../.githooks/pre-push) — runs
  `npm run typecheck` then `npm test`; a failure aborts the push.
- It is **version-controlled** (committed under `.githooks/`) and wired via
  `core.hooksPath=.githooks`, which the `prepare` npm script sets automatically
  on `npm install`. No `husky` dependency. To activate manually in a fresh
  clone: `git config core.hooksPath .githooks`.
- **Bypass in an emergency:** `git push --no-verify`.

## CI

[`.github/workflows/tests.yml`](../.github/workflows/tests.yml) runs on **every
push (any branch) and every pull request**: `npm ci` → `npm run typecheck` →
`npm test`. In-progress runs are cancelled when new commits land on the same
ref. Because `convex/_generated` is committed, the typecheck needs no Convex
deployment. CI is the backstop; the pre-push hook is the same gate run locally.

**Why `types/next-env-shim.d.ts` exists:** `next-env.d.ts` is gitignored and only
generated by `next dev`/`next build`, so it is absent in CI. It supplies the
ambient declarations for static asset imports (`*.png` etc.); without a stand-in,
`tsc --noEmit` fails in CI with `TS2307: Cannot find module '….png'` even though
it passes locally. The committed shim provides those references so the typecheck
behaves identically in both places.
