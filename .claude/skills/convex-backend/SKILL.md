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
