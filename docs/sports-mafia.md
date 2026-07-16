# Sports Mafia — Ruleset Specification

> Status: **Spec, not built.** This defines the Sports Mafia variant and its
> exact deltas from Japanese Mafia. Implementation follows the architecture in
> [game-types.md](./game-types.md) (Phases 2–5). `gameType` id: **`sports_mafia`**
> (renamed from the legacy `traditional`), **10 players**, seat count `10`
> (host sits in seat `11`).
>
> Read [game-design.md](./game-design.md) and
> [game-end-conditions.md](./game-end-conditions.md) first — Sports is defined as
> a **diff** against that Japanese baseline. Anything not listed as a difference
> below is **identical to Japanese**.

## 1. Overview

Sports Mafia is the classic two-faction game: **Mafia vs Citizens**. No Yakuza
clan, no Doctor, no Don's Right Hand. It is smaller (10 vs 12), starts the day
cycle immediately (no separate introduction phase), and resolves the nightly
mafia kill by **unanimous vote among all living mafia** rather than a single kill
authority.

## 2. Roles & factions

| Role | Count | Faction |
| --- | --- | --- |
| `DON` | 1 | Mafia |
| `MAFIA` | 2 | Mafia |
| `DETECTIVE` | 1 | Citizens |
| `CITIZEN` | 6 | Citizens |

- **Two factions:** `mafia` (`DON` + `MAFIA` ×2 = 3) and `citizens` (`DETECTIVE`
  + `CITIZEN` ×6 = 7).
- **Removed vs Japanese:** `SHOGUN`, `YAKUZA`, `DOCTOR`, `MAFIA_RIGHT_HAND`, and
  the entire `yakuza` faction.
- `roleToFaction`: `DON` / `MAFIA` → `mafia`; everything else → `citizens`.

> **Role count — DECIDED: 6 citizens → 10 players.** (The original written list
> summed to 11; confirmed as **6 citizens**, so `seatCount = 10`, host in seat 11.)

### Role distribution (deck)

```ts
// convex/games/sports/roles.ts
export const SPORTS_MAFIA_ROLE_DISTRIBUTION = [
  "DON",
  "MAFIA", "MAFIA",
  "DETECTIVE",
  "CITIZEN", "CITIZEN", "CITIZEN", "CITIZEN", "CITIZEN", "CITIZEN",
] as const;   // length 10 === seatCount
```

Dealt through the **existing shared card-picking flow** — no change to the
picking mechanic, only the deck source (`def.roleDistribution`).

## 3. Phase flow

Sports has **no `introduction_phase`, no `don_chooses_right_hand`, no
`doctor_meet`, no `yakuda_shogun_meet`, and no Yakuza/Doctor night phases.** It
**keeps** the two information-gathering night checks — `don_checks_for_detective`
and `detective_checks_for_mafia` — **identical to Japanese**. The phase list:

```
game_session_started
picking_roles
mafia_meet                 # DON + 2 MAFIA introduce to each other (same as Japanese, NO right-hand pick)
detective_meet             # same as Japanese
day_phase                  # DAY 1 — a full day: nominations + voting available (no introduction phase)
nominated_players_speak
voting
night_phase
mafia_chooses_target       # 5s kill window; ALL living mafia pick PRIVATELY; unanimous → kill (see §5)
don_checks_for_detective   # Don checks if a player is the Detective (same as Japanese)
detective_checks_for_mafia # Detective checks if a player is Mafia (same as Japanese)
farewell_speech
repeat
end_game
phase_transition           # shared "everyone asleep" buffer (reused where the awake role changes)
```

Cycle after the meets: `day_phase → nominated_players_speak → voting →
(farewell_speech if someone leaves) → night_phase → mafia_chooses_target →
don_checks_for_detective → detective_checks_for_mafia → (farewell_speech if a
kill) → day_phase → …`

### Diff summary vs Japanese

