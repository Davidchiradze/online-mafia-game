# Serial Killer Mafia — Rules

> **Status: BUILT — backend registered, UI pending.** The definition is
> registered as `serial_killer_mafia`, the deck and phases are real, and the
> `gameType` literal is in the schema. The **frontend UI ruleset is not wired
> yet**, so the variant is not playable end-to-end and stays filtered out of
> `CreateGameModal` until it is.
>
> Read [japanese/rules.md](../japanese/rules.md) and
> [japanese/win-conditions.md](../japanese/win-conditions.md) first. Like Sports,
> this variant is defined as a **diff** against the Japanese baseline; anything
> not listed as a difference is identical to Japanese.
>
> Win conditions: [win-conditions.md](./win-conditions.md) — **decided**, no
> longer TBD. Rating: [rating.md](./rating.md).

## 1. Overview

Japanese Mafia with the Yakuza clan replaced by a **lone Serial Killer**: an
independent player, on nobody's team, who kills **once in the entire game** and
wins only by outlasting everyone to a 1-on-1.

Proposed `gameType` id: **`serial_killer_mafia`** — 11 seats (host sits in seat
12). It is the third registered variant and the **first that adds a faction**
rather than dropping one, which is where nearly all of its implementation cost
sits (§10).

Three things make it structurally new, and all three are worth stating before
the details:

1. **A third, solo faction.** Sports was Japanese minus a faction; this is
   Japanese plus one. The `Faction` union is closed and appears in 15 places
   including four schema validators (§10).
2. **A one-shot ability.** Nothing in the engine models "this player has a
   resource that depletes across nights." Doctor heal-once-per-target is close
   but is per-target, not per-player.
3. **A win rule that reads more than the alive roster.** Whether the Serial
   Killer still holds their shot decides the winner in five positions, and
   `describeWin(aliveRoles, context)` cannot see it. This is the first variant
   whose outcome is not a function of the living roles alone, and it forces an
   interface change plus a new key dimension in the spec generator
   ([win-conditions.md §4](./win-conditions.md), [§8](./win-conditions.md)).
   Doctor presence also changes one position, but that one is free — it is
   already in the roster, and Japanese keys on it too.

## 2. Roles & factions

Eleven seats:

| Role | Count | Faction |
| --- | --- | --- |
| `DON` | 1 | mafia |
| `MAFIA` | 2 | mafia |
| `SERIAL_KILLER` | 1 | **serial_killer** (solo) |
| `DETECTIVE` | 1 | citizens |
| `DOCTOR` | 1 | citizens |
| `CITIZEN` | 5 | citizens |
| **Total** | **11** | 3 / 1 / 7 |

Decisions behind the numbers:

- **The Serial Killer is its own faction, not a rogue citizen.** They win alone,
  against everyone, so they cannot share the citizens' outcome. This is the
  choice that drives §10; a "citizen who happens to kill" would be far cheaper
  to build but would pay the citizens ELO when the Serial Killer wins.
- **Five plain citizens → 11 seats.** Japanese's deck is 12 with a 3-strong
  Yakuza clan; swapping that clan for one Serial Killer and dropping one citizen
  lands on 11.
- **Proposed faction id: `serial_killer`**, matching the role slug. `neutral` or
  `solo` would generalise better if a second independent role is ever added;
  `serial_killer` is more legible in a `winner` column today. Open question §9.1.
- **Teams.** `teams` maps a faction to who meets and sees together. The Serial
  Killer's team is a set of one, so they meet alone — mechanically the same
  shape as `don_meet`, where the Don wakes with only the host.

## 3. Phase flow

Japanese's phase list with the two Yakuza phases replaced by two Serial Killer
phases:

| | Japanese | Serial Killer Mafia |
| --- | --- | --- |
| Meet round | `yakuda_shogun_meet` | `serial_killer_meet` |
| Action round | `yakuza_and_shogun_chooses_target` | `serial_killer_chooses_target` |

