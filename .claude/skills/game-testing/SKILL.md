---
name: game-testing
description: Test conventions - which tier a new test belongs in, and what each checked-in snapshot means before you run vitest -u. Use when adding tests, when npm test fails, or before updating ANY snapshot or baseline.
---

# Testing

## Which tier

| Testing | Where | Environment |
| --- | --- | --- |
| Pure logic (rules, visibility, phases, layout) | `tests/game/`, `tests/convex/` | `node` |
| DB-coupled engine behaviour | `convex/tests/gameEngine.test.ts` | `edge-runtime` (per-file pragma) |
| Repo shape — paths, naming, docs | `tests/structure/` | `node` |
| Generated docs | `tests/docs/` | `node` |

Vitest's include glob is repo-wide, so a new file in any of these is picked up
with no config change. Tests are named `camelCase.test.ts`. Derivation logic
goes in `tests/support/` so more than one test can share it.

Tests live in a top-level `tests/` tree on purpose — not colocated — so they
stay out of the Convex function bundler.

## The snapshot contract

**Read this before typing `-u`.** There are five checked-in baselines and they
mean different things. Regenerating without reading the diff is how a
regression gets recorded as the new truth.

| File | A diff means | Usually |
| --- | --- | --- |
| `tests/structure/__snapshots__/routes.txt` | the **public URL surface moved** | a bug — a shuffled route group is a 404 for real users |
| `tests/convex/__snapshots__/inventory.txt` | a Convex function's signature changed | fine if you changed that function; **drift** if you did not touch it |
| `tests/structure/__snapshots__/conventionDebt.txt` | a structure/naming violation appeared or was fixed | may only **shrink** — never hand-add a line |
| `tests/structure/__snapshots__/docIndex.txt` | a doc moved, or a `§N` heading was renumbered | check nothing cites the section you renamed |
| `docs/generated/game-spec.md` | **the game rules changed** | regenerate with `npm run docs:generate` and read it |

`magicPaths.test.ts` has no snapshot: any failure there is a real breakage
(next-intl config location, the depth-coupled `messages/${locale}.json` import,
`next/font/local` src, `middleware.ts` location, `public/` URLs, CSS imports).

## Characterization tests are an oracle, not a spec

`tests/game/*` pin **current** behaviour so the variant refactor could move
modules safely. The rule:

> When code moves, change **only import paths**. Assertions stay constant.

If an assertion must change to go green, that is a **behaviour regression**, not
a refactor. Stop and confirm the change is intended before editing it.

## Gates

```
npm run lint && npm run typecheck && npm test
```

CI (`.github/workflows/tests.yml`) and `.githooks/pre-push` run exactly that on
every push and PR. Notes:

- **Lint fails on errors only.** Warnings are the convention backlog; the
  conventions test owns that ratchet.
- `build.yml` is **PR-only and path-filtered** to `src/**` and config. It is the
  only check that catches CSS/asset import paths, `next/font/local` src, and
  `"use client"` boundary violations — so a docs-only or tests-only change never
  runs it.
- `codegen:check` needs `CONVEX_DEPLOYMENT` and is skipped in CI. Its offline
  equivalent (the `_generated` drift assertion in `apiIntegrity.test.ts`) always
  runs.

## Adding a guard

Structure guards follow one shape, and it is worth matching:

- `const REPO_ROOT = new URL("../../", import.meta.url).pathname`
- sync `node:fs`, walk with `{ withFileTypes: true }`
- **collect `"where → what"` strings and assert the list is `[]`** — never a
  per-item `toBe(true)`, so one run reports every offender
- the second argument to `expect` is a message phrased as the **consequence**,
  not the condition
- a header comment that states the **silent failure mode** — why nothing else
  catches this
- allowlists get a companion test that fails on **stale** entries

Then fault-inject: break the thing on purpose, confirm the test fails and names
it, and revert. A guard nobody has seen fail is a guard nobody knows works.