| Japanese phase | Sports |
| --- | --- |
| `don_chooses_right_hand` | **removed** — no right hand |
| `yakuda_shogun_meet` | **removed** — no yakuza |
| `doctor_meet` | **removed** — no doctor |
| `introduction_phase` | **removed** — day 1 is a normal `day_phase` |
| `mafia_chooses_target` | **kept, re-implemented** — 5s private unanimous-vote model (§5) |
| `don_checks_for_detective` | **kept — identical to Japanese** (Don checks for the Detective) |
| `right_hand_checks_for_yakuza` | **removed** |
| `yakuza_and_shogun_chooses_target` | **removed** |
| `detective_checks_for_mafia` | **kept — identical to Japanese** (Detective checks for Mafia) |
| `doctor_heals_player` | **removed** — no doctor |

The two kept check phases reuse the existing host buttons (`EndDonCheckButton`,
`EndDetectiveCheckButton`) and Japanese visibility rules verbatim — low risk, no
new logic.

## 4. Day-phase rules

### 4.1 First day phase — single-nominee exception

The **only** difference between the first day phase and every later day phase:

- **Day 1, exactly one player nominated → no elimination.** Skip voting entirely
  and go straight to `night_phase`.
- **Day 2+, exactly one player nominated → that player is eliminated without a
  vote** (goes to `farewell_speech`, then night).
- With **two or more** nominees, all day phases behave the same (self-justification
  → voting → elimination), identical to Japanese.

> Contrast Japanese: a single nominee still goes to `voting`
> (`dayPhase.ts → startNominatedPlayersSpeaking`). Sports replaces that branch
> with the round-dependent rule above. Model it as a definition flag —
> `flags.firstDaySingleNomineeSkipsToNight` — plus a "single nominee auto-eliminates"
> rule for later rounds, both read by the shared day-phase engine.

### 4.2 Third-foul speaking ban (new mechanic)

A new consequence not present in Japanese:

- When a player receives their **3rd foul**, they are **banned from their
  1-minute speech on the *next* day phase only.** The phase immediately after
  the one where the 3rd foul landed. After that single phase, they speak
  normally again.
- **Last-day-phase exception:** if only **3 or 4 players are alive** (i.e. the
  final day phase), a banned player **still gets 30 seconds** to speak, because
  it is the last day phase.

Proposed model (Phase 3):

- Add `foulSpeakingBanRound: v.optional(v.number())` to `gamePlayers` = the day
  round index for which the player is muted from the main speech. Set it when
  fouls reach 3.
- The shared day-speaking-order builder skips a player whose
  `foulSpeakingBanRound === currentDayRound` — **unless** alive count ≤ 4, in
  which case they are included with a **30s** speech instead of 60s.
- The 4th-foul elimination rule is **retained** from Japanese
  (`FOULS.ELIMINATION_THRESHOLD = 4`).

> Requires tracking a monotonic "day round" number. The session already tracks
> `currentNightNumber`; a `currentDayNumber` (or deriving the round from night
> number) is needed to know which day phase a ban applies to.

## 5. Night — mafia kill by unanimous vote (biggest change)

Japanese uses a **single kill authority** (priority DON > RIGHT_HAND > MAFIA)
that picks one target, and the host cannot advance until a target is chosen.
Sports replaces this entirely.

### 5.1 Behaviour (confirmed)

- On entering `mafia_chooses_target` **no window is open yet**. The **host opens
  the 5-second kill window by clicking "Open Kill Window"** — the scheduler is
  armed on that click, not automatically at phase entry. (This is a deliberate
  deviation from the original spec: the host controls exactly when the window
  starts.)
- During the window, **every living mafia** (DON + each alive MAFIA) sees a
  **kill button on every alive participant** and picks **one** target.
- **The phase's generic decision timer is NOT shown for this phase in Sports.**
  Instead the acting mafia (and host) see the **kill-window countdown** — the
  seconds remaining in the 5s window — which appears only while the host-opened
  window is active. Before the host opens it, and after it closes, no timer
  badge is shown.
