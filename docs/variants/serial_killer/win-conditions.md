# Serial Killer Mafia — Win Conditions

> **Status: DESIGNED — NOT BUILT.** The variant is unregistered
> ([rules.md](./rules.md)). The rules are **decided** as of 2026-08-18.
>
> *When* the check runs and what happens when one fires is variant-agnostic:
> [engine/win-check-seam.md](../../engine/win-check-seam.md).
>
> Siblings: [japanese/win-conditions.md](../japanese/win-conditions.md) and
> [sports/win-conditions.md](../sports/win-conditions.md).

## 1. The short version

Three sentences cover almost every game:

1. **The Serial Killer wins any 1-on-1** — last two players standing, against
   anyone.
2. **While the Serial Killer is alive, the citizens can never win**, even with
   every mafia dead. The town has to remove them too.
3. **The mafia win at parity** (as many mafia as everyone else) — *unless* the
   Serial Killer still has their shot and firing it would actually change
   something.

Point 3 is the only fiddly one, and §4 is entirely about it. The full lookup
tables are §5.

## 2. Notation

- **`m`** = alive mafia (`DON` + `MAFIA` ×2), 0–3.
- **`t`** = alive town (`DOCTOR` + `DETECTIVE` + `CITIZEN` ×5), 0–7.
- **`N`** = total alive = `m` + `t` + the Serial Killer if alive. The host holds
  no role and is never counted.

The Serial Killer has **three** states, and the difference decides real games:
**dead**, **alive with their shot**, **alive with the shot already used**.

`DETECTIVE` and `CITIZEN` are interchangeable here — neither kills nor saves.
The `DOCTOR` changes the answer in exactly **one** position out of all of them
(§5.5), so treat them as an ordinary townsperson everywhere else.

## 3. Role abilities that matter

- **Mafia** kill every night while one is alive, including the first numbered
  night ([rules.md §5.2](./rules.md)). They must pick a target — they cannot
  decline.
- **The Serial Killer** kills at most once per game, never on the first night.
- **The Doctor** saves one player per night, each player at most once per game.
- **The day vote** matters here in a way it does not in the siblings — §4.

## 4. Why the mafia's parity win is not automatic

Everything unusual about this variant comes from one interaction.

**Mafia at parity cannot be voted out.** `VOTING.BOTH_LEAVE_THRESHOLD` is `0.5`
and the comparison in `convex/games/core/voting.ts` is strict (`>`), so a bloc
holding exactly half the votes forces a tie that removes nobody and blocks the
both-leave escape. Once `2m ≥ N`, the mafia are unremovable by vote and they are
the only side that kills every night. The game is over — **unless something can
break the parity itself.**

**The Serial Killer's shot is the only thing that can.** It is the one way to
reduce the mafia without a vote. But firing it usually achieves nothing:

> Shooting a mafia costs them one member — and the same night costs the town one
> too, because the mafia also kill. Two players leave, and `2(m−1) ≥ N−2` is the
> *identical* inequality to `2m ≥ N`. **Parity survives the exchange.**

So the shot only helps in two situations:

- **The count drops straight to two**, where the Serial Killer's declared 1-on-1
  win fires before parity can be re-applied.
- **The Doctor saves the mafia's target**, so only *one* player leaves instead of
  two. At exact parity that breaks it: `2(m−1) < N−1`, the mafia lose their
  voting lock, and the game genuinely reopens.

That is the whole rule. It also means a Serial Killer who has already used their
shot cannot block the mafia at all.

### 4.1 The standard used throughout

> **End the game only when one faction's win is unavoidable no matter how every
> player acts.** A position somebody could still throw away is not decided.

## 5. Who wins — full lookup

