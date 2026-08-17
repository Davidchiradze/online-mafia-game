# Online Mafia

Real-time, video-based Mafia. Next.js 15 (App Router) + Convex (DB, server
functions, reactive queries) + LiveKit (WebRTC) + TailwindCSS/shadcn, TypeScript
strict, next-intl. Two playable variants: `japanese_mafia` (12 seats) and
`sports_mafia` (10).

## Game model card

Rules are **data**, not prose. Two registries are the only places allowed to
name a variant by string literal:

- backend `convex/games/registry.ts` → `getGameDefinition(gameType)`
- frontend `src/features/game-room/variants/registry.ts` → `getUiRuleset(gameType)`

Everywhere else, read the resolved definition/ruleset. Never `if (gameType === …)`.

| | `japanese_mafia` | `sports_mafia` |
| --- | --- | --- |
| Seats / factions | 12 / mafia, yakuza, citizens | 10 / mafia, citizens |
| Night model | `single-authority` (one picker, shared target) | `unanimous-vote` (every living mafia picks **privately**) |
| Variant extras | intro phase, seat-order kill succession | best move, 3rd-foul speaking ban, day-1 single-nominee skip |
| Rated | yes | no — absent from `RATING_CONFIG`, so rating is skipped |

`GameDefinition`: `id, seatCount, roles, roleDistribution, factions,
roleToFaction, teams, phases, nextPhase, night{kind,actingRoles,resolveKills},
decideWinner, describeWin, flags`. Pure — no `ctx.db`, no React, node-importable.
`visibility` and phase `timers` live on the **UI** ruleset, not here.

**Current values are generated: [docs/generated/game-spec.md](docs/generated/game-spec.md)** —
roles, decks, phase order, state machines, complete win tables. Never edit it;
run `npm run docs:generate`.

Precedence when sources disagree: **code beats docs, and a declared outcome
beats simulated parity.** Win conditions are declared tables — do not reason
about them from "mafia ≥ everyone else". For Japanese that shortcut is wrong in
81 of 280 cases.

## Where files go

```
src/features/<feature>/        kebab-case feature folder
  components/                  PascalCase.tsx, ONE component per file
    <group>/                   kebab-case, once a feature passes ~8 components
  hooks/                       useCamelCase.ts — ALL hooks, never colocated
  lib/                         camelCase.ts, pure, no JSX
  context/                     only if the feature owns a React context
src/shared/{ui,hooks,lib}/     anything used by 2+ features
src/app/                       routing table only — thin wrappers, no logic
convex/
  games/core/                  variant-agnostic engine
  games/<variant>/             that variant's rules (pure)
  lib/ tables/ refs/           helpers, schema fragments, client-facing refs
  admin/ auth/ community/ lobby/   feature endpoints
```

- Components `PascalCase.tsx`; hooks `useCamelCase.ts` in a `hooks/` dir;
  everything else `camelCase.ts`; directories kebab-case.
- **One component per file.** Split past ~200 lines.
- **Never inline `<svg>`.** Import from `lucide-react`; only if lucide lacks the
  icon, add it to `src/shared/ui/icons/` and export from the barrel.
- Props type is `<ComponentName>Props`. No helper functions inside component
  bodies (event handlers excepted) — they go in `lib/`.

`npm run lint` flags violations while you write; `tests/structure/conventions.test.ts`
is the gate. Six rules are at zero and hard-fail; the rest ratchet down from a
checked-in baseline that may only shrink.

## Rules you will otherwise break

1. **Auth**: `getAuthenticatedUser(ctx)` from `convex/lib/auth.ts` (88 uses).
   There is **no `getAuthUserId` and no `@convex-dev/auth`** in this repo — auth
   is a custom JWT bridge to an external PHP service. Gate with
   `requirePermission(...)` / `requireFeature(...)`, never a raw role compare.
2. **`convex/` must never import from `src/`.** One-way boundary; lint errors on
   it. Convex also resolves its own modules **relatively** (`../../lib/x`) — the
   `@/` and `@convex/` aliases are a `src/` convention only.
3. **Client calls Convex through `convex/refs/*.ts`**, not `api.*`. Those refs
   hold **106 raw function-path strings** that `tsc` cannot see, so moving or
   renaming anything under `convex/` breaks them **silently**. `npm test` is the
   only guard.
4. **Timers**: `useServerTime()` (`src/shared/lib/time/serverTime.ts`). Never
   subtract a server timestamp from a raw `Date.now()`.
5. **No `useEffect` for data** — `useQuery` is the subscription. No Redux/Zustand,
   no `"use server"` for game logic, no Socket.IO/Redis/custom WebRTC.
6. **i18n**: every user-facing string needs a key in **both** `messages/en.json`
   and `messages/ka.json`. **`ka` is the default locale**, so an English-only key
   ships a hole. 710 keys, currently at parity, and no test enforces it — a
   PostToolUse hook checks it on edit.

## Verify

```
npm run lint && npm run typecheck && npm test
```

That is the gate — CI and `.githooks/pre-push` run exactly it. `npx tsc` alone
is **not** the gate: the structural guards live in `npm test`, and they are what
catch a broken Convex move, a stale generated spec, or a doc pointing at a
deleted file. Lint fails on errors only; warnings are the tracked convention
backlog.

## Docs

[docs/README.md](docs/README.md) routes by question. The layout encodes a
contract:

- `docs/engine/` — mechanism true for **every** variant. A test forbids naming a
  role, phase, or seat count that only some variants have.
- `docs/variants/<id>/` — one variant's rules. Registering a variant fails the
  build until its doc exists.
- `docs/generated/` — derived from code. **Never hand-edit.**
- `docs/archive/`, `docs/proposals/` — historical / unbuilt. Not current.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
