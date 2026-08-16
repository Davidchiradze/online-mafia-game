---
name: mafia-rules
description: Authoritative Mafia game rules - who wins and when a game ends, phase order and what follows what, role decks and factions, night resolution, and how japanese_mafia differs from sports_mafia. Use for any question about game behaviour or when changing win conditions, phases, roles, or night actions.
---

# Mafia rules — where the truth is

This skill is **routing and provenance**, deliberately not a copy of the rules.
A cached rules table is how this codebase ended up with four disagreeing
rosters and a documented win rule that contradicted the code. Read the source
named below; it is short and self-documenting.

## Start here

**[docs/generated/game-spec.md](../../../docs/generated/game-spec.md)** is
generated from the definitions and is authoritative for anything derivable:
roles and deck counts, factions, phase order with timers and awake roles, the
phase state machines, complete win-condition tables, and night resolution.

It cannot be wrong about those things — it is regenerated from the same code the
game runs, and `npm test` fails if it drifts. **Where a hand-written doc
disagrees with it, the hand-written doc is wrong.**

## Question → source

| Question | Read |
| --- | --- |
| Who wins / when does the game end? | `#win-conditions` in the spec; rules + rationale in `docs/variants/japanese/win-conditions.md`, `docs/variants/sports/win-conditions.md` |
| *When* is the win check run, and by whom? | `docs/engine/win-check-seam.md` — shared, all variants |
| What phase follows X? | `#phases` and `#state-machine` in the spec |
| How many of role X / what's in the deck? | `#roles` in the spec |
| How is the night kill resolved? | `#night-model` in the spec; `convex/games/<variant>/nightModel.ts` |
| Who may act tonight? | `src/features/game-room/variants/<variant>/nightAuthority.ts` |
| Who can see whom right now? | `src/shared/lib/game/visibility.ts` + the variant's `visibility.ts` |
| How do the variants differ? | `docs/engine/variant-architecture.md` |
| Why is a rule the way it is? | the variant doc's "resolved decisions" section — rationale is the one thing not generated |

## Two things the tables cannot tell you

**Host-advance vs server-owned transitions.** In the phases table a phase either
names its successor or says `server-owned`. That distinction is the single most
useful fact about this state machine and is genuinely hard to reconstruct:

- **Host-advance** — `definition.nextPhase(phase)` returns a phase. The host
  clicks; the UI applies it. Most Japanese advances park in the shared
  `phase_transition` sleep buffer on the way.
- **Server-owned** — `nextPhase` returns `null`, because the successor depends
  on database state. A Convex mutation decides. These are listed with their
  owning file under `#branching-edges` in the spec: the day-phase nominee forks
  (`games/core/dayPhase.ts`), the dawn seam (`games/core/farewellSpeech.ts`),
  and the tie path (`games/core/voting.ts`).

**Declared outcomes beat simulated ones.** Win conditions are declared tables,
not derived from night mechanics. Where a stated rule and a plausible
simulation disagree, the stated rule wins. Concretely: do **not** reason from
"mafia win once they equal the rest". For Japanese that parity shortcut is
wrong in **81 of 280** reachable cases — it would end games above `N = 6`, which
the real rules forbid except by a single-faction sweep. Sports genuinely is a
parity rule; Japanese is not.

## Changing a rule

Rules are data. Edit the variant's module under `convex/games/<variant>/`, then:

1. `npm test` — the characterization suite in `tests/game/` pins current
   behaviour. **If an assertion has to change, that is a behaviour change, not a
   refactor.** Confirm it is intended before touching it.
2. `npm run docs:generate` — the spec is a snapshot; a rule change that is not
   regenerated fails CI.
3. Read the regenerated diff. It is the clearest statement of what you just
   changed.

Never edit `docs/generated/game-spec.md` by hand.
