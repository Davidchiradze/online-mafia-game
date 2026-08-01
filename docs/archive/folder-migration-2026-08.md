# Folder Structure Migration — Progress

> **ARCHIVED — frozen 2026-08. This is historical narrative, not current state.**
>
> The migration is **complete**. Every path, status box, and file listing below
> was accurate on the date in this file's name and many are deliberately
> pre-migration — the fault-injection record only makes sense with the old paths
> quoted verbatim. Do not repoint them, and do not read this file to learn where
> code lives today: see [architecture.md](../architecture.md).
>
> Because its claims are intentionally frozen, this file is exempt from the
> stale-path check in `tests/structure/docLinks.test.ts`. The `ARCHIVED` marker
> above is what earns that exemption.
>
> Durable lessons extracted from this file live in [testing.md](../testing.md)
> ("Structural tests: the safety net on magic strings").
>
> Source plan: `~/.claude/plans/game-types-refactor-is-sleepy-pony.md`
> Absolute constraint at the time: **zero behavior change** — file moves and
> import-path updates only.

## Phase status

| Phase       | Scope                                                     | Status                                 |
| ----------- | --------------------------------------------------------- | -------------------------------------- |
| **0**       | Build the safety net                                      | ✅ **Complete**                        |
| **1**       | Backend — `convex/game/*` → `convex/games/{core,sports}/` | ✅ **Complete** (A `6fac22e`, B `e06b2ba`; not deployed) |
| **2**       | Frontend — `src/` feature-first (C0–C15)                  | 🔨 C0–C14 committed; C15 in progress   |
| **Cleanup** | Remove temporary artifacts                                | ⏳ Not started                         |

---

## Phase 0 — Build the safety net ✅

Nothing in Phase 0 changed application code. All new tests land in `tests/`,
which `vitest.config.mts` already picks up (`include: ["**/*.{test,spec}.{ts,tsx}"]`),
so no Vitest or CI config changes were needed for the tests themselves.

| Step | Deliverable                                                 | Status                        |
| ---- | ----------------------------------------------------------- | ----------------------------- |
| 0.1  | Verify the false-green mechanism                            | ✅ Confirmed                  |
| 0.2  | `tests/support/convexModules.ts` — module map + inventory   | ✅ 81 modules / 137 functions |
| 0.3  | `tests/convex/apiIntegrity.test.ts` — refs, drift, snapshot | ✅ 15 tests                   |
| 0.4  | `tests/structure/{routeManifest,magicPaths}.test.ts`        | ✅ 8 tests                    |
| 0.5  | Freeze baselines + `moveMap.test.ts`                        | ✅ 3 tests                    |
| 0.6  | Temporary `next build` CI job                               | ✅ Green locally              |
| 0.7  | `codegen` / `codegen:check` scripts + pre-push wiring       | ✅                            |
| 0.8  | `docs/testing.md` — tier + maintenance contract             | ✅                            |

### Baseline facts — all verified, none assumed

Every fact the plan depends on was re-confirmed against the working tree:

| Fact                                       | Plan said | Measured                                                                | ✓   |
| ------------------------------------------ | --------- | ----------------------------------------------------------------------- | --- |
| `"game/` string literals                   | 83        | 83 (refs/game 77, refs/history 3, webhookHandler 2, refs/leaderboard 1) | ✅  |
| `api.game.*` / `internal.game.*` in `src/` | 0         | 0 — **backend migration needs zero `src/` edits**                       | ✅  |
| `convex/game/*` same-dir `./` imports      | 0         | 0 — one uniform relative-import rule holds                              | ✅  |
| Modules in `api.d.ts`                      | 81        | 81                                                                      | ✅  |
| Registered Convex functions                | 137       | 137                                                                     | ✅  |
| Raw function-path strings                  | 107       | 107 (106 `makeFunctionReference` + 1 `sendBeacon`)                      | ✅  |
| Internal-targeting refs                    | 6         | 6, exactly the plan's list                                              | ✅  |
| `skipLibCheck`                             | `true`    | `true`                                                                  | ✅  |

### 0.1 — The false-green mechanism is real

Renamed `convex/game/bestMove.ts` → `bestMoveRenamed.ts` and rewrote its 3 refs
strings, leaving `convex/_generated` stale:

