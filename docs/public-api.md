# Public API (mafia.ge → online game)

The machine-to-machine HTTP surface mafia.ge's PHP backend calls to read data
out of the online game. One endpoint today: batch player stats.

This is the **only** backend surface with no typed client and no user session.
Everything else reaches Convex through `convex/refs/*` (browser) or `api.*`
(tests), where a shape mismatch is a compile error. Here the caller is a PHP
server sending hand-built JSON, so the contract is enforced by validation code
and by `tests/convex/publicApi.test.ts` — nothing else.

The document to hand to the PHP team is
[integrations/mafia-ge-player-stats.ka.md](./integrations/mafia-ge-player-stats.ka.md)
(Georgian). This file is the internal side: why it is built this way, and what
you may safely change.

## 1. Where it lives, and why not Next.js

| | |
| --- | --- |
| Origin (prod) | `https://grand-hyena-805.eu-west-1.convex.site` |
| Origin (dev) | `https://groovy-aardvark-691.eu-west-1.convex.site` |
| Router | `convex/http.ts` — routing table only, no logic |
| Handler | `convex/integrations/playerStats.ts` |
| Shared plumbing | `convex/lib/publicApi.ts` — pure, unit tested |

**The region subdomain is part of the hostname.** The widely-repeated rule for
finding the HTTP-actions origin — "take `NEXT_PUBLIC_CONVEX_URL` and swap
`.convex.cloud` for `.convex.site`" — is correct only if you keep the
`.eu-west-1` segment. Verified against prod:

| Host | Response to an unrouted path |
| --- | --- |
| `grand-hyena-805.eu-west-1.convex.site` | 404 + `This Convex deployment does not have HTTP actions enabled.` — reached the deployment |
| `grand-hyena-805.convex.site` | **empty 404, byte-identical to a nonexistent deployment name** |

So a dropped region segment does not error, warn, or resolve to anything
recognizable — it looks exactly like "your endpoint isn't there". Worth stating
outright to any caller, which is why the handoff doc leads with it.

Every Next.js API route in this repo exists because it needs something Convex
cannot do: LiveKit webhook signature verification, PHP session-cookie exchange,
JWT signing. None of that applies to a stats read. A route under `src/app/api/`
would have been a pure proxy — PHP → Vercel → Convex → back — for zero added
capability, and would additionally have:

- needed a `PUBLIC_PATH_PREFIXES` entry in `convex/lib/access.ts`, or
  `src/middleware.ts` would redirect the call to the PHP login page;
- stamped a `NEXT_LOCALE` cookie onto a server-to-server JSON response;
- coupled the integration's uptime to frontend deploys.

On `.convex.site` there is no middleware in the path and no shared deploy
lifecycle. The trade accepted in exchange: this surface is outside the
`convex/refs/*` convention, so it has no typed contract — hence the guards in §7.

## 2. Authorization

`Authorization: Bearer $STATS_API_SECRET`, checked against the Convex
deployment's `STATS_API_SECRET` environment variable.

Three properties that are deliberate, not incidental:

- **It is not `CONVEX_SYNC_SECRET`.** That secret authorizes
  `auth/profiles:upsertFromPhp`, which *writes* profiles. A read-only stats
  integration must not carry write authority, so leaking one does not imply the
  other.
- **An unset secret rejects everything.** `isAuthorized` returns `false` when
  the env var is missing, rather than letting `Bearer ` (empty) match an empty
  string. A deployment that forgot the variable is closed, not open.
- **The comparison is constant-time.** `node:crypto.timingSafeEqual` is not
  available in the Convex default runtime, so `convex/lib/publicApi.ts` walks
  the full length of both strings and folds the length difference into the
  result instead of returning early.

No CORS headers are emitted, by design. A browser could only call this by
shipping the secret to the client; if an `Access-Control-Allow-Origin` header
ever appears on this surface, that is the bug.

## 3. The contract, and how it may change

`POST /api/stats/players`

```jsonc
// request
{ "accountIds": ["1024", "2048"] }

// response — 200
{
  "stats": {
    "1024": { "gamesPlayed": 137 },
    "2048": { "gamesPlayed": 0 }
  },
  "missing": ["2048"]
}
```

**`gamesPlayed` is global across variants.** It is `playerStats.totalMatches`,
which counts every archived game — `japanese_mafia` and `sports_mafia` alike,
decided games and no-contests alike. That is the agreed meaning on the PHP side.

**`stats` has an entry for every requested id**, zero-filled for ids we have
never seen, so PHP can index it unconditionally. `missing` names the subset
with no `profiles` row — an account that has never signed in to the online
game. Both exist so the simple case stays simple while "played nothing" is
still distinguishable from "unknown account".

Three growth rules follow from there being no version negotiation on this
surface:

1. **Add keys, never rename or repurpose them.** A new stat is a new field the
   caller can ignore until it is ready. Changing what `gamesPlayed` means
   silently corrupts whatever mafia.ge already renders from it — that is the
   one genuinely breaking change available here.
2. **A per-variant breakdown is a new field**, e.g.
   `gamesPlayedByType: { japanese_mafia, sports_mafia }` — not a redefinition
   of `gamesPlayed`. Note that `playerStats` is not currently namespaced by
   game type, so this needs a schema change, not just a projection; the same
   limitation is called out on `games/core/leaderboard:getLeaderboard`.
