# convex/ — local rules

Reinforcement at the point of danger. The full picture is in the
`convex-backend` skill; these are the ones that cost the most when missed.

1. **Never import from `src/`.** One-way boundary — lint errors. Imports inside
   `convex/` are **relative** (`../../lib/constants`); the `@convex/` alias is a
   `src/` convention and does not resolve here.

2. **Auth is `getAuthenticatedUser(ctx)`** from `lib/auth.ts`. There is no
   `getAuthUserId` and no `@convex-dev/auth` in this repo. Gate with
   `requirePermission` / `requireFeature`, never a raw role compare.

3. **Definitions stay pure.** Anything under `games/<variant>/` must have no
   `ctx.db` and no React — the frontend and the spec generator both import them.

4. **Moving a file here breaks things silently.** `_generated` is committed and
   `skipLibCheck` is on, so a stale `api.d.ts` import degrades to `any` and
   `tsc` exits 0. Plus 106 raw function-path strings in `refs/*` that `tsc`
   never sees. **`npm test` is the only guard** — run it after any move or
   rename, and do not trust a green typecheck.

5. **`*.test.ts` here is bundler-ignored** (more than one dot in the basename)
   and runs under `edge-runtime`. A non-test helper in `tests/` **would** be
   deployed — give helpers a multi-dot name like `seed.helpers.ts`.

6. **A read helper used by 2+ files lives in `lib/`** and is imported — never
   re-declared at the top of each file. Grep the name before writing a private
   `async function get…(db, …)`. `getGameSession` is currently six identical
   copies, each throwing a bare-string `ConvexError` the client cannot
   translate; fold them into `lib/games.ts` when you touch one.

7. **Name the transition, don't wrap the patch.** No generic
   `updateSession(db, id, fields)` — `ctx.db.patch` is already exact-typed
   against the schema, and `games/core/sessions.ts:update` shows what the
   wrapper degrades into. Extract *repeated multi-field shapes* instead
   (`startSpeaker`, `pauseSpeaker`, `enterFarewell`), so paired fields like
   `currentSpeakerIndex`/`speakerStartedAt` cannot drift apart. **One patch per
   document per handler** — build the object across branches, apply once.
