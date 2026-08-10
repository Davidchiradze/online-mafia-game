# Testing

> Unit tests over the game's **pure logic**, plus CI that runs them on every
> push. The suite's primary job right now is to be the **regression oracle** for
> the game-types refactor (see [game-types.md](./engine/variant-architecture.md) §8: "Japanese is
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

**Unit tier** — pure, DB-free logic in `tests/`, mirroring the source tree
(runs in the `node` environment):

| Test file | Covers |
| --- | --- |
| `tests/convex/winConditions.test.ts` | `decideWinner` / `describeWin` / `winMethodLabel` — all N, sweeps, the N=5 Doctor+Yakuza `beforeNight` exception, N=4 clan exception, 1v1s |
| `tests/convex/roles.test.ts` | `roleToFaction` for every role + unknown → citizens |
| `tests/convex/speakingOrder.test.ts` | `computeSpeakingOrder` / `getNextSpeaker` (opener selection, wrap, dead-skip) |
| `tests/game/visibility.test.ts` | `canSeeParticipant`, `getAwakeRoles`, `isNightActivityPhase`, `getVisibilityState`/`WithDeath` |
| `tests/game/roleDisplay.test.ts` | `roleLabel`, `factionIcon`/`factionBadgeClass`, `ROLE_DISPLAY_CONFIG`/`getRoleEmoji`, the duplicated `roleToFaction` |
| `tests/game/phases.test.ts` | Exact `GAME_PHASES` ordering (both copies), Japanese role set, 12-card deck, team membership |
| `tests/game/phaseTransitionGraph.test.ts` | The deterministic host-advance graph transcribed from the phase buttons (spec for `definition.nextPhase`) |
| `tests/game/gameDefinition.test.ts` | The Japanese `GameDefinition` — registry resolution, deck, factions, teams, flags, every `nextPhase` edge, `resolveKills` |
| `tests/game/sportsDefinition.test.ts` | The same for Sports, plus the §7 worked examples and `describeWin` snapshots |
| `tests/game/phaseFlow.test.ts` | `advanceUpdates` — buffered vs direct host-advance, and the throw on an unknown phase |
| `tests/game/nightAuthority.test.ts` | Who may act tonight, per variant (single-authority vs every-living-mafia) |
| `tests/game/seatLayout.test.ts` | Ring geometry for the 12- and 10-seat layouts |
| `tests/game/uiRegistry.test.ts` | Frontend ruleset resolution and per-variant `phaseControls` key coverage |
| `tests/game/dayRoundFouls.test.ts` | Day-round derivation and the foul speaking ban |
| `tests/game/bestMove.test.ts` | Sports best-move eligibility and completion |

Unit tests live in a top-level `tests/` tree **on purpose** — not colocated in
`convex/` — so they stay out of the Convex function bundler.

**Integration tier** — DB-coupled Convex logic via
[`convex-test`](https://docs.convex.dev/testing/convex-test), in
`convex/tests/gameEngine.test.ts` (runs in the `edge-runtime` environment):

| Area | Covers |
| --- | --- |
| Night kill authority | mafia `DON > MAFIA_RIGHT_HAND > MAFIA`, yakuza `SHOGUN > YAKUZA` (lone SHOGUN can't kill), doctor |
| Night kill resolution | `startFarewellSpeech` — heal saves, dual kills, dedup, no-kill → day, host-only |
| Phase transitions + win check | `enterNightPhase` / `enterDayPhase` / `enterVotingPhase`, pause-on-win, no-contest, idempotency |
| Role deal + promotion | `assignRandomRoles` (deck = distribution), `promoteToRightHand` (Don-only, MAFIA-only, once, right phase) |

### convex-test conventions

- **Under `convex/tests/`** and globs the whole tree with
  `import.meta.glob("../**/*.*s")` — convex-test derives the module root from the
  `_generated` key, so the `../` prefix is stripped and `api.*` paths resolve.
  Convex's bundler skips any file whose basename has more than one dot
  (`bundler/index.js`), so `*.test.ts` is **never deployed** by
  `convex dev`/deploy. ⚠️ Any non-test helper placed in `convex/tests/` **would**
  be bundled — give helpers a multi-dot name (e.g. `seed.helpers.ts`) or keep the
  folder to `*.test.ts` only.
- **Per-file environment:** the first line is `// @vitest-environment edge-runtime`
  (convex-test needs it) — the rest of the suite stays on `node`. No Vitest
  `projects` split needed.
- **`import.meta.glob` typing:** add `/// <reference types="vite/client" />` so
  `tsc` (and CI) accept the Vite-only glob.
- **Helpers** must be typed `TestConvex<typeof schema>` (not
  `ReturnType<typeof convexTest>`, which drops the schema's table indexes).

**Structural tier** — guards on things that are true of the repo's *shape*
rather than its logic. These exist because a whole class of breakage in this
codebase is invisible to both `tsc` and `vitest`. See
[Structural tests](#structural-tests-the-safety-net-on-magic-strings) below.

| Test file | Covers |
| --- | --- |
| `tests/convex/apiIntegrity.test.ts` | All raw Convex function-path strings resolve, with the right kind + visibility; `_generated` drift; a signature snapshot of every function |
| `tests/structure/routeManifest.test.ts` | The public URL surface derived from `src/app/**` |
| `tests/structure/magicPaths.test.ts` | next-intl config location, the `messages/` dynamic import, `next/font/local` src, `middleware.ts` location, `public/` URLs, CSS import paths |
| `tests/structure/docLinks.test.ts` | Doc↔doc links, backticked repo paths, doc citations from source, and every `§N` a code comment cites; the `CLAUDE.md → AGENTS.md` symlink |
| `tests/structure/conventions.test.ts` | File naming, folder placement and decomposition — six rules at hard zero, the rest on a shrinking baseline |
| `tests/structure/variantDocs.test.ts` | Every registered variant has a doc; no variant-specific vocabulary in `docs/engine/` |

**Generated tier** — `tests/docs/gameSpec.test.ts` regenerates
`docs/generated/game-spec.md` from the game definitions and fails on drift, so a
rule change that is not reflected in the docs cannot merge. See
[Documentation and convention guards](#documentation-and-convention-guards).

## Structural tests: the safety net on magic strings

### Why this tier exists

`convex/_generated/` is **committed to git** and `tsconfig.json` sets
**`skipLibCheck: true`**. `api.d.ts` imports real relative paths
(`import type * as game_bestMove from "../game/bestMove.js"`). Move a Convex file
without regenerating and that import becomes unresolvable — but `skipLibCheck`
suppresses the diagnostic, the type silently degrades to `any`, and every
`api.game.*` call site typechecks clean.

This was verified empirically, not assumed. Renaming `convex/games/core/bestMove.ts`
and updating its refs strings:

```
npx tsc --noEmit                      → exit 0   ← false green
npx tsc --noEmit --skipLibCheck false → TS2307 in api.d.ts(20,37)
```

Since `.githooks/pre-push` and `.github/workflows/tests.yml` run only
`tsc --noEmit` + `vitest`, **a broken backend move could be committed, pushed,
and pass CI green.** `--skipLibCheck false` cannot be adopted as a standing gate
either: `node_modules` (`@livekit/components-core`, `next-intl`) carries its own
pre-existing `TS2307`s.

On top of that, **107 Convex function paths are raw strings** invisible to `tsc`:

| Location | Count |
| --- | --- |
| `convex/refs/game.ts` | 77 |
| `convex/refs/{lobby,history,admin,leaderboard}.ts` | 24 |
| `convex/{games/core/webhookHandler,games/core/sessions,admin/games}.ts` | 5 |
| `src/providers/PresenceBootstrap.tsx` (`sendBeacon`) | 1 |

Three of these fail **silently**: the LiveKit webhook route catches errors and
returns HTTP 200; `api/auth/sync-profile` is the PHP auth bridge (a total auth
outage); and the scheduler refs in `game/voting` + `game/cardPicking` hang a live
game mid-round with no client-visible error.

### How it works

`tests/support/convexModules.ts` derives the deployed module set from a
**transcription of the Convex bundler's own `entryPoints()` rules**
(`node_modules/convex/src/bundler/index.ts:395-493`), then imports each module
and classifies its exports using the markers Convex's registration helpers set
(`isQuery`/`isMutation`/`isAction`/`isHttp`, `isPublic`/`isInternal`,
`exportArgs()`/`exportReturns()` — from
`node_modules/convex/src/server/impl/registration_impl.ts`). Current totals:
**81 modules, 137 functions**, all importable in the `node` environment.

Function paths are extracted from source with the **TypeScript compiler API**,
not regex. The codebase uses two syntactic variants of `makeFunctionReference`
(single-line, and a multi-line form with the type arguments split across lines);
both parse to an identical `CallExpression`, so `typeArguments[0]` (the declared
kind) and `arguments[0]` (the path) pair up with no special-casing. Runtime
extraction would not work — the kind type-argument is erased at runtime, and 5 of
the call sites are non-exported module-scope consts.

A side benefit: `exportArgs()` throws on circular imports, so the inventory
doubles as a **circular-import detector** — exactly the class of bug a folder
move introduces.

### Maintenance contract

Two allowlists in `tests/convex/apiIntegrity.test.ts` need upkeep. Both are
deliberately strict; loosening either removes the guarantee.

**`EXTRA_RAW_PATHS`** — Convex functions invoked by raw string *outside*
`makeFunctionReference`, and therefore invisible to the AST extractor. Currently
one entry: the `presence:disconnect` `sendBeacon` in `PresenceBootstrap.tsx`.

- Every entry carries a `guard`: a verbatim substring that must still exist in
  the named file. So deleting or reshaping the call site fails the test rather
  than silently orphaning the entry.
- Add an entry when a new raw-string invocation appears (`sendBeacon`, a `fetch`
  to `/api/mutation`, etc). The **ratchet** test will tell you: it flags any
  udf-shaped string literal that resolves to a real Convex function but is not
  tracked.

**`INTERNAL_REF_ALLOWLIST`** — the 6 function references that legitimately
target `internal*` functions (reached via `ctx.scheduler`/`ctx.runMutation` from
trusted server code, never the browser):
`game/voting:endVoteWindowInternal`, `game/voting:endBothLeaveVoteInternal`,
`game/cardPicking:expireTurnInternal`, `game/players:leaveAdminInternal`,
`game/spectators:leaveAdminInternal`, `lobby/games:removeInternal`.

- Asserted **bidirectionally**: a listed path must be internal, and an unlisted
  path must be public. Both directions of a visibility flip are therefore loud —
  a client-facing ref silently becoming internal (breaks at runtime) *and* an
  internal function silently becoming public (widens the attack surface).
- Do **not** replace this with "all refs are public" — that assertion is simply
  false here.

**Snapshots.** `tests/convex/__snapshots__/inventory.txt` holds one line per
function: `kind | visibility | module:export | hash(args) | hash(returns)`. The
validator hashes pin every signature, making it the strongest cheap proxy for
"zero behavior change". Update it with `npx vitest run -u` **only** when a
signature change is intentional.

## Documentation and convention guards

The structural tier above guards *code* shape. Three more guards extend the same
idea to documentation and to file placement, for the same reason: nothing else
in the toolchain has an opinion, so the failure is always silent.

### What each one catches

| Guard | Silent failure it prevents |
| --- | --- |
| `docLinks.test.ts` | Markdown is never compiled. A doc can name a file deleted three refactors ago, or cite a `§N` heading that was renumbered, and every gate stays green. The only consumer that notices is an agent, which follows the pointer and then greps the whole repo to recover — costing more than if the doc had said nothing. **89 source comments cite a numbered doc section.** |
| `conventions.test.ts` | `tsc` resolves any path. A component in the wrong directory, a hook that never reached a `hooks/` folder, or a 500-line file holding eight components all ship clean. |
| `variantDocs.test.ts` | The project shipped with one variant, so docs were written as if Japanese Mafia were simply "the game". When Sports landed nothing noticed that a generically-titled doc, cited from shared-engine files, described a SHOGUN and a DOCTOR that Sports does not have. |
| `gameSpec.test.ts` | A hand-written rules table has no relationship to the code. `game-design.md` claimed `CITIZEN (2x)` against a five-citizen deck, and a naive-parity win rule that is wrong in 81 of 280 reachable cases. |

### The three ratchets

Each carries a baseline that can only move one way, and **fails in both
directions** — so it can never silently stop being accurate.

| Baseline | Rule |
| --- | --- |
| `KNOWN_ABSENT` in `docLinks.test.ts` | Empty, and asserted empty. A doc naming a non-existent file is fixed, not allowlisted. |
| `conventionDebt.txt` | May only shrink. Fixing a violation without regenerating also fails — that is deliberate, so the file stays true. |
| The phase-universe drift assertion | Asserted as an exact list, not a maximum. Closing the known drift fails until the spec is regenerated. |

Two narrower allowlists exist, both self-invalidating:

- **`HISTORICAL_PATHS`** — old paths a doc names *on purpose*, because naming
  them is the content (an ADR recording a move). Keyed by `(doc, path)`, not
  path alone: `convex/lib/winConditions.ts` was legitimate history in this file
  and simultaneously a wrong live claim in three others. Each entry must prove
  its replacement resolves.
- **Firewall exemptions** in `variantDocs.test.ts` — `variant-architecture.md`
  is exempt because comparing variants is its subject. Each exemption is checked
  for staleness.

### Regenerating

```
npm run docs:generate     # rewrite docs/generated/game-spec.md
npm run docs:check        # verify it, without rewriting
npx vitest run tests/structure -u   # update a structure baseline
```

**Read the diff before accepting any of them.** A snapshot change is either
progress or a regression, and the two look identical to the tool. See the
`game-testing` skill for what each baseline means.

Never hand-edit `docs/generated/**` or `conventionDebt.txt`.

### Lint

`eslint.config.mjs` is wired into CI and pre-push, and its severities encode
debt rather than importance:

- **error** — the codebase satisfies this today (currently: the one-way
  `convex/` → `src/` boundary). Breaking it is a regression introduced now.
- **warn** — a pre-existing backlog exists. Erroring would fail CI on day one or
  need ~86 disable comments, and buys nothing `conventions.test.ts` does not
  already guarantee. Promote a warn to error once its baseline reaches zero.

ESLint is the fast in-editor signal; the tests are the gate that cannot be
bypassed.

### `npm run codegen` / `codegen:check`

| Command | What it does |
| --- | --- |
| `npm run codegen` | `convex codegen` — regenerate `convex/_generated` |
| `npm run codegen:check` | regenerate, then `git diff --exit-code convex/_generated` (fails if stale) |

`codegen:check` runs in `.githooks/pre-push`, **guarded on `$CONVEX_DEPLOYMENT`
being set** and skipped silently otherwise. It cannot run in CI: it needs
deployment credentials and performs a network push, and the offline
`--system-udfs` path omits the `components` block the committed `api.d.ts`
carries. The offline `_generated` drift assertion in `apiIntegrity.test.ts`
covers CI instead. ⚠️ **Point `CONVEX_DEPLOYMENT` at a dev deployment, never
prod.**

## The testing tiers (strategy)

1. **Unit** — pure logic; highest ROI, deterministic, fast.
2. **Integration** — `convex-test` over the DB-coupled engine (see above). This
   is where the night model, win detection, and phase transitions are pinned —
   the deepest migration divergences.
3. **Structural** — the magic-string / repo-shape guards above. Cheap (~ms),
   offline, and the only tier that can see the failure modes described there.
4. **E2E — deferred / likely skipped.** A real-time, multi-player, WebRTC game
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
  [sports-mafia.md](./variants/sports.md).

### Known drift the suite pins

`GAME_PHASES` is **duplicated and out of sync**:
`src/shared/lib/constants/game.ts` has **22** phases (includes `phase_transition`),
`convex/lib/constants.ts` has **21** (no `phase_transition`).
`tests/game/phases.test.ts` locks both current forms and flags this, so when the
refactor collapses them into `definition.phases` it is a deliberate, visible
diff rather than a silent change.

## Pre-push hook (local)

A local Git **pre-push** hook runs the same checks before a push leaves your
machine, so failures are caught earlier than CI:

- Script: [`.githooks/pre-push`](../.githooks/pre-push) — runs
  `npm run typecheck`, then `npm test`, then (only when `$CONVEX_DEPLOYMENT` is
  set) `npm run codegen:check`; a failure aborts the push.
- It is **version-controlled** (committed under `.githooks/`) and wired via
  `core.hooksPath=.githooks`, which the `prepare` npm script sets automatically
  on `npm install`. No `husky` dependency. To activate manually in a fresh
  clone: `git config core.hooksPath .githooks`.
- **Bypass in an emergency:** `git push --no-verify`.

## CI

[`.github/workflows/tests.yml`](../.github/workflows/tests.yml) runs on **every
push (any branch) and every pull request**: `npm ci` → `npm run typecheck` →
`npm run lint` → `npm test`. Lint fails on **errors only**; warnings are the
tracked convention backlog, ratcheted by `conventions.test.ts` in the same run. In-progress runs are cancelled when new commits land on the same
ref. Because `convex/_generated` is committed, the typecheck needs no Convex
deployment. CI is the backstop; the pre-push hook is the same gate run locally.

[`.github/workflows/build.yml`](../.github/workflows/build.yml) runs
`npm run build` — **temporary, for the duration of the folder-structure
migration** (see
[archive/folder-migration-2026-08.md](./archive/folder-migration-2026-08.md)).
It exists because `next build` is the only automated check that catches CSS
paths, static-asset paths, `next/font/local` src paths, and `"use client"`
boundary violations — all invisible to `tsc` and `vitest`, and all reachable by a
file move. It needs 10 dummy env vars because `src/shared/lib/env/{server,client}`
parse `process.env` at module scope; `CONVEX_JWT_PUBLIC_JWK` must be parseable
JSON because `/.well-known/jwks.json` is `dynamic = "force-static"` and so is
prerendered at build time.

**Why `next-env.d.ts` is committed (not gitignored):** it supplies the ambient
declarations for static asset imports (`import don from "….png"` →
`StaticImageData`). Next only (re)generates it during `next dev`/`next build`, so
it is absent in a fresh CI checkout — and then `tsc --noEmit` fails on image
imports (`TS2307`, or the wrong `string` type) even though it passes locally.
Committing it keeps the typecheck identical in CI and locally. (A `types/*.d.ts`
shim was tried first but a subdirectory `declare module "*.png"` did not take
effect; the real root-level file is the reliable fix, and Next's docs sanction
committing it.)
