# Sports Mafia — Win Conditions

> **Scope: `sports_mafia` only.** These are the rules the Sports variant
> evaluates. *When* they are evaluated, who calls them, and what happens when
> one fires are variant-agnostic and documented once in
> [engine/win-check-seam.md](../../engine/win-check-seam.md).
>
> Implemented in `convex/games/sports/winConditions.ts` (`decideSportsWinner` /
> `describeSportsWin`, both pure). Japanese has its own rules — context-sensitive,
> per-`N` declared tables — in
> [japanese/win-conditions.md](../japanese/win-conditions.md).
>
> The rest of the Sports ruleset (night model, best move, day rules) is in
> [rules.md](./rules.md); this doc owns §7 of it.

## 1. Purpose

> Moved. The detection-vs-confirmation model, and why a pure helper runs at the
> phase-transition seams at all, are shared engine concerns:
> [engine/win-check-seam.md §1](../../engine/win-check-seam.md).
>
> What remains Sports-specific is *which* faction wins at which alive-count —
> §5 through §7 below — and it is one rule with no exceptions.

## 2. Factions

> **Generated.** Faction membership and starting counts: [game-spec.md#roles](../../generated/game-spec.md#roles).

Two factions, which is the whole reason this variant's rule is a flat parity
check rather than Japanese's declared tables:

- **`m`** = alive Mafia-faction players (`DON` + `MAFIA`). Nothing else counts
  as mafia — `sportsRoleToFaction` maps every other role to `citizens`.
- **Town** = `DETECTIVE` / `CITIZEN` (Citizens faction).
- **`N`** = total alive role-holders.

There is **no Yakuza clan and no Shogun**, so the shared `WinMethod` snapshot
reports `yakuzaAlive: false` and `shogunAlive: false` unconditionally, and no
headline `decidedRole` — the fields exist only because the snapshot type is
shared across variants (`convex/games/core/types.ts`).

## 3. Role abilities that matter for win detection

- **Mafia** can kill at night, but only by **unanimous private vote among every
  living mafia** ([rules.md §5.2](./rules.md)) — disagreement or a single
  abstention means no kill that night.
- **There is no Doctor**, so a resolved target is never saved. Nothing in the
  night can undo a kill.
- **Detective** only gathers information — **no effect on win detection**
  (counts purely as Town).
- **No role presence changes the answer.** The spec generator derives the
  smallest sufficient key for the decision table and it comes out as `N` and `m`
  alone — see §6.

## 4. When the check runs

> Mostly moved. The two transition seams (`enterNightPhase` / `enterDayPhase`),
> their full caller list, and the immediate re-check after an eliminating foul
> are shared engine mechanism:
> [engine/win-check-seam.md §4–§5](../../engine/win-check-seam.md).

What is Sports-specific is what it does with the context:

- The seam supplies a `beforeNight` / `beforeDay` context on every call. **Sports
  ignores it entirely** — the parameter is kept only for interface compatibility
  with `GameDefinition.decideWinner`. Every roster evaluates identically in both
  contexts, and the generated table prints both columns so that is checkable
  rather than asserted.
- The `best_move` phase cannot collide with a win check: the worst case at
  night-1 dawn is one day-1 elimination plus one kill, which leaves 3 mafia vs.
  5 citizens → continue ([rules.md §6.8](./rules.md)).

## 5. Global rules (apply at any `N`)

0. **No contest (`N = 0`)** is checked first and is shared engine behaviour —
   see [engine/win-check-seam.md §6](../../engine/win-check-seam.md). It matters
   here for the same reason it does in Japanese: `m = 0` is *vacuously true*
   when nobody is alive, so without the earlier `N = 0` check this variant would
   mis-declare a Citizens win on total mutual elimination.

1. **Citizens win when `m = 0`.** Every mafia eliminated ends the game
   immediately, at any `N`.

2. **Mafia win at parity or better: `2m ≥ N`.** Equivalently `m ≥ N - m`, which
   is how the code reads.

3. **Otherwise the game continues.** There is no `N ≤ 6` ceiling, no
   role-presence carve-out and no per-`N` exception of any kind.

**Sports needs no single-faction sweep rule.** Japanese carries one because two
deaths in a single night can skip past the `N = 2` boundary its per-`N` tables
stop at. Parity has no boundary to skip: an all-mafia roster satisfies `2m ≥ N`
trivially and an all-town roster satisfies `m = 0`, so any sweep is already
decided by rules 1 and 2.

## 6. Decision table

> **Generated.** Every reachable alive-roster, in both contexts:
> [game-spec.md#win-conditions](../../generated/game-spec.md#win-conditions).

The columns are `N` and `m` — and that is a **derived** result, not a
simplification made for the doc. The generator grows the key until it predicts
the outcome; for Sports it stops at two columns because no role's presence
changes the answer. If a future rule starts reading one, the generator says so.

**All 32 rows agree with naive parity.** That is the opposite of Japanese, where
81 of 280 rows disagree — there, parity is a trap; here it *is* the rule. Do not
carry the habit across: the shortcut is only valid for this variant.

## 7. Evaluation algorithm (priority order)

Implemented top to bottom in `describeSportsWin`; `decideSportsWinner` is the
faction-only convenience wrapper over the same call, so the two cannot disagree.

1. `N === 0` → `"no_contest"` (shared engine — see
   [engine/win-check-seam.md §6](../../engine/win-check-seam.md)).
2. `m === 0` → **citizens**.
3. `m >= N - m` → **mafia**.
4. Otherwise → `null` (continue).

Order matters only for step 1: at `N = 0` both step 2 and step 3 would fire.

## 8. Resolved decisions

- **Parity, with no exceptions.** No `N ≤ 6` cap, no Doctor-style carve-out, no
  lone-survivor special case — the two-faction deck leaves nothing for one to
  attach to.
- **Context is irrelevant.** `beforeNight` and `beforeDay` return the same
  outcome for every roster. The signature keeps `context` for interface
  compatibility only.
- **Detective has zero impact** on win detection (counts purely as Town).
- **A lone mafia against a lone citizen wins** (`N = 2`, `m = 1` → `2 ≥ 2`), and
  a lone surviving mafia wins outright (`N = 1`, `m = 1`).
- **All survivors leaving at once is a no contest (`N = 0`)**, not a Citizens
  win — recorded as `winner: "no_contest"`, logged with no rating change,
  reusing the shared terminal outcome (§5 rule 0).
- **Winner recording, host confirmation and the foul re-check are shared.** They
  are the same seam every variant uses; nothing here is Sports-specific.
- **Sports is unrated.** The outcome is recorded but no ELO moves — Sports is
  absent from `RATING_CONFIG` by design
  ([ranking-system.md](../../ranking-system.md) §9). The win *decision* is
  unaffected.

## 9. Implementation (built)

> Moved. The schema field, the `recordWinnerIfDecided` record helper, the two
> transition helpers, the `giveFoul` trigger, and the host-confirmation UI are
> all shared engine wiring:
> [engine/win-check-seam.md §7](../../engine/win-check-seam.md).

What is Sports-owned is only the pure rule module itself:

- `convex/games/sports/winConditions.ts` — `decideSportsWinner(aliveRoles, context)`
  returns `"mafia" | "citizens" | "no_contest" | null`, implementing §5 and §7
  above. `describeSportsWin` returns the same decision plus the two-faction
  `WinMethod` snapshot. No DB access.
- Reached through `SPORTS_DEFINITION.decideWinner` / `.describeWin`
  (`convex/games/sports/definition.ts`), so the engine never names this module
  directly — dispatch happens once in `recordWinnerIfDecided`
  (`convex/lib/games.ts`).

> `aliveRoles` counts only alive players holding a `gamePlayerRoles` entry, so
> the host — who has no role — is excluded from `N` and `m`.