Everything else — `picking_roles`, `mafia_meet`, `don_meet`, `detective_meet`,
`doctor_meet`, `don_checks_for_detective`, `detective_checks_for_mafia`,
`doctor_heals_player`, `farewell_speech`, `day_phase`,
`nominated_players_speak`, `voting`, `repeat`, `end_game`, and the shared
`phase_transition` sleep buffer — is unchanged.

Proposed ordering within the night, matching Japanese's convention of putting
each killer's pick before the information roles:

```
mafia_chooses_target
  → don_checks_for_detective
  → serial_killer_chooses_target      (skipped on night 1, see §5)
  → detective_checks_for_mafia
  → doctor_heals_player
  → (dawn: resolve, then farewell_speech or day_phase)
```

Placing the Serial Killer **before** the Doctor is deliberate: the Doctor must
be able to save a Serial Killer target, which only works if the pick is already
recorded when `doctor_heals_player` runs. It has no effect on resolution — that
happens at dawn from the whole night session — but it keeps the host's phase
order readable as "everyone who kills, then everyone who reacts."

## 4. Night — two independent killers

The night model stays Japanese's **`single-authority`** kind. That is not a
simplification: `single-authority` means *one picker per killing team, one
shared target*, and the Serial Killer is a team of one, so it fits without a new
`NightKind`.

**The mafia's kill authority is unchanged** — the `DON` while alive, otherwise
the living mafia in the lowest-numbered seat, via `mafiaKillAuthority` in
`convex/games/core/mafiaSuccession.ts`. There is no succession for the Serial
Killer: the role is one player, and when they die the ability dies with them.

### 4.1 Kill resolution at dawn

`resolveKills` is pure and reads the night session. The proposed rule is
Japanese's, with `serialKillerTarget` in the slot `yakuzaTarget` occupies:

```
killed = []
if mafiaTarget is set and mafiaTarget != healedPlayer:
    killed.push(mafiaTarget)
if serialKillerTarget is set
   and serialKillerTarget != healedPlayer
   and serialKillerTarget not already in killed:
    killed.push(serialKillerTarget)
return killed
```

Three consequences, all inherited from Japanese and all intended:

- **The Doctor's single heal can only stop one of the two.** It is a seat, not a
  shield per attacker: if both killers pick the healed seat, nobody dies.
- **Both killers picking the same seat is one death, not two.** The dedup on the
  second push is what does it.
- **Two deaths in one night are reachable**, so the alive count can drop by two
  and skip straight past a boundary a per-`N` win table stops at. Japanese
  carries single-faction sweep rules specifically to cover this
  ([japanese/win-conditions.md §5](../japanese/win-conditions.md));
  this variant needs an equivalent, and it must account for a lone Serial Killer
  as well as a lone mafia — see [win-conditions.md](./win-conditions.md).

### 4.2 Data model

Additive and optional on `convex/tables/nightPhaseSessions.ts`, the same shape
Sports used for its selections, so existing rows validate unchanged:

```ts
serialKillerTarget: v.optional(v.number()),   // seat the SK picked this night
```

`NightState` in `convex/games/core/types.ts` gains the matching optional field.
Japanese and Sports ignore it, exactly as Japanese already ignores
`mafiaTargetSelections`.

**No new table is needed for the one-shot** — see §5.

## 5. The Serial Killer's single bullet

Two rules, and they point in opposite directions from the mafia's:

- **Never on night 1.** The Serial Killer's phase is skipped on the first night.
- **Exactly one kill for the whole game**, usable on any night from the second
  onward. Once spent it is gone; there is no recharge.

### 5.1 Deriving "already fired" — no new state

Whether the bullet is spent is **derivable from the night sessions already
stored**: it is spent iff any `nightPhaseSessions` row for this game has
`serialKillerTarget` set. That is the same derivation
`convex/games/core/nightPhase.ts` already uses for the Doctor via
`getAllHealedSeats`, which scans every night of the game to enforce
heal-each-player-once. Reusing that pattern means no new table, no counter to
keep in sync, and no migration.

