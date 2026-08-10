# Documentation

Routing table. Find your question, read that one file.

The folder a doc lives in is a contract:

| Folder | Means |
| --- | --- |
| `docs/` | cross-cutting — true regardless of game variant |
| `docs/engine/` | shared game engine. A test forbids naming a role, phase or seat count that only some variants have |
| `docs/variants/<id>/` | one variant's rules. Registering a variant fails the build until its doc exists |
| `docs/integrations/` | written to be **handed to another team**. The audience is outside this repo, so it describes a contract, never our internals |
| `docs/generated/` | derived from code. **Never hand-edit** — run `npm run docs:generate` |
| `docs/archive/` | frozen at the date in the filename. Historical, deliberately not current |
| `docs/proposals/` | designed, **not built**. Do not assume any of it exists |

## I need to…

| …know | Read | What it will **not** tell you |
| --- | --- | --- |
| roles, decks, phase order, win outcomes | **[generated/game-spec.md](./generated/game-spec.md)** | *why* any rule is the way it is |
| how a game ends, and when the check runs | [engine/win-check-seam.md](./engine/win-check-seam.md) | which faction wins — that is per-variant |
| the Japanese rules | [variants/japanese/rules.md](./variants/japanese/rules.md), [win-conditions.md](./variants/japanese/win-conditions.md) | anything about Sports |
| the Sports rules | [variants/sports.md](./variants/sports.md) | the Japanese baseline it diffs against |
| how to add or change a variant | [engine/variant-architecture.md](./engine/variant-architecture.md) | current values — those are generated |
| the stack and how data flows | [architecture.md](./architecture.md) | any game rule |
| Convex patterns, mutations, queries | [backend.md](./backend.md) | React conventions |
| React and UI conventions | [frontend.md](./frontend.md) | where files go — that is [AGENTS.md](../AGENTS.md) |
| real-time subscriptions | [realtime.md](./realtime.md) | LiveKit media |
| timer and countdown math | [server-time.md](./server-time.md) | phase durations — generated |
| who may do what (staff, admin) | [authorization.md](./authorization.md) | paid-feature gating |
| paid-tier gating | [subscriptions.md](./subscriptions.md) | staff permissions |
| ELO and levels | [ranking-system.md](./ranking-system.md) | Sports payouts — it is unrated by design |
| the admin panel and analytics | [admin-dashboard.md](./admin-dashboard.md) | — |
| global chat and presence | [community-chat.md](./community-chat.md) | per-game notifications |
| per-game notifications | [game-broadcasts.md](./game-broadcasts.md) | global chat |
| how to test, and what a snapshot means | [testing.md](./testing.md) | — |
| why something is the way it is | [decisions.md](./decisions.md) | how it currently works |
| the LiveKit server | [livekit-server.md](./livekit-server.md) | client-side media code |
| the stats API mafia.ge calls | [public-api.md](./public-api.md) | the PHP side's own code — hand them [integrations/mafia-ge-player-stats.ka.md](./integrations/mafia-ge-player-stats.ka.md) |

## Before you code

1. **[AGENTS.md](../AGENTS.md)** is the entry point — game model card, where
   files go, and the rules that are easiest to get wrong.
2. Read the one doc above that matches your question. Do not read them all.
3. Use `Doc<"tableName">` / `Id<"tableName">` from `convex/_generated/dataModel`.
   Do not invent types.
4. Gate: `npm run lint && npm run typecheck && npm test`.

## When a doc and the code disagree

The code wins, and the generated spec wins over prose. Fix the doc in the same
commit — `tests/structure/docLinks.test.ts` will already have told you if a doc
names a file that does not exist.