```
npx tsc --noEmit                      → exit 0      ← FALSE GREEN
npx tsc --noEmit --skipLibCheck false → TS2307 in api.d.ts(20,37)
```

So the hole is exactly as described: a broken backend move could be committed,
pushed, and pass CI green.

**Correction to the plan:** `--skipLibCheck false` cannot be adopted as a
standing gate. `node_modules` (`@livekit/components-core`, `next-intl`) emits its
own pre-existing `TS2307`s, so the flag is permanently red for unrelated
reasons. This _upgrades_ the offline drift assertion (0.3) from "required because
codegen can't run in CI" to "the only viable mechanism at all."

### Fault injection — proof the net works

Two injections were run and reverted; the tree is clean.

| Injection                                              | `tsc`                       | Pre-existing suite | New net                           |
| ------------------------------------------------------ | --------------------------- | ------------------ | --------------------------------- |
| Move `game/bestMove.ts` → `games/core/` (depth change) | ❌ exit 2                   | ❌ fails           | ✅ 5 tests red                    |
| Rename `game/bestMove.ts` in place + rewrite refs      | **✅ exit 0 (false green)** | ❌ fails           | ✅ 2 tests red (drift + snapshot) |

The second row is the important one: it is the post-relative-import-bump state
that Phase 1 step 2 produces, and it is where `tsc` is actively misleading. Note
the depth-changing move _is_ caught by `tsc` — but only incidentally, via broken
relative imports, not via `api.d.ts`.

### What the net now guards

**`tests/support/convexModules.ts`** — derives the deployed module set from a
transcription of the Convex bundler's own `entryPoints()` rules
(`node_modules/convex/src/bundler/index.ts:395-493`), then imports each module and
classifies exports via the markers in `registration_impl.ts`. All 81 modules
import cleanly in the `node` environment, so the `edge-runtime` fallback the plan
budgeted for was **not needed**.

**`tests/convex/apiIntegrity.test.ts`** (15 tests):

- every raw function path resolves to a real exported function
- the declared kind type-argument matches the real kind
- visibility matches `INTERNAL_REF_ALLOWLIST` **bidirectionally**
- `EXTRA_RAW_PATHS` call sites still exist verbatim (guard strings)
- a **ratchet** on any new untracked udf-shaped literal
- `_generated` drift vs. the bundler's real module set
- `convex/games/**` never acquires a nested `convex.config.ts` (would silently
  unregister the entire subtree)
- a 137-line signature snapshot (`kind | visibility | id | hash(args) | hash(returns)`)

Paths are extracted with the **TypeScript compiler API**, not regex — both
syntactic variants of `makeFunctionReference` produce an identical
`CallExpression`, and 5 call sites are non-exported module-scope consts that
runtime extraction cannot see.

**`tests/structure/`** (8 tests) — route manifest snapshot, plus five magic-path
guards: next-intl config location, the `messages/${locale}.json` template import
(depth-coupled), `next/font/local` src, `middleware.ts` location + default export
(**moving it silently disables all auth**), `public/` string URLs, and CSS import
paths (`css.d.ts` is `declare module "*.css"`, so a wrong path typechecks clean
and silently drops the styles).

**`tests/migration/moveMap.test.ts`** (temporary) — holds the frozen inventory
and asserts the live function set equals it with `MODULE_MOVES` applied. Add one
line per moved module; goes red at the exact commit that drops, renames, or flips
the kind/visibility/signature of any function.

### Deviations from the plan as written

1. **`--skipLibCheck false` is not a usable gate** (see 0.1 above). No plan step
   depended on it, but it removes the "0.3 downgrades to a ratchet" fallback —
   0.3 is load-bearing.
2. **The `next build` CI job needs 10 env vars, not 8.** The plan's list omits
   `NEXT_PUBLIC_ENVIRONMENT` (required by the client Zod schema in
   `src/lib/env/client/index.ts`) and `NEXT_PUBLIC_LIVEKIT_URL`. Also
   `CONVEX_JWT_PUBLIC_JWK` must be **parseable JSON**, not an arbitrary string,
   because `/.well-known/jwks.json` is `dynamic = "force-static"` and therefore
   `JSON.parse`s it at build time. Verified green with the corrected set.