> **Three callers, not one.** Besides the two enforcement points below, the
> **win check** needs this fact too — it decides the winner in five positions
> ([win-conditions.md §4](./win-conditions.md)). That is the one consumer the
> Doctor's equivalent does not have, and it is why the derivation is worth a
> single shared helper rather than being inlined at each call site.

The enforcement points mirror the Doctor's:

- The **select mutation** rejects a pick when a previous night already recorded
  one, and when the night number is 1.
- The **host's advance button** is always enabled for this phase — the Serial
  Killer may decline to fire, tonight or ever, so the host must never be able to
  get stuck waiting.

  The phase still renders with `gate="serial_killer"`; that gate's
  `canEndSerialKillerPhase` in
  `src/features/game-room/hooks/game/useNightPhaseReadiness.ts` is
  **unconditionally `true`**, keeping the wiring in place for a future condition
  without ever blocking the host today. Modelling it on the Doctor's
  `canEndDoctorPhase` is the trap: enumerating the cases where there is provably
  nothing to wait for — dead, night 1, shot already spent — still leaves the
  ordinary one, alive with the shot in hand and choosing not to fire, waiting on
  a target that is never coming.

### 5.2 The first-night inversion — and the shared-UI bug in the way

The stated rule is that Japanese's first night is a planning night with no
mafia kill, and this variant inverts it: **the mafia may kill on night 1, the
Serial Killer may not.**

Japanese's half of that is real, but it is **not enforced on the server** and it
was **not owned by the variant**. It was three hardcoded UI facts:

- `src/features/game-room/lib/nightPhase.ts` → `nightPhaseLabelKey` relabels
  `mafia_chooses_target` as `mafia_meets_first_night` whenever
  `nightNumber === 1`;
- `PhaseTitle.tsx` → `NIGHT_DEPENDENT_PHASE_LABELS`, a **second, independent
  copy** of that same relabelling;
- `useNightPhaseReadiness` → `canEndMafiaPhase` returns `true` unconditionally on
  night 1, so the host can advance with no target recorded.

`selectMafiaTarget` in `convex/games/core/nightPhase.ts` has no night-1 guard at
all. So "mafia may kill on night 1" costs no server work — it is a flag on the
definition that those call sites read instead of hardcoding `1`.

Flag on `GameFlags` in `convex/games/core/types.ts`:

```ts
/** Whether the mafia's kill is live on the first night. */
mafiaKillsOnFirstNight: boolean;   // japanese false, sports true, serial killer true
```

> **Pre-existing bug in Sports, fixed by the same flag — but smaller than it
> looks.** The two label copies are **shared**, reached by every variant through
> `useNightPanelFields` / `usePlayerPanelFields`. Sports grants its Best Move to
> the night-1 victim, which requires a night-1 mafia kill
> (`convex/games/sports/bestMove.ts` gates on `nightNumber === 1`), yet a Sports
> host on night 1 read "Mafia Meets & Plans" — on the one night the whole
> mechanic depends on the mafia having shot.
>
> The **advance gate does not reach Sports.** `useNightPhaseReadiness` is
> consumed only by `NightPhasePanel`, and Sports routes `mafia_chooses_target`
> to `SportsMafiaTargetPanel` instead, so `canEndMafiaPhase` never runs there.
> The Sports bug is therefore label-only and cosmetic; the kill always resolved.
> The gate matters for **this** variant, which is Japanese-shaped and uses
> `NightPhasePanel` with `gate="mafia"` — there an always-enabled advance would
> let the host skip a kill the mafia are entitled to make.

Sports flipping from its *de facto* `false` to a declared `true` is a
**behaviour change**, not a refactor — `tests/game/` is a characterization
suite, so assertions move and that has to be intended, not bulk-updated.

## 6. Day phase, voting, fouls

**Identical to Japanese.** No day-1 single-nominee exception, no third-foul
speaking ban, no best move — those are Sports mechanics and none of them are
requested here. The corresponding flags are all `false`.

The Serial Killer is an ordinary player during the day: they speak in seat
order, may be nominated, may be voted out, and are eliminated by a 4th foul like
anyone else.

## 7. Information roles