3. **Keep `stats` total.** Whatever fields exist must be present for every
   requested id, including unknown ones, or the "index it unconditionally"
   guarantee dies.

## 4. Errors

One envelope for every failure, so the caller writes one branch:

```json
{ "error": "unauthorized", "message": "Invalid or missing bearer token." }
```

| Status | `error` | Meaning |
| --- | --- | --- |
| 401 | `unauthorized` | Missing, malformed, or wrong bearer token. Does not distinguish which. |
| 400 | `invalid_body` | Body is not JSON, not an object, or `accountIds` is not an array of strings/numbers. |
| 413 | `too_many_accounts` | More than `MAX_ACCOUNT_IDS` (200) distinct ids. Page on the caller's side. |

Numbers are accepted as account ids alongside strings: PHP's `json_encode`
emits bare integers for an int account id, and requiring the caller to cast
every id would produce a silent empty result rather than an error. Ids are
trimmed, blanks dropped, duplicates collapsed — `["7", 7, " 7 "]` is one id.

The 200-id cap is applied **after** dedupe. One request costs two indexed
point-reads per distinct id, so the cap bounds a caller bug into ~400 reads;
a caller repeating one id 500 times costs two reads and is not rejected for it.

## 5. Adding a stat

Cost is O(1) per player regardless of history: `playerStats` is a rolling
aggregate maintained by `bumpPlayerStats` in `convex/lib/games.ts` as each game
archives. Anything already on that row is free to expose.

1. Add the field to `PlayerStatsPayload` and to `toPayload` in
   `convex/integrations/playerStats.ts`. Both are adjacent, on purpose.
2. If the field is not already on `playerStats`, add it there and to
   `bumpPlayerStats` first — do not derive it by scanning `gameLogPlayers` per
   request, which would make cost grow with a player's history.
3. Extend `tests/convex/publicApi.test.ts` if the request shape changed.
4. Update §3 above and the Georgian handoff doc, then tell the PHP team. A new
   field is additive, so this is a notification, not a coordinated deploy.

Adding a whole endpoint: put the handler beside its data under
`convex/integrations/`, route it in `convex/http.ts`, and keep the router free
of logic.

## 6. Verified behaviour

Measured against the dev deployment (`groovy-aardvark-691`) with real
`playerStats` rows, after `npx convex dev --once`:

| Case | Result |
| --- | --- |
| 4 real ids + 1 unknown | 200; counts matched `playerStats.totalMatches` exactly (29 / 14 / 6 / 3); unknown id returned `0` and appeared in `missing` |
| `[4340, 4910]` as numbers | 200, identical to the string form |
| `["4340", 4340, " 4340 ", "", ""]` | 200 with a single `4340` entry |
| no / wrong / `Basic`-scheme token | 401 `unauthorized` |
| malformed JSON, `accountIds` as a string | 400 `invalid_body` |
| 201 distinct ids | 413 `too_many_accounts` |
| 200 distinct ids | 200, 5611 bytes |
| `GET` on the right path | 404 `No matching routes found` (Convex's router default, not our envelope) |

Latency: **0.54 s for 5 ids, 0.73 s for 200.** Per-id cost is nearly free; the
fixed round-trip dominates, which is the concrete reason the handoff doc pushes
batching over per-player calls.

Note the three distinguishable 404 bodies — wrong host (empty), wrong method
(`No matching routes found`), and not-yet-deployed (`This Convex deployment
does not have HTTP actions enabled.`). They are the fastest triage signal this
surface has, so §4 of the handoff doc tabulates them.

## 7. Guards

`npm test` is the only thing standing between a rename and a silent 404.

- `tests/structure/magicPaths.test.ts` — `convex/http.ts` is a **magic path**.
  Convex discovers the router at exactly that filename. Move it, or drop the
  default export, and every route stops existing with no build error, no type
  error, and no deploy warning. The same test also verifies each routed handler
  is still a real export of the module it is imported from.
- `tests/convex/apiIntegrity.test.ts` — module count, function count, and the
  signature snapshot in `tests/convex/__snapshots__/inventory.txt`, which now
  pins `integrations/playerStats:byAccountIds` and `:handleGetPlayerStats`.
- `tests/convex/publicApi.test.ts` — the request contract itself.

`npm run codegen` needs deployment credentials, so `convex/_generated/api.d.ts`
was extended by hand when these modules landed; the `_generated drift` check in
`apiIntegrity.test.ts` is what verifies that edit against the bundler's real
module set.

## 8. Deployment checklist

1. Set `STATS_API_SECRET` in the Convex dashboard (Settings → Environment
   Variables) for **each** deployment that should serve the integration.
   Generate it as random, not memorable — nothing types it by hand.
2. Deploy. The route is live at
   `https://grand-hyena-805.eu-west-1.convex.site/api/stats/players` (prod).
   Until then that path returns a 404 whose body reads `This Convex deployment
   does not have HTTP actions enabled.` — a useful confirmation that the
   hostname is right and only the deploy is missing.
3. Give the PHP team the URL and the secret over a private channel, along with
   [integrations/mafia-ge-player-stats.ka.md](./integrations/mafia-ge-player-stats.ka.md).
4. Rotation: set the new value, then have PHP switch. There is no overlap
   window — a single-secret check means rotation is a brief hard cutover, so do
   it deliberately. If that becomes a problem, accept an array of valid secrets
   rather than inventing a second auth scheme.