> **To be replaced by the generated table.** Once built,
> `npm run docs:generate` writes the real one into
> [game-spec.md#win-conditions](../../generated/game-spec.md). The tables below
> were produced by running §6 over every position, so they agree with §6 by
> construction — but they are checked in by hand and can drift.

Read these as: *this many alive, split this way → this happens.* They assume the
Doctor is **not** among the survivors; §5.5 is the single position where that
matters.

### 5.1 Two alive

| Mafia | Serial killer | Town | Result |
| --- | --- | --- | --- |
| 0 | alive, **still has the shot** | 1 | **SERIAL KILLER** |
| 0 | alive, shot already used | 1 | **SERIAL KILLER** |
| 0 | dead | 2 | **CITIZENS** |
| 1 | alive, **still has the shot** | 0 | **SERIAL KILLER** |
| 1 | alive, shot already used | 0 | **SERIAL KILLER** |
| 1 | dead | 1 | **MAFIA** |
| 2 | dead | 0 | **MAFIA** |

Every 1-on-1 involving the Serial Killer is theirs, empty gun or not.

### 5.2 Three alive

| Mafia | Serial killer | Town | Result |
| --- | --- | --- | --- |
| 0 | alive, **still has the shot** | 2 | game continues |
| 0 | alive, shot already used | 2 | game continues |
| 0 | dead | 3 | **CITIZENS** |
| 1 | alive, **still has the shot** | 1 | game continues |
| 1 | alive, shot already used | 1 | game continues |
| 1 | dead | 2 | game continues |
| 2 | alive, **still has the shot** | 0 | **MAFIA** |
| 2 | alive, shot already used | 0 | **MAFIA** |
| 3 | dead | 0 | **MAFIA** |
| 2 | dead | 1 | **MAFIA** |

**2 mafia + Serial Killer, no town** is a mafia win even with the shot unused:
the mafia must kill someone, the Serial Killer is the only legal target, and no
Doctor exists to save them. They die tonight whatever they do.

### 5.3 Four alive

| Mafia | Serial killer | Town | Result |
| --- | --- | --- | --- |
| 0 | alive, **still has the shot** | 3 | game continues |
| 0 | alive, shot already used | 3 | game continues |
| 0 | dead | 4 | **CITIZENS** |
| 1 | alive, **still has the shot** | 2 | game continues |
| 1 | alive, shot already used | 2 | game continues |
| 1 | dead | 3 | game continues |
| 2 | alive, **still has the shot** | 1 | game continues |
| 2 | alive, shot already used | 1 | **MAFIA** |
| 2 | dead | 2 | **MAFIA** |
| 3 | alive, **still has the shot** | 0 | **MAFIA** |
| 3 | alive, shot already used | 0 | **MAFIA** |
| 3 | dead | 1 | **MAFIA** |

**The two `2 mafia + Serial Killer + 1 town` rows are the clearest example of
the whole variant.** With the shot: the mafia kill the townsperson, the Serial
Killer kills a mafia, and the count drops to two — a 1-on-1 they win. Without the
shot: nothing stops the mafia, so it ends immediately.

### 5.4 Five alive

| Mafia | Serial killer | Town | Result |
| --- | --- | --- | --- |
| 0 | alive, **still has the shot** | 4 | game continues |
| 0 | alive, shot already used | 4 | game continues |
| 0 | dead | 5 | **CITIZENS** |
| 1 | alive, **still has the shot** | 3 | game continues |
| 1 | alive, shot already used | 3 | game continues |
| 1 | dead | 4 | game continues |
| 2 | alive, **still has the shot** | 2 | game continues |
| 2 | alive, shot already used | 2 | game continues |
| 2 | dead | 3 | game continues |
| 3 | alive, **still has the shot** | 1 | **MAFIA** |
| 3 | alive, shot already used | 1 | **MAFIA** |
| 3 | dead | 2 | **MAFIA** |

Three mafia against one townsperson plus the Serial Killer is over even with the
shot live: firing it leaves `2 mafia + spent SK + 0 town`, still parity.

### 5.5 Six alive

| Mafia | Serial killer | Town | Result |
| --- | --- | --- | --- |
| 0 | alive, **still has the shot** | 5 | game continues |
| 0 | alive, shot already used | 5 | game continues |
| 0 | dead | 6 | **CITIZENS** |
| 1 | alive, **still has the shot** | 4 | game continues |
| 1 | alive, shot already used | 4 | game continues |
| 1 | dead | 5 | game continues |
| 2 | alive, **still has the shot** | 3 | game continues |
| 2 | alive, shot already used | 3 | game continues |
| 2 | dead | 4 | game continues |
| 3 | alive, **still has the shot** | 2 | **MAFIA** — *unless the Doctor is one of the 2* |
| 3 | alive, shot already used | 2 | **MAFIA** |
| 3 | dead | 3 | **MAFIA** |

**This one row is the only place in the entire game where the Doctor changes the
answer.** With 3 mafia, 2 townspeople and a Serial Killer holding their shot:

- **No Doctor alive → MAFIA.** The Serial Killer shoots a mafia, the mafia kill a
  townsperson, and the result is `2 mafia + spent SK + 1 town` — still parity.
  Nothing was gained.
- **Doctor alive → game continues.** The Doctor saves the mafia's target, so only
  the mafia member dies: `2 mafia + spent SK + 2 town`. Five alive against two
  mafia is no longer parity, the non-mafia hold 3 of 5 votes, and they can
  finally vote a mafia out.

### 5.6 Seven or more alive

**Only one thing can end the game: every mafia dead *and* the Serial Killer
dead → CITIZENS.** No mafia win and no Serial Killer win is possible above six
players, exactly as in Japanese.

## 6. Evaluation algorithm (priority order)

```
1.  N == 0                                   → "no_contest"     (shared engine)
2.  SK alive and N <= 2                      → SERIAL KILLER
3.  SK dead and m == 0                       → citizens         (sweep)
4.  m == N                                   → mafia            (sweep)
5.  N > 6                                    → continue         (ceiling)
6.  2m < N                                   → continue         (not parity)
7.  SK is not holding a shot                 → mafia
8.  SK is holding a shot — look one night ahead. The SK shoots a mafia; the
    possible positions tomorrow are:
        mafia killed a citizen        → decide(m-1, used, doctor,    t-1)
        mafia killed the doctor       → decide(m-1, used, no doctor, t-1)
        doctor saved the target       → decide(m-1, used, doctor,    t)
        mafia killed the SK           → decide(m,   dead, doctor,    t)
    if EVERY one of those is a mafia win → mafia
    otherwise                            → continue
```

The recursion terminates: each branch either drops `m` or moves the Serial
Killer out of the "holding a shot" state, and only that state recurses.

Three orderings are load-bearing and each needs a comment in the code:

- **Step 2 before step 7.** At two alive with one mafia and a living Serial
  Killer, both match; the Serial Killer takes it as a declared outcome.
- **Step 3 requires the Serial Killer to be dead** — otherwise the citizens claim
  every `m = 0` position and §1 point 2 disappears.
- **Step 6 before step 8.** The lookahead is only meaningful at a parity
  position.

> **A literal table is a fine alternative.** Step 8 resolves to just five
> mafia-win positions, and writing them out matches how Japanese states its
> carve-outs. The lookahead is kept because it documents *why* each one is what
> it is.

## 7. Resolved decisions

- **The Serial Killer wins any 1-on-1**, shot used or not, and wins alone at one
  player left (`1vs0`, reachable when two players die in one night).
- **A living Serial Killer always blocks the citizens.** Their win is available
  but not forced — the town can still misvote into a 1-on-1 (§5.2 shows the
  position; with `0 mafia + spent SK + 2 town` the town holds the votes but has
  to pick correctly).
- **A living Serial Killer blocks the mafia only when the shot can still change
  the result.** Revised twice: first from a blanket block to
  shot-versus-used, then again after working the vote arithmetic through (§4).
- **The Doctor is a one-position exception** (§5.5), not a general dimension. It
  costs nothing to implement — `describeWin` already receives the alive roles,
  and Japanese keys on Doctor presence for the same kind of carve-out.
- **The standard is "unavoidable regardless of play"**, not "clearly ahead"
  (§4.1).
- **Context is irrelevant.** `beforeNight` and `beforeDay` agree everywhere; the
  parameter is kept for interface compatibility only.
- **The six-player ceiling carries over** from Japanese, unchanged by 12 → 11
  seats.
- **Detective has zero impact** — interchangeable with a citizen, and its check
  reports the Serial Killer as not-mafia ([rules.md §7](./rules.md)).

### 7.1 Modelling assumptions, stated so they can be challenged

The table is a **declared outcome**, but it was *derived*, and two assumptions
went into it:

1. **The Doctor may save any living player, including themselves**, and the
   once-per-player-per-game limit is ignored. This overstates the town's staying
   power, so it errs toward "game continues" — the safe direction, since ending
   a game early is worse than ending it late.
2. **A position counts as decided only if no line saves the other factions.** The
   mafia get no credit for guessing who the Serial Killer is, which they cannot
   do in real play. So some **MAFIA** rows will take an extra round to actually
   play out. That is deliberate: the table never ends a game the mafia could
   still lose.

If either assumption is rejected, the parity rows with the shot still live are
the ones to re-examine.

## 8. Implementation (not built)

The variant-owned piece is a pure `winConditions.ts` under this variant's folder
in `convex/games/`, with `describeWin` implementing §6 and `decideWinner`
delegating to it. Three things must land first:

1. **Widen the `Winner` union** in `convex/games/core/winConditions.ts` and the
   `gameSessions` / `gameLogs` / `gameLogPlayers` validators, or a Serial Killer
   win has no column to be written to ([rules.md §10](./rules.md)).

2. **Carry the shot's state into the win check.** The Doctor rides along in
   `aliveRoles` for free; this does not.
   - `GameDefinition.decideWinner` / `.describeWin` take an additional
     **optional** argument for variant state, so Japanese and Sports compile
     untouched.
   - `recordWinnerIfDecided` (`convex/lib/games.ts`) populates it. No new table:
     the shot is used iff any `nightPhaseSessions` row for the game has
     `serialKillerTarget` set — the same whole-game scan
     `convex/games/core/nightPhase.ts` runs for the Doctor
     ([rules.md §5.1](./rules.md)). This does make the seam read night sessions,
     which today it does not.
   - **The spec generator needs a non-role key dimension.** It grows the smallest
     *role-presence* key until it predicts the outcome and fails the build when
     one key maps to two outcomes — which `2 mafia + SK + 1 town` now does
     (§5.3). That alarm is correct; teach the generator the extra column rather
     than weaken the check.

3. **`WinMethod` needs a Serial Killer term**, plus a matching branch in
   `winMethodLabel` for the `1vs0` / `1vs1` labels. Recording whether the shot
   had been fired is worth including — it is the difference between two otherwise
   identical endgame snapshots.

> `aliveRoles` counts only alive players holding a `gamePlayerRoles` entry, so
> the host — who has no role — is excluded from `N` and `m`.
