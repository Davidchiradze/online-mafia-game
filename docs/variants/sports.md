# Sports Mafia — Ruleset Specification

> Status: **Built and creatable.** The definition, night model, best-move flow
> and UI ruleset all ship; `CreateGameModal` filters only `city_mafia`. The one
> deliberate gap is rating — Sports is absent from `RATING_CONFIG`, so games are
> unrated by design until there is enough data to calibrate
> ([ranking-system.md](../ranking-system.md) §9).
>
> `gameType` id: **`sports_mafia`** (renamed from the legacy `traditional`),
> **10 players**, seat count `10` (host sits in seat `11`). Architecture:
> [engine/variant-architecture.md](../engine/variant-architecture.md).
>
> Read [japanese/rules.md](./japanese/rules.md) and
> [japanese/win-conditions.md](./japanese/win-conditions.md) first — Sports is
> defined as a **diff** against that Japanese baseline. Anything not listed as a
> difference below is **identical to Japanese**.

## 1. Overview

Sports Mafia is the classic two-faction game: **Mafia vs Citizens**. No Yakuza
clan, no Doctor, no Don's Right Hand. It is smaller (10 vs 12), starts the day
cycle immediately (no separate introduction phase), and resolves the nightly
mafia kill by **unanimous vote among all living mafia** rather than a single kill
authority.

## 2. Roles & factions