3. **The route manifest pins the source path alongside the URL.** A URL-only
   manifest collapses root `layout.tsx` and `(headquarters)/layout.tsx` to the
   same `/` line, so renaming a route _group_ would not change the snapshot. The
   `← src/app/…` column closes that gap.
4. **Manifest derivation lives in `tests/support/routeManifest.ts`.** Both the
   structure snapshot and the frozen-baseline check compute it directly, so
   neither depends on the other having run first.
5. **`moveMap.test.ts` was created in Phase 0**, not deferred to the first
   migration commit — it needs the frozen baseline anyway and makes Phase 0
   self-verifying. It starts with `MODULE_MOVES = {}`.
6. **The first run was green.** The plan budgeted for a red first run surfacing a
   pre-existing dangling ref. There are none: all 107 paths resolve, all kinds
   match, and no circular imports exist.

### Files added / changed in Phase 0

```
tests/support/convexModules.ts              new  — module map + function inventory
tests/support/routeManifest.ts              new  — shared URL derivation
tests/convex/apiIntegrity.test.ts           new  — 15 tests
tests/convex/__snapshots__/inventory.txt    new  — 137 function signatures
tests/structure/routeManifest.test.ts       new  — 2 tests
tests/structure/magicPaths.test.ts          new  — 6 tests
tests/structure/__snapshots__/routes.txt    new  — 27 routes
tests/migration/moveMap.test.ts             new  — 3 tests   (TEMPORARY)
tests/migration/baseline.frozen.txt         new  — frozen    (TEMPORARY)
tests/migration/routes.frozen.txt           new  — frozen    (TEMPORARY)
.github/workflows/build.yml                 new  — next build gate (TEMPORARY)
.githooks/pre-push                          edit — + codegen:check block
package.json                                edit — + codegen, codegen:check
docs/testing.md                             edit — structural tier + contract
docs/folder-migration-progress.md           new  — this file
```

### Remaining Phase 0 item — needs you

**0.5 tag.** Tag the Phase 0 commit `pre-folder-migration` once you have
reviewed and committed. Not done automatically — it should point at a commit you
have signed off on.

```bash
git tag pre-folder-migration
```

**0.6 CI confirmation.** The build job is green locally with the corrected env
set. Confirm it is green **on GitHub Actions** before Phase 1 starts — the plan
is explicit that debugging env plumbing and a migration simultaneously is a trap.

---

## Phase 1 — Backend ⏳ Not started

Goes first because `src/` needs zero edits (0 `api.game.*` references, verified),
so it lands while the frontend tree is stable and creates no merge-conflict
surface.

- **Commit A** — `convex/lib/{phaseTransitions,speakingOrder,winConditions}.ts`
  → `convex/games/core/`. No registered functions, so **no deploy window
  needed** and it can ship on its own schedule. ✅ **Done (working tree, not
  yet committed).** 3 files moved, 14 import sites rewritten (+ 4 internal
  rewrites in `phaseTransitions.ts`), `npx convex codegen` regenerated
  `api.d.ts` (the only `_generated` change: 6 lines, `lib/*` → `games/core/*`).
  Gate order run green: **codegen → `tsc --noEmit` (exit 0) → `npm test`
  (497/497)**. `moveMap.test.ts` stays green with `MODULE_MOVES = {}` (zero
  functions moved), and `apiIntegrity`'s drift test flipped green only after
  codegen — confirming correction #1 live.
- **Commit B** — see below.

### Commit A — two verified corrections to the plan

Both re-confirmed against the working tree before touching anything:

1. **`npx convex codegen` IS required.** All three files are modules in
   `api.d.ts` (`lib/phaseTransitions`, `lib/speakingOrder`, `lib/winConditions`)
   even though they register **zero** Convex functions. The `_generated` drift
   test compares the bundler's full module-key set (not just function-bearing
   modules) against `api.d.ts`, so it stays red until regeneration. "No
   registered functions" = deploy-safe (no function paths change), **not**
   codegen-free. Because there are zero functions, `MODULE_MOVES` in
   `tests/migration/moveMap.test.ts` gets **no new entries** — it remaps
   `module:export` function ids, and these modules contribute none.

2. **`phaseTransitions.ts` has same-dir `./` imports** — the uniform `"../"` →
   `"../../"` depth bump does not cover them. The plan's "0 same-dir imports"
   fact was verified for `convex/game/*` (Commit B), not `convex/lib/`.