Unchanged in mechanism. Each needed an explicit answer about the new role,
because "not mafia" and "innocent" stop being the same thing once a third
faction exists — **decided, and the answer is the same in all three cases: no
special handling.**

| Check | Result on the Serial Killer |
| --- | --- |
| Detective → Serial Killer | **Not mafia**, i.e. reads as innocent. The check asks "is this a mafia member," and the honest answer is no. |
| Don → Serial Killer | **Not the Detective.** The Don hunts the Detective and gets a plain negative. |
| Doctor → Serial Killer | **A normal heal target**, subject to the same once-per-player-per-game limit as anyone else. |

The consequence is worth stating, because it is the Serial Killer's main
protection and it is easy to read as a bug: **no role in the game can identify
the Serial Killer.** A Detective check clears them. They are found only by
deduction from the kill pattern — two deaths in a night, or a death the mafia
did not claim. That is deliberate, and it is why they need no teammates.

## 8. Visibility

`serial_killer_meet` reuses the `don_meet` shape verbatim: the awake role is
`SERIAL_KILLER`, the host and that one player see each other, everyone else is
covered. `serial_killer_chooses_target` reuses the `mafia_chooses_target` shape
for a one-person team.

Nothing here needs new machinery in `src/shared/lib/game/visibility.ts` — the
variant's own `visibility.ts` answers `getAwakeRoles` and `canSeeParticipant`
for the two new phases, as Sports does for its own.

## 9. Resolved decisions

All confirmed 2026-08-18. Nothing about this variant's rules is open; what
remains is building it. Win-condition decisions are recorded separately in
[win-conditions.md §7](./win-conditions.md).

1. **`gameType` id `serial_killer_mafia`, role id `SERIAL_KILLER`, faction id
   `serial_killer`.** A generic `neutral` / `solo` faction was considered and
   rejected — it would generalise better if a second independent role is ever
   added, but `serial_killer` is what a reader wants to see in a `winner`
   column, and the second role is hypothetical.
2. **The meet round keeps its no-kill rule, and gains `serial_killer_meet`.**
   Nobody kills while the roles are introducing themselves; `hasIntroductionPhase`
   stays `true` (§3).
3. **The mafia's kill is live from the first numbered night** — the inversion
   from Japanese, delivered by the `mafiaKillsOnFirstNight` flag (§5.2).
4. **The Serial Killer may not kill on the first night**, and has exactly one
   kill for the whole game from the second night onward (§5).
5. **The bullet is spent when the shot is fired, not when it lands.** A Doctor
   save consumes it, and so does the mafia having chosen the same seat. Anything
   else either makes the save invisible to the Serial Killer or leaks
   information to them.
6. **The Serial Killer may target a mafia member.** They are against everyone,
   and the 1-on-1 win condition only functions if they can thin the mafia.
7. **No role can identify the Serial Killer** (§7). The Detective's check clears
   them; the Don's check ignores them; the Doctor may heal them normally.
8. **Nothing from Sports is adopted** — no best move, no third-foul speaking
   ban, no day-1 single-nominee rule. Those flags are all `false` (§6).
9. **Unrated at launch**, deliberately and not by omission —
   [rating.md](./rating.md). A Serial Killer win could not be stored today in any
   case (§10).
10. **Seat geometry is Japanese's ring minus its last seat** (§10.1).

## 10. Implementation cost — what this variant breaks that Sports did not

Sports was cheap because it was a **subset**: two of Japanese's three factions,
fewer roles, fewer phases. Nothing about a smaller set requires widening a type.
A third faction is the opposite, and
[ranking-system.md §13](../../ranking-system.md) already names it as schema
work, not config work.

**The `Faction` / `Winner` union is declared in 15 places.** Four are schema
validators, and until every one is widened a Serial Killer win **cannot be
stored**:

| Where | What it is |
| --- | --- |
| `convex/lib/roles.ts` | the `Faction` type itself |
| `convex/games/core/winConditions.ts` | `Winner`, plus `winMethodLabel`'s per-faction branch |
| `convex/tables/gameSessions.ts` | **validator** — `winner` on the live session |
| `convex/tables/gameLogs.ts` | **validators** — `gameLogs.winner` and `winMethodValidator.faction` |
| `convex/tables/gameLogPlayers.ts` | **validators** — `faction` and the denormalized `winner` |
| `convex/lib/constants.ts` | `RatingConfig.deltas` is keyed by `Faction` |
| `convex/admin/stats.ts`, `convex/refs/admin.ts`, `convex/refs/history.ts`, `convex/refs/game.ts` | four local re-declarations of the same union |
| `src/shared/lib/constants/factions.ts` | `Record<Faction, …>` × 3 — chart hex, text, badge |
| `src/shared/lib/game/roleDisplay.ts` | a fourth local re-declaration, plus switch arms |
| `src/features/game-room/lib/endGame.ts`, `src/features/game-room/context/gameRoomContext.tsx` | outcome unions |
| `src/features/admin/dashboard/FactionWinDonut.tsx` | a hardcoded faction list |
| `messages/en.json`, `messages/ka.json` | `faction.*` labels — **both**, `ka` is the default locale |

The four local re-declarations are the dangerous ones: they are copies, not
imports, so widening `convex/lib/roles.ts` will not produce a compile error at
any of them.

**Two more shapes assume Japanese's factions:**

- `WinMethod` carries `yakuzaAlive` / `shogunAlive` booleans. Sports fills them
  `false`; this variant needs a `serialKillerAlive` equivalent, or the snapshot
  generalises to a faction-keyed map.
- `NightActionAuthority` in `src/features/game-room/variants/core/types.ts` is a
  fixed record of `hasMafiaKillAuthority` / `hasYakuzaKillAuthority` /
  `hasDoctorHealAuthority` and their phase flags. It needs a Serial Killer pair,
  or to become a map keyed by action.

**An 11-seat ring is new geometry** — decided in §10.1 below.

### 10.1 Seat geometry — Japanese's ring, one seat short

`seatLayout` gives Japanese a 4×4 grid for 12 and Sports a 4×3 for 10. Eleven
seats has no tidy ring: a 4×4 perimeter holds exactly 12 cells, so one has to
stay empty, and every choice of *which* is visibly asymmetric.

**Decision: reuse Japanese's 4×4 mapping verbatim for seats 1–11 and leave its
seat-12 cell (row 1, column 2) empty.** Same `cols: 4`, `rows: 4`, same merged
centre panel for host and controls.

```
    [ · ][ 11 ][ 1 ][ 2 ]      row 1   — the gap sits at row 1, column 2
    [ 10][         ][ 3 ]      row 2      (Japanese's seat 12)
    [ 9 ][  host   ][ 4 ]      row 3
    [ 8 ][ 7  ][ 6 ][ 5 ]      row 4
```

Chosen for cost, not beauty. Seats 1–11 keep the exact cells they occupy in a
Japanese game, so the seat-shuffle animation, the ring walk and the centre panel
all behave identically with no new code path — the layout is Japanese's function
with its last case unused. The gap lands on the top edge beside seat 1, which is
the least-trafficked part of the ring.

Alternatives, if this looks wrong on a real table: shift the gap to the bottom
edge so the top row stays full, or drop a side cell (row 2 or 3, column 4) for a
4/2/4/1 distribution. Both are a different `positionForSeat` and nothing else —
this is one pure function, and changing it later is cheap.

Everything else is the ordinary checklist — the `add-game-variant` skill covers
the ~14 modules, both registries, the schema union, labels, i18n and docs. The
list above is only what that checklist does **not** warn about, because no
previous variant hit it.

## 11. What stays identical to Japanese

Everything not named as a difference above. Concretely: card picking, speaking
order and timers, self-justification, voting (windows, auto-vote, tie-break,
both-leave), fouls and the 4th-foul elimination, the farewell flow, the
`phase_transition` buffer, LiveKit, presence, broadcasts, game logs, the
win-check seam, and the mafia kill succession rule.

That list is not maintained here — the shared/variant split has one source,
[engine/variant-architecture.md §4](../../engine/variant-architecture.md).