> **Generated.** Roles, deck counts, factions and night actors: [game-spec.md#roles](../generated/game-spec.md#roles).

The decisions behind those numbers, which the table cannot express:

- **Two factions, not three.** No yakuza clan, no doctor. That is the single
  biggest structural difference from Japanese and it is what makes the win
  rule a flat parity check (§7).
- **Six citizens → 10 players — DECIDED.** The deck was sized to land on a
  10-seat table rather than reusing the 12-seat ring.

## 3. Phase flow

> **Generated.** Phase order, timers, awake roles and advance targets: [game-spec.md#phases](../generated/game-spec.md#phases).
> The graph, including the branches a Convex mutation owns, is drawn at
> [game-spec.md#state-machine](../generated/game-spec.md#state-machine).
> For a side-by-side against Japanese, [game-spec.md#phase-universe](../generated/game-spec.md#phase-universe)
> marks every phase as shared or variant-specific.

What the tables do not say — the reasoning behind the diff:

- **Added:** `don_meet` (the Don acts alone) and `best_move` (§6).
- **Removed:** every yakuza, doctor and right-hand phase, plus
  `introduction_phase`.
- **Kept identical to Japanese** wherever there was no reason to differ, so
  the shared engine keeps one implementation of the day/vote/farewell cycle.

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

## 6. Best Move (საუკეთესო სვლა) — first-night victim names 3 suspects

The classic sports-mafia "best move": the player killed on the **first** night
gets one public shot at naming the mafia before they say goodbye.

### 6.1 When it is granted

Evaluated once, at dawn of **night 1**. Granted only when **all three** hold:

| # | Condition | Why |
| --- | --- | --- |
| 1 | `currentNightNumber === 1` | First night only — a game has exactly one best move, or none. |
| 2 | The night resolved to **exactly one killed seat** — i.e. every living mafia submitted a selection and all chose the same target (§5.2) | No kill → no victim → nothing to grant. |
| 3 | **At most one player was eliminated during day round 1** | With two or more day-1 departures the best move is void. |

Condition 3 spelled out: day 1 ended with **nobody** eliminated (the day-1
single-nominee rule §4.1, or a vote that removed no one) **or exactly one**
eliminated (a normal vote-out, or a 4th-foul elimination). If **two or more**
left on day 1 — the "both leave" tie-break outcome, or a vote-out plus a foul
elimination — the first-night victim gets **no best move**, and dawn goes
straight to `farewell_speech` exactly as it does today.

> **Cheap, exact server test.** At the moment the night resolves, a dead player
> **cannot be anything other than a day-1 elimination**: the night-1 victim is
> still `isAlive: true` (they are only flipped in
> `farewellSpeech:markDeadAndAdvance`, *during* the farewell). So
> `deadCount = players.filter(p => !p.isAlive).length` **is** the day-1
> elimination count — eligible iff `deadCount <= 1`. No new counter, and no
> roster arithmetic against `seatCount` (which would also mis-read a game where
> the host kicked someone in the lobby: `lobby/joinRequests:kick` **deletes** the
> `gamePlayers` row rather than marking it dead).

### 6.2 Behaviour

- Each eligible tile carries **one round check button, centred on the tile**. The
  victim checks three of them. Empty is a dashed hollow ring that fills on hover;
  checked is a solid amber disc with a stroked checkmark (an inline SVG, never an
  emoji). **No pick-order numbers** — a check reads instantly, and all three
  marks are equal in weight.
- The checked circle is **the same component in the same state for everyone** —
  interactive for the victim, inert for every other viewer (§6.6) — so the
  accusation looks identical to the person making it and the table reading it.
- Checks **toggle freely while fewer than 3 are set** (mis-tap recovery), and
  become **final the instant the 3rd lands**. There is no separate confirm
  button — "3 checked" *is* the confirmation, matching "after choosing all 3, the
  host enters farewell speech." Once locked, the remaining empty rings disappear
  and only the three checks stay on screen.
- Checkable tiles: every seated non-host player **except the victim's own**. You
  cannot suspect yourself, so **no control is ever rendered on the caller's own
  tile** (the server rejects it too).
- **Dead players stay checkable** — a day-1 vote-out can absolutely be mafia, and
  naming them is a legitimate best move.
- Only the victim may submit. The host cannot pick on their behalf.
- **No fouls during `best_move`** — the phase is deliberately absent from
  `FOULS.ALLOWED_PHASES`, like every other non-speaking phase.

### 6.3 Host control & the deadlock guard

- The host gets **one always-enabled button whose label morphs** with progress:
  **"Skip Best Move"** while fewer than 3 are marked → **"Start Farewell
  Speech"** once the set is locked. Above it, the named seats are shown in pick
  order (`? ? ?` → `3 7 ?` → `3 7 9`).
- Reason: a disconnected or AFK victim must never be able to stall the game. The
  host can move on **at any moment**; a skipped best move is stored **partial**
  (0–2 picks) and simply scores nothing.
- One button rather than a disabled-advance-plus-skip pair, so there is never a
  greyed-out control the host is waiting on — the only affordance always works.
- `PHASE_TIMERS.best_move = 30s` — the usual visual-only pressure badge. Because
  nobody is awake by role during `best_move` (§6.6), it reaches the **host only**,
  which is what it is for here: it tells the host when hitting Skip is reasonable.
  Nothing auto-advances at 0, per the `PHASE_TIMERS` contract.

### 6.4 Technical decision: a real `best_move` phase — DECIDED

**Add a new phase, `best_move`, between the last night check and
`farewell_speech`.** The rejected alternative was a sub-state *inside*
`farewell_speech` (enter farewell, gate `grantFarewellTime` until 3 picks land).

| | new `best_move` phase | sub-state of `farewell_speech` |
| --- | --- | --- |
| Host controls | one more entry in the variant's phase→controls map | conditional gating inside the farewell controls |
| Visibility | `getAwakeRoles("best_move")` answers "who acts" like every other phase | farewell visibility grows a mode |
| `farewell_speech` reuse | **untouched** — still shared by night kills *and* vote-out farewells | must branch on "which kind of farewell is this" |
| Timer badge | one `PHASE_TIMERS` entry | no natural home |
| Cost | resolving the night must be split from *entering* farewell | none |

The one cost is real but small — and it is a **strict improvement** to the dawn
seam. `startFarewellSpeech` already resolves the night (§5.2) and *then* decides
where to go (`skipToDay` vs. farewell); best move just adds a third destination
to a branch that already exists:

```
resolve the night (existing code, unchanged)
├─ 0 killed seats                   → enterDayPhase()      (unchanged)
├─ 1 killed seat + eligible (§6.1)  → best_move            (NEW)
└─ 1 killed seat + not eligible     → farewell_speech      (unchanged)
```

`speakingOrder` is set to the randomized killed seats **when the night
resolves**, before routing — so `best_move → farewell_speech` is a pure
`gamePhase` patch and the whole farewell flow (`grantFarewellTime`,
`markDeadAndAdvance`, `advanceFromFarewell`) stays **byte-for-byte unchanged**.

The host-advance graph gains one **deterministic** edge:

```ts
// convex/games/sports/phases.ts
const HOST_ADVANCE: Record<string, Phase> = {
  …
  detective_checks_for_mafia: "farewell_speech", // resolve-marker; server may route to best_move
  best_move: "farewell_speech",                  // deterministic — best_move only exists when there IS a kill
};
```

`detective_checks_for_mafia` stays the **resolve-marker** (the button still means
"resolve the night"); the actual 3-way destination is owned by the server
mutation, per the existing convention that state-dependent transitions live in
mutations and `nextPhase` returns `null` for them.

Definition surface: add `hasBestMove: boolean` to `GameFlags`
(`convex/games/core/types.ts`) — `false` for Japanese, `true` for Sports — so the
shared dawn seam reads a flag rather than a `gameType` literal (§8 guardrails in
[game-types.md](../engine/variant-architecture.md)).

> **Registration note.** `best_move` must be **appended last** to `GAME_PHASES`
> in `src/shared/lib/constants/game.ts` — the same treatment `phase_transition` and
> `don_meet` got — so the positional `GAME_PHASES[0..20]` literals the Japanese
> code still uses stay stable. (`convex/lib/constants.ts`'s `GAME_PHASES` is the
> shorter Japanese-only list and needs no entry.) Labels go in
> `GAME_PHASE_LABELS` plus `messages/en.json` / `messages/ka.json` under
> `phases`: `"best_move": "Best Move"` / `"საუკეთესო სვლა"`.

### 6.5 Data model

Night-1-scoped data, so it belongs on the **night session** row — additive and
optional, exactly like `mafiaTargetSelections` (§5.2), so existing rows validate
unchanged:

```ts
// tables/nightPhaseSessions.ts  (additive, optional)
bestMoveSeat: v.optional(v.number()),               // the victim granted the best move
bestMoveSuspects: v.optional(v.array(v.number())),  // 0–3 named seats, in pick order
```

- **Completion is derived**: `bestMoveSuspects.length === 3`. No separate
  lock/flag to keep in sync.
- **Grant is derived**: `bestMoveSeat !== undefined` means the best move was
  granted this game.
- `bestMoveSeat` duplicates `speakingOrder[0]`, deliberately — it makes the row
  self-describing for game logs and any later scoring pass.

One new server function, in its own `convex/games/core/bestMove.ts` (best move is a
*dawn* action, not a night action, so it stays out of `sportsNightPhase.ts`):

| function | caller | behaviour |
| --- | --- | --- |
| `toggleSuspect` (mutation) | the victim only | Add/remove a seat. Rejects: a non-victim caller (including the host), a call outside `best_move`, a night with no best move granted, targeting the victim's own seat, an unseated/host target, and any *new* pick once 3 are in. |

**There is no companion read function, deliberately.** `bestMoveSeat` /
`bestMoveSuspects` ride along on the already-reactive `nightPhase.getCurrent`
document that `gameRoomContext` exposes as `nightPhaseSession` — the same channel
the UI reads `mafiaTargetWindowActive` from. The host controls and the tile checks
both read it there, so the feature adds **zero** extra queries.

Reaching every client is exactly what is wanted here: the checks are public
(§6.6), so there is nothing to withhold. Only *interactivity* is restricted — the
`toggleSuspect` mutation rejects any caller who is not the victim.

### 6.6 Visibility — everyone sleeps; only the host sees

`best_move` is **not** a public dawn phase. It reuses the **exact same visibility
shape as `mafia_chooses_target`** (§5.4) — no new machinery of any kind:

| Viewer | Sees |
| --- | --- |
| Every player, **including the killed player who is picking** | **No video** — every tile covered (Zzz), as on any night phase. Controls and marks render *above* the covers, exactly as the mafia's kill buttons do. |
| The host | Every player, dimmed. |
| Spectators | No video (unless a staff spectator has host-POV reveal on). |

**The check marks themselves are public.** They render for *everyone* — the
victim, the host, the other players, and spectators — above the covered tiles. So
a sleeping player sees **who was accused but no video**, which is the online
stand-in for hearing the victim call out their three seats at a real table. Only
the victim's circles are clickable; everybody else's are inert, and unchecked
tiles show nothing at all.

Three lines of rules, all in `src/features/game-room/variants/sports/visibility.ts`:

- `canSeeParticipant("best_move")` → `isViewerHost` — sharing a `case` with
  `mafia_chooses_target`, since the rule is identical;
- `isNightActivityPhase("best_move")` → **true** (everyone is asleep);
- `getAwakeRoles("best_move")` → **`[]`** — deliberately absent, because nobody is
  awake.

> **Why not model "the victim is awake"?** Because the best-move actor is a
> specific **player**, not a role, and `getAwakeRoles` is role-based. Expressing it
> would mean threading player-level facts through `canSeeParticipant`,
> `getVisibilityState`, `getVisibilityStateWithDeath` and the variant override —
> which over-complicates participant visibility for one phase's benefit. Keeping
> everyone asleep needs none of that, and the victim does not need to *see* anyone
> to click a check button on their tile.

One consequence, accepted: `PhaseCountdown` gates on `getAwakeRoles`, so with the
list empty **only the host sees the 30s badge**. The victim gets the check buttons
but no visible clock; the host watches the timer and skips when it makes sense
(§6.3). No shared-UI change was needed to achieve that.

Checks are **not** shown once `farewell_speech` starts: the phase is over, the
table is awake, and the tiles go back to normal.

### 6.7 Scoring — out of scope for launch

Real sports mafia awards extra points for 2 or 3 correct guesses. **Sports
launches unrated (§9.7), so nothing is scored** and the correct-count is not
displayed anywhere.

> **The picks are NOT durable.** `bestMoveSuspects` lives on the night session,
> and `deleteGameAndRelations` (`convex/lib/games.ts`) wipes `nightPhaseSessions`
> when the room is cleaned up — so the data survives only as long as the room. A
> retroactive scoring pass over past games is therefore **not** possible today.
> Making it possible means archiving `bestMoveSeat` / `bestMoveSuspects` into
> `gameLogs` at `archiveGameLog` time, alongside the roles needed to grade them.
> That is a deliberate follow-up, not part of this change.

### 6.8 Edge cases

| Situation | Result |
| --- | --- |
| No kill on night 1 (selections disagreed, or a mafia abstained) | No best move — dawn skips to `day_phase`, as today |
| **2+ players eliminated on day 1** (both-leave, or vote-out + foul elimination) | **No best move** — dawn goes straight to `farewell_speech` (§6.1 cond. 3) |
| Exactly 1 eliminated on day 1 | Best move **granted** |
| 0 eliminated on day 1 (day-1 single-nominee rule, §4.1) | Best move **granted** |
| Kill on night 2 or later | No best move — first night only |
| Victim disconnects / never picks | Host advances anyway; 0–2 picks stored, scores nothing (§6.3) |
| Victim names a player who died on day 1 | **Allowed** — a day-1 vote-out can be mafia |
| Victim tries to name themselves | Rejected server-side |
| A best move is already stored for that night | Routing only stamps `bestMoveSeat` when unset, so re-entry is idempotent |
| Win condition triggered by the night-1 kill | **Unreachable.** Worst case at night-1 dawn is 1 day-1 elimination + 1 kill; even if both were citizens that is 3 mafia vs. 5 citizens → continue (§7). So `best_move` can never collide with a win check, and the `beforeDay` / `beforeNight` seams are untouched. |

## 7. Win conditions

> **Generated.** Complete table over every reachable roster: [game-spec.md#win-conditions](../generated/game-spec.md#win-conditions).

The rule is a flat parity check: mafia win once `2m ≥ N`, citizens win when
`m = 0`, otherwise the game continues. Two properties are worth stating
because they are the opposite of Japanese:

- **Context is irrelevant.** `beforeNight` and `beforeDay` give the same
  answer for every roster — the generated table shows both columns so this
  is checkable rather than asserted.
- **No exceptions and no cap.** There is no `N ≤ 6` ceiling and no
  role-presence carve-out, so the key needs nothing beyond `N` and `m`. The
  generator derives that; it is not hand-declared.

It plugs into the same two seams and the same foul trigger as every other
variant — see [engine/win-check-seam.md](../engine/win-check-seam.md). The
host still confirms via the Finish Game banner.

## 8. What stays identical to Japanese

> Moved. This list was a verbatim duplicate of the shared/variant split in
> [engine/variant-architecture.md §4](../engine/variant-architecture.md),
> which is now its single source. Two copies of the same thirteen items is
> how they drift apart.

In short: everything not listed as a difference in this document is shared
engine behaviour and has exactly one implementation.

## 9. Resolved decisions

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
6. **Best Move is its own `best_move` phase, night 1 only, void if 2+ left on
   day 1.** The first-night victim checks 3 suspects — via a round check button
   centred on each tile — before the farewell; checks toggle until the 3rd lands,
   then lock. **Everyone sleeps, including the killed player who is picking** —
   only the host sees the table (dimmed), reusing the `mafia_chooses_target`
   visibility shape verbatim. The host's advance stays always enabled ("Skip Best
   Move") so an AFK or disconnected victim cannot stall the game. Unscored at
   launch. (§6)
7. **Sports launches UNRATED — ELO is skipped.** No `RATING_CONFIG` entry, so
   `archiveGameLog` records games with no rating change (exactly as an unrated
   type does today). A calibrated config can be added later per
   [ranking-system.md](../ranking-system.md) §9.
