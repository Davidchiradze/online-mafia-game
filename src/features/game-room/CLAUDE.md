# game-room/ — local rules

The 164-file hot zone, and the one place where a wrong default silently breaks
one variant while the other keeps working.

1. **Never branch on `gameType`.** Read the resolved `ruleset` from
   `useGameRoom()`. The two registries are the only places allowed to name a
   variant by string literal.

2. **Night-action permission comes from `ruleset.nightAuthority(...)`**, not an
   ad-hoc role check. Japanese has a single kill authority (DON > RH > MAFIA);
   Sports gives **every** living mafia authority, and their picks are
   **private** — showing one mafia another's target leaks the vote.

3. **Seat geometry comes from `ruleset.seatLayout`.** 12-seat and 10-seat rings
   differ in grid size *and* in whether the centre panel is merged or split.
   Never assume 12.

4. **Timers use `useServerTime()`.** Never subtract a server timestamp from a
   raw `Date.now()`.

5. **Convex calls go through `@convex/refs/game` and `@convex/refs/lobby`**, not
   `api.*`.

Variant `phaseControls.tsx` files are the one place multiple components per file
is intended — they colocate a phase's small controls with the map registering
them. Everywhere else in here, one component per file.