**Rewrites inside the moved files** (`convex/lib/X` → `convex/games/core/X`):

`phaseTransitions.ts` (depth +1, plus two same-dir imports):

- `"../_generated/server"` → `"../../_generated/server"`
- `"../_generated/dataModel"` → `"../../_generated/dataModel"`
- `"./games"` → `"../../lib/games"` _(games.ts stays in `convex/lib/`)_
- `"./speakingOrder"` → **unchanged** _(moves together into `games/core/`)_

`speakingOrder.ts`, `winConditions.ts`: no imports → no internal rewrites.

**Referrers to update** (14 import sites):

| File                                  | Old                         | New                                |
| ------------------------------------- | --------------------------- | ---------------------------------- |
| `convex/game/farewellSpeech.ts`       | `../lib/phaseTransitions`   | `../games/core/phaseTransitions`   |
| `convex/game/voting.ts`               | `../lib/phaseTransitions`   | `../games/core/phaseTransitions`   |
| `convex/game/nightPhase.ts`           | `../lib/phaseTransitions`   | `../games/core/phaseTransitions`   |
| `convex/game/dayPhase.ts`             | `../lib/phaseTransitions`   | `../games/core/phaseTransitions`   |
| `convex/game/dayPhase.ts`             | `../lib/speakingOrder`      | `../games/core/speakingOrder`      |
| `convex/admin/stats.ts`               | `../lib/winConditions`      | `../games/core/winConditions`      |
| `convex/game/gameLogs.ts`             | `../lib/winConditions`      | `../games/core/winConditions`      |
| `convex/admin/gameLogs.ts`            | `../lib/winConditions`      | `../games/core/winConditions`      |
| `convex/lib/games.ts`                 | `./winConditions`           | `../games/core/winConditions`      |
| `convex/games/core/types.ts`          | `../../lib/winConditions`   | `./winConditions`                  |
| `convex/tests/gameEngine.test.ts`     | `../lib/phaseTransitions`   | `../games/core/phaseTransitions`   |
| `tests/convex/speakingOrder.test.ts`  | `@convex/lib/speakingOrder` | `@convex/games/core/speakingOrder` |
| `tests/convex/winConditions.test.ts`  | `@convex/lib/winConditions` | `@convex/games/core/winConditions` |
| `tests/game/sportsDefinition.test.ts` | `@convex/lib/winConditions` | `@convex/games/core/winConditions` |
| `tests/game/gameDefinition.test.ts`   | `@convex/lib/winConditions` | `@convex/games/core/winConditions` |

Docs (`docs/*.md`) still reference the old `convex/lib/{winConditions,
phaseTransitions,speakingOrder}.ts` paths and a couple of code comments do too;
those are **left for C15** (the doc-rewrite commit) per the plan — comments and
prose are not behavior.

- **Commit B** — 14 files `convex/game/*` → `convex/games/core/`, plus
  `sportsNightPhase.ts` → `games/sports/nightPhase.ts`. **Function paths change**
  → hard cutover in a quiet window, Convex deploy first, then immediately promote
  the pre-built Vercel deployment. ✅ **Done — committed `e06b2ba`.**

Verification order is not negotiable: **`npx convex codegen` first**, then
`typecheck`, then `test`. Before codegen, `typecheck` is actively misleading —
now demonstrated, not theorized.

### Commit B — what was done

`convex/game/` is now **empty and gone**. 15 files moved (`git mv`, recorded as
renames): 14 → `games/core/`, and `sportsNightPhase.ts` → `games/sports/nightPhase.ts`
(the only rename that is not a pure directory move — module id
`game/sportsNightPhase` → `games/sports/nightPhase`).

**Relative imports** — 0 same-dir imports among the 15 (baseline held), so the
uniform `../` → `../../` depth bump applied cleanly. Imports that now resolve
within `games/` were collapsed to idiomatic siblings (`../games/core/X` → `./X`,
`../games/registry` → `../registry`, `../games/sports/X` → `../sports/X`).
**Gotcha:** two files (`players.ts`, `spectators.ts`) carry inline
`import("../_generated/…")` **type expressions** mid-file, not `from` imports —
the header-only pass and a `from`-anchored grep both miss them; `tsc` caught them
(TS2307). Swept with an `import\("\.\./` grep afterwards.