- **Each mafia's selection is private — mafia do NOT see who the other mafia
  targeted** (a mafia may see their *own* pick highlighted, but not others').
  This is the opposite of Japanese, where the shared target is visible to the
  whole mafia team.
- **After 5 seconds all kill buttons disable.** Selecting is only possible during
  those 5 seconds (client hides/disables the buttons on elapse; the server also
  rejects a selection submitted after the window closes).
- The **host advances manually** — they click **Finish Mafia Phase** whenever
  they want (which moves on to `don_checks_for_detective`). The 5s timer only
  gates the *buttons*; it does **not** auto-advance the phase.
- Mafia **may intentionally choose not to kill.**

### 5.2 Kill resolution (at dawn)

The kill is computed the same place Japanese computes it — `startFarewellSpeech`
at dawn — but from the array of per-mafia selections instead of a scalar:

- If **every living mafia submitted a selection AND all selected the same
  target** → that target is **killed** (no Doctor exists, so nothing saves them).
- If selections **disagree**, or **any living mafia did not select** → **no
  kill**. Dawn proceeds straight to `day_phase` (reusing the existing
  "no-kill → skip to day" path).
- If **only one mafia is alive** and they do **not** select → **no kill** (a
  lone mafia may deliberately abstain). If the lone mafia *does* select, that is
  trivially unanimous → kill.

### Data model (Phase 3)

The Japanese `nightPhaseSessions` scalars (`mafiaTarget`, `yakuzaTarget`,
`healedPlayer`) don't fit "each mafia picks privately." Add variant fields:

```ts
// tables/nightPhaseSessions.ts  (additive, optional)
mafiaTargetSelections: v.optional(
  v.array(v.object({ mafiaSeat: v.number(), targetSeat: v.number() })),
),
mafiaTargetWindowStartedAt: v.optional(v.string()), // ISO, for the 5s countdown
mafiaTargetWindowActive: v.optional(v.boolean()),   // flipped false by the scheduler at +5s
```

`resolveKills` for Sports:

```
alive_mafia = alive players in mafia faction
sel = mafiaTargetSelections for those seats
kill iff (sel.length === alive_mafia.length) AND (all sel.targetSeat equal)
  → killedSeats = [that target]
else → killedSeats = []   // no kill
```

### 5.3 Window mechanics

Mirror the existing **voting window** shape, but the scheduler only **closes the
window** (disables buttons) — it does **not** advance the phase:

- The **host** opens the window by clicking "Open Kill Window"
  (`startMafiaTargetWindow`), which stamps `mafiaTargetWindowStartedAt`, sets
  `mafiaTargetWindowActive: true`, and arms
  `scheduler.runAfter(SPORTS.MAFIA_TARGET_WINDOW_MS, closeMafiaTargetWindowInternal)`
  (`SPORTS.MAFIA_TARGET_WINDOW_MS = 5000`). The internal handler flips
  `mafiaTargetWindowActive: false`. (Same pattern as
  `voting.ts → startVoteWindow` / `endVoteWindowInternal`, which likewise flips a
  boolean without advancing.)
- Each mafia pick is a mutation validated to be (a) inside the open window,
  (b) a living-mafia caller, (c) targeting a living non-host player, (d) the
  caller has **not already picked**. A pick is **one-shot / final**: once a mafia
  selects a target it is locked for the rest of the window — no changing it and
  no clearing it. Abstaining is simply never calling the mutation. (The server
  rejects a second call; the client hides all kill buttons the instant a pick
  lands, leaving only the private target indicator on the chosen tile.)
- **Host advance is manual**: the `EndMafiaTargetButton` equivalent ("Finish
  Mafia Phase") is always enabled and transitions to `don_checks_for_detective`.
- The **generic `PHASE_TIMERS` badge for `mafia_chooses_target` is suppressed in
  Sports**. `<PhaseCountdown>` detects the `unanimous-vote` model for this phase
  and, instead of counting the shared phase timer from `phaseStartedAt`, counts
  the **kill window** (`SPORTS.MAFIA_TARGET_WINDOW_MS = 5000`) from
  `mafiaTargetWindowStartedAt`, shown to the acting mafia (and host) **only while
  `mafiaTargetWindowActive` is true**. No badge appears before the host opens the
  window or after it closes.

### 5.4 Frontend selection privacy

Because mafia must not see each other's picks, the Sports night-authority
ruleset does **not** broadcast selections across the team. The existing
`MafiaTargetIndicator` (which shows the shared target to all mafia in Japanese)
must be gated: in Sports, a mafia sees only their **own** selection. The
server-side selection read returns a caller's own pick only (never other mafia's)
until the kill resolves at dawn.

## 6. Win conditions

Two factions only → far simpler than Japanese (no Yakuza clan, no N=5 Doctor
context exception, no context sensitivity).

- **Mafia wins** when `m ≥ (N − m)` — i.e. living mafia ≥ living citizens
  (parity or better). Equivalently `2m ≥ N`.
- **Citizens win** when `m = 0` (all mafia eliminated).
- **No contest** when `N = 0` (total mutual elimination — reuse the existing
  `no_contest` outcome and its "both leave" path unchanged).
- Otherwise **continue**.

`m` = living mafia-faction players (`DON` + `MAFIA`). `N` = living non-host
role-holders. **Context (`beforeNight` / `beforeDay`) does not matter** — the
parity outcome is a declared result at the boundary, so `decideWinner` can
ignore it (the signature keeps `context` for interface compatibility).

```ts
// convex/games/sports/winConditions.ts
export function decideSportsWinner(aliveRoles: Role[]): Outcome | null {
  const N = aliveRoles.length;
  if (N === 0) return "no_contest";
  const m = aliveRoles.filter(isMafiaRole).length;
  if (m === 0) return "citizens";
  if (m >= N - m) return "mafia";
  return null; // continue
}
```

### Worked examples

| Alive (m vs citizens) | N | m | Result | Why |
| --- | --- | --- | --- | --- |
| 3 mafia, 4 cit | 7 | 3 | continue | 3 < 4 |
| 3 mafia, 3 cit | 6 | 3 | **MAFIA** | 3 ≥ 3 (the "3v3" example) |
| 2 mafia, 2 cit | 4 | 2 | **MAFIA** | "2v2" |
| 1 mafia, 1 cit | 2 | 1 | **MAFIA** | "1v1" |
| 2 mafia, 3 cit | 5 | 2 | continue | 2 < 3 |
| 1 mafia, 2 cit | 3 | 1 | continue | 1 < 2 |
| 0 mafia, 4 cit | 4 | 0 | **CITIZENS** | all mafia dead |
| 0 alive | 0 | 0 | **no contest** | mutual elimination |

The check plugs into the **same two seams** as Japanese —
`enterNightPhase` (`beforeNight`) and `enterDayPhase` (`beforeDay`) in
`phaseTransitions.ts`, plus the immediate check in `giveFoul` — via
`definition.decideWinner`. The host still confirms via the Finish Game banner
(unchanged).

## 7. What stays identical to Japanese

Card-picking; seat shuffle on start; day/self-justification speaking timers and
controls; voting mechanics (window, auto-vote on last candidate, tie-break,
both-leave → no-contest); farewell-speech flow; foul counting + 5s foul-speak +
4th-foul elimination; phase-transition win-check seams and host confirmation;
LiveKit audio/video; presence; broadcasts; game-log archival; match history;
admin analytics; the room-closing cleanup countdown.

## 8. Resolved decisions

All previously-open questions are confirmed:

1. **Citizen count = 6 → 10 players.** (§2)
2. **Detective checks + Don checks are both kept, identical to Japanese.** The
   Sports night includes `don_checks_for_detective` and
   `detective_checks_for_mafia`; only the Yakuza/Doctor/right-hand phases are
   dropped. (§3)
3. **The 5s mafia window gates buttons only; the host advances manually.**
   Buttons appear on every alive participant on phase entry, auto-disable after
   5s; the host clicks Finish Mafia Phase when ready. Mafia selections are
   **private** to each mafia. (§5)
4. **4th-foul elimination is retained** (`FOULS.ELIMINATION_THRESHOLD = 4`). (§4.2)
5. **The 3rd-foul speaking ban applies to the next `day_phase`** (one phase
   only), with the 30s exception when ≤ 4 players remain. (§4.2)
6. **Sports launches UNRATED — ELO is skipped.** No `RATING_CONFIG` entry, so
   `archiveGameLog` records games with no rating change (exactly as an unrated
   type does today). A calibrated config can be added later per
   [ranking-system.md](./ranking-system.md) §9.
