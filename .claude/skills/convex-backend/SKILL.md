---
name: convex-backend
description: Repo-specific Convex patterns - getAuthenticatedUser (there is no getAuthUserId here), requirePermission/requireFeature, the games/core vs games/<variant> split, refs/ vs api.*, ConvexError codes, and why moving a file under convex/ breaks things silently. Use when editing anything under convex/.
---

# Convex in this repo

Generic Convex is omitted. Everything here is something this codebase does
differently from the docs, or something that fails quietly.

## Auth — the ladder

**There is no `getAuthUserId` and no `@convex-dev/auth` in this repo.** Auth is a
custom JWT bridge to an external PHP service. Code written against the Convex
Auth docs will not compile.

From `convex/lib/auth.ts`, in increasing specificity:

- `getAuthenticatedAccountId(ctx)` — the bridged external account
- `getAuthenticatedProfile(ctx)` — the Convex-side profile row
- `getAuthenticatedUser(ctx)` — **the default. 90 call sites.** Start here.

Then gate, never with a raw role comparison:

- `requirePermission(ctx, PERMISSION)` (27 uses) — staff/admin capabilities
- `requireFeature(ctx, FEATURE)` (19 uses) — subscription entitlements

Both read from `convex/lib/access.ts`, which is the single source for server and
web layers. `profiles.role` is Convex-owned and unrelated to the PHP account
role.

## Directory contract

| Directory | Holds |
| --- | --- |
| `games/core/` | the variant-agnostic engine — voting, speaking order, fouls, card picking, phase transitions, farewell, logs |
| `games/<variant>/` | that variant's **pure** rules: definition, phases, nightModel, winConditions |
| `games/registry.ts` | `getGameDefinition` — the only backend file allowed to name a variant literally |
| `lib/` | helpers: auth, access, constants, games |
| `tables/` | schema fragments |
| `refs/` | client-facing typed function references |
| `admin/ auth/ community/ lobby/` | feature endpoints |

**Definitions stay pure**: no `ctx.db`, no React. That is what lets them be
imported by the frontend and unit-tested in the node environment. Breaking it
breaks the generator and the UI ruleset both.

**`convex/` never imports from `src/`.** Lint errors on it. And imports inside
`convex/` are **relative** (`../../lib/constants`) — Convex's bundler does not
read tsconfig paths, so `@convex/` does not work here.

## Shared reads live in `lib/`, never re-declared per file

A `db` read helper used by two or more modules belongs in `convex/lib/` and is
imported. Do not re-declare it at the top of each file that needs it.

`lib/games.ts` is the existing home for game-shaped reads — `getGameById`,
`getPlayerInGame`, `getPlayersByGameId`, `getJoinRequestByRequester`. New ones
go beside them.

Before writing a private `async function get…(db, …)`, grep for the name. The
cost of getting this wrong is not style: `getGameSession` exists as **six
byte-identical copies** (`games/core/{bestMove,dayPhase,nightPhase,farewellSpeech,phaseTransitions}.ts`
and `games/sports/nightPhase.ts`), and every one of them throws
`new ConvexError("Game session not found")` — a bare string, which breaks the
`{ code, message }` contract below, so the client cannot translate it. One bug,
copied six times, fixable in six places. Fold these into `lib/games.ts` when you
next touch one.

Type the parameter `DatabaseReader` unless the helper writes. `DatabaseWriter`
extends it, so a reader signature accepts both and the helper stays usable from
queries.

## Writes: name the transition, don't wrap the patch

**Do not add a generic `updateSession(db, id, fields)` wrapper.** `ctx.db.patch`
is already exact-typed against the schema; wrapping it generically trades that
for a bag and buys no safety. `games/core/sessions.ts:update` is what that
approach becomes — a hand-maintained validator list that drifts from the schema,
`Record<string, unknown>`, and a null→undefined dance. Do not extend the
pattern.

The duplication worth removing is **semantic**: the same state transition
re-spelled at many call sites. Extract those as named helpers.

```ts
// no — pass-through, loses field types, protects nothing
await updateSession(ctx.db, id, { currentSpeakerIndex: n, speakerStartedAt: iso });

// yes — the invariant is now unbreakable and the clock format has one owner
await startSpeaker(ctx.db, session, n);
await pauseSpeaker(ctx.db, session);
```

Why it matters here: `speakerStartedAt` must be set exactly when
`currentSpeakerIndex` names a live speaker and cleared otherwise. A hand-written
patch can set one and forget the other; a named transition cannot. Same for
`votingActive` / `votingStartedAt`. Timestamps are also not uniform —
`speakerStartedAt` and `votingStartedAt` are ISO `v.string()`,
`phaseStartedAt` is epoch `v.number()` — so each transition helper is the one
place that has to encode its clock correctly.

Rules when writing a mutation:

- **One patch per document per handler.** Build the object across your branches,
  apply it once at the end. `games/core/dayPhase.ts` patches the same `player`
  three times in the foul handler; that is the shape to avoid. Convex mutations
  are transactional so this is not a correctness bug, but it hides the final
  state from the reader.
- If a multi-field patch shape appears at a second call site, extract it as a
  named transition before adding the third.
- Keep transition helpers next to the state they own — session transitions in
  `games/core/`, not `lib/` — and keep them variant-agnostic. Anything a single
  variant needs is gated on a definition flag, never on `gameType`.

## The silent-failure section

This is the part worth internalising.

`convex/_generated/` is **committed** and `tsconfig.json` sets
**`skipLibCheck: true`**. So when a Convex module moves, `api.d.ts` keeps
importing a path that no longer exists, the diagnostic is suppressed, the type
degrades to `any`, and **`tsc --noEmit` exits 0.** Verified: the same check with
`--skipLibCheck false` reports `TS2307`.

On top of that, **106 Convex function paths are raw strings** in `convex/refs/*`
that `tsc` cannot see at all.

Three of those fail with no visible symptom:

- the **LiveKit webhook** route catches errors and returns HTTP 200
- **`sync-profile`** is the PHP auth bridge — breaking it is a total auth outage
- **scheduler refs** in `games/core/voting` and `games/core/cardPicking` hang a
  live game mid-round with no client-side error

`npm test` is the only guard (`tests/convex/apiIntegrity.test.ts`). After moving
or renaming anything under `convex/`, run it. Do not trust a green `tsc`.

## Errors and i18n

Throw `ConvexError({ code, message })`. The client maps `code` to a translated
string via `errors.<CODE>` in `messages/{en,ka}.json`. A new code needs a key in
**both** locale files — `ka` is the default locale, so an English-only entry
ships a hole.

## Tests

`convex/tests/*.test.ts` runs under `edge-runtime` via a per-file
`// @vitest-environment edge-runtime` pragma. Convex's bundler skips any file
whose basename has more than one dot, so `*.test.ts` is never deployed —
but a **non-test helper** placed in `convex/tests/` *would* be. Give helpers a
multi-dot name (`seed.helpers.ts`).