**Function-path strings & typed accessors rewritten** (all `game/*` →
`games/core/*`, except `sportsNightPhase` → `games/sports/nightPhase`):

- `convex/refs/game.ts` — 77 (4 sportsNightPhase → `games/sports/nightPhase`, 73 → `games/core/`)
- `convex/refs/history.ts` — 3 (`gameLogs`); `convex/refs/leaderboard.ts` — 1
- `games/core/webhookHandler.ts` — 2 `makeFunctionReference` strings (`players`, `spectators`); its 3rd ref (`lobby/games:removeInternal`) and `sessions.ts`'s lone `lobby/games` ref are unchanged
- `games/sports/nightPhase.ts:` self-schedule `internal.game.sportsNightPhase.*` → `internal.games.sports.nightPhase.*`
- `convex/tests/gameEngine.test.ts` — ~110 typed `api.game.*` / `internal.game.*` accessors, routed per-module (core vs `games.sports.nightPhase`)

**Safety-net maintenance** (part of the commit, by design):

- `apiIntegrity.test.ts` → `INTERNAL_REF_ALLOWLIST`: the 5 `game/*` entries → `games/core/*` (the test asserts the allowlist bidirectionally and rejects stale entries, so this is mandatory, not cosmetic). Two stale module-name comments refreshed.
- `moveMap.test.ts` → `MODULE_MOVES`: **15 entries added** (unlike Commit A, these modules DO register functions, so the frozen baseline must be remapped). `moveMap` green = every function survives at its new path with a byte-identical signature.
- `tests/convex/__snapshots__/inventory.txt` — regenerated via `vitest -u`. Diff is **id-column-only** (87 lines, path segment only); `moveMap` is the independent hash-level proof.

**Gate run (mandated order):** `codegen` → `tsc --noEmit` (exit 0, after fixing
the two inline-import misses) → `vitest run` (**497/497**, 1 snapshot updated) →
`vitest run` again clean.

Docs (`docs/*.md`) and a handful of code comments still name old `game/*` paths;
deferred to **C15** per plan (`internal.game.broadcasts.push` in `broadcasts.ts`
is comment-only — no live call site, so no behavior impact).

**Not yet done (deploy runbook, when shipping):** this commit changes public
function paths, so it is a hard cutover — **Convex deploy first**, then
immediately promote the pre-built Vercel deployment.

**Shippability verified (2026-07-31, commit `e06b2ba`):** zero `src/` files
changed across all of Phase 1 (`git diff f43441a..HEAD -- src` empty) — the refs
indirection means the frontend points at the new paths with no edits. Gate all
green: `convex codegen` drift-free, `tsc --noEmit` clean (incl. `src/`),
`vitest run` 497/497, and a full production `next build` succeeds (18 routes,
incl. `/game/[id]`). Backend is testable in isolation via the `convex-test`
engine suite (`convex/tests/gameEngine.test.ts`, 102 tests). Still pending: the
coordinated deploy (Convex first, then Vercel promote).

## Phase 2 — Frontend 🔨 In progress (C0–C14 committed, C15 underway)

16 commits (C0–C15). Per-commit gate: `rm -rf .next tsconfig.tsbuildinfo` →
`tsc --noEmit` → `vitest run` → `next build` → clean `git status`.

| Commit | Scope | Status |
| --- | --- | --- |
| C0 | ADR-011 (layout + sanctioned cycles/edges) | ✅ `ff1bfb7` |
| C1 | delete 16 unreferenced modules | ✅ `e285852` |
| C2 | normalize 21 cross-dir `../` imports → `@/` | ✅ `3973905` |
| C3 | split `components/game/` → room/phase/actions in place | ✅ `a53a1a5` |
| C4 | `src/lib/*` → `src/shared/lib` | ✅ `9477cd0` |
| C5 | `shared/ui` + `ui/icons` + `shared/hooks` | ✅ `12e6c48` |
| C6 | `components/providers` → `src/providers/` | ✅ `81adeee` |
| C7 | `features/admin` (pilot) | ✅ `49e33a7` |
| C8 | `features/auth` (middleware + API routes — fails silently) | ✅ `7116fcd` |
| C9 | `features/subscriptions` | ✅ `d64fd29` |
| C10 | `dashboard` → `features/headquarters` | ✅ `0a4b289` |
| C11 | `features/lobby` | ✅ `31e16cd` |
| C12a | `gameRoomContext` → `features/game-room/context` | ✅ `cecf0d3` |
| C12b | `participant/` + `video/ParticipantCover` → game-room | ✅ `f952367` |
| C12c | `card-picking`/`phase-controls`/`voting` → game-room | ✅ `25916cd` |
| C12d | `room`/`phase`/`actions`/`host`/`livekit`/`staff-tools` → game-room | ✅ `3b08cbd` |
| C12e | `hooks/{game,participant,livekit}` → game-room | ✅ `e7cef37` |
| C12f | `PhaseTitle`/`PhaseButton`/`ReadyButton`/`useDelayedDisable` → game-room (**cycle-killer**, not tsc-verified) | ✅ `cd8058d` |
| C12g | card assets + `game.css` → game-room (wildcard-typed, not tsc-verified) | ✅ `68ff89a` |
| C13 | `features/landing` | ✅ `01a849a` |
| C13-cleanup | dissolve `src/components/` (theme-provider, LanguageSwitcher, LevelBadge stragglers) → `@/components/` = 0 | ✅ `08cd8af` |
| C14 | `src/game/` → `features/game-room/variants/` (SCC-sensitive, separately revertable) | ✅ `c3c6d42` |
| C15 | `components.json` aliases + doc path refs + temp-artifact cleanup (build.yml demote, tests/migration delete) | 🔨 in progress |

**Invariant holding since C2:** `rg 'from "\.\.' src` → 0. Every move commit is a
`git mv` of a whole directory plus a pure `@/`-prefix codemod.
`git grep -c '"use client"' -- 'src/**'` baseline preserved: **219**
(the plan's 224 was pre-C1; C1 deleted 5 client components).

**Structural invariants now holding:** `@/components/` → **0** (after C13-cleanup),
`@/game/` → **0** once C14 lands. No uppercase directory segments remain under
`src/` (directories kebab-cased: `player-states`, `media-controls`, `host`,
`livekit`).

See the source plan for the full move table, cycle notes, and manual-QA list
(the frontend has ~zero component test coverage, so `next build` + manual QA are
the real gates for the big move commits).

## Post-migration cleanup (C15)

| Artifact                                                                                | Fate                                                      |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `tests/support/*`, `tests/convex/apiIntegrity.test.ts`, `tests/structure/*` + snapshots | **permanent** — the standing guard on 107 strings         |
| `codegen:check` script + pre-push block                                                 | **permanent**                                             |
| `tests/migration/` (moveMap + frozen baselines)                                         | ✅ deleted                                                |
| `.github/workflows/build.yml`                                                           | ✅ demoted to a `paths:`-filtered PR-only workflow        |
| `pre-folder-migration` tag                                                              | keep                                                      |

Also done in C15:

- `components.json` aliases repointed to the feature-first layout
  (`@/shared/ui`, `@/shared/lib`, `@/shared/lib/cn`, `@/shared/hooks`).
- Rewrote the `docs/architecture.md` directory section (both `convex/` and `src/`
  trees — it documented four files that never existed: `convex/auth.ts`,
  `convex/http.ts`, `ResendOTP.ts`, `ResendOTPPasswordReset.ts`).
- Swept stale `src/lib|hooks|components|game`-style path references out of the
  **current-guidance** docs (README, CLAUDE, frontend, game-design, server-time,
  game-broadcasts, community-chat, testing, authorization, subscriptions,
  ranking-system, admin-dashboard, sports-mafia).
- Corrected `docs/game-types-refactor-tasks.md` "24+ string paths" estimate
  (~83 for the `convex/game/*` move, 101 total in `refs/`).

**Deliberately left as historical narrative** (rewriting them would corrupt a
before/after refactor record): `docs/folder-migration-progress.md` (this file),
`docs/decisions.md` (ADR rationale), `docs/game-types-refactor-tasks.md` body,
and `docs/game-types.md` (a coherent "planned, not yet built" design doc whose
`src/game/*` design target is referenced throughout).

**Per user decision:** `.cursorrules` + `.cursor/rules/*.mdc` were left untouched
(not collapsed into `CLAUDE.md`).
