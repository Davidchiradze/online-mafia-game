# Subscriptions — Tiers, Entitlements & Access Gating

> How paid access is modeled and enforced: the subscription **tiers**, the
> **features** each tier unlocks, and how create / join / spectate / the game
> route are gated on both the server (authoritative) and the UI. This describes
> the **implemented** system.

## Overview

Players buy a subscription **package** on the external PHP backend. The package
is synced into Convex as a snapshot on `profiles.subscription` and used to gate
gameplay: without an active subscription you cannot create, join, or spectate a
game, and you cannot reach the game room route at all.

This is the **subscription axis** of access control. It is deliberately separate
from the **access-role axis** (`user / moderator / admin` — see
[authorization.md](./authorization.md)). A profile has **both**:

| Axis | Lives in | Means | Doc |
|---|---|---|---|
| **Subscription tier** (this doc) | `profiles.subscription.packageId` | what paid features are unlocked | ✅ |
| **Access role** | `profiles.role` | staff capabilities (admin panel, moderation) | [authorization.md](./authorization.md) |
| In-game role | `gamePlayerRoles.role` | DON/MAFIA/DOCTOR | [game-design.md](./variants/japanese/rules.md) |

The single bridge between the two axes is the **staff override**: moderators and
admins are granted the highest tier's features regardless of whether they hold a
subscription (see below).

## Model: tier → feature map (entitlements)

The design mirrors the permission-based RBAC pattern. Each subscription **tier**
maps to a set of named **features** (capabilities). Code checks *features*, never
a raw `packageId` — so changing what a tier unlocks, or adding a tier, is a
one-line edit to the map and nothing else moves.

```ts
// convex/lib/entitlements.ts

// Tiers = the PHP `subscription.packageId` values. Ordered so premium (3) stays
// last — HIGHEST_TIER (staff override) is the last element, so daily (4), the
// lowest tier, is listed first despite its numeric value.
export const SUBSCRIPTION_TIERS = [4, 1, 2, 3] as const; // Daily / Basic / Standard / Premium

export const FEATURES = {
  PLAY_GAME:     "game.play",     // create or join a game as a player
  SPECTATE_GAME: "game.spectate", // watch a game as a spectator
} as const;

// Today all four tiers unlock the same set. Future divergence happens HERE only.
export const TIER_FEATURES: Record<SubscriptionTier, readonly Feature[]> = {
  4: ALL_FEATURES,
  1: ALL_FEATURES,
  2: ALL_FEATURES,
  3: ALL_FEATURES,
};
```

| Feature | tier 4 | tier 1 | tier 2 | tier 3 | no sub | moderator/admin |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `game.play` | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| `game.spectate` | ✅ | ✅ | ✅ | ✅ | — | ✅ |

## Single source of truth — `convex/lib/entitlements.ts`

Like [`convex/lib/access.ts`](../convex/lib/access.ts), this module lives in
`convex/` so **both** runtimes share one definition: Convex functions import it
directly; the Next.js layer imports it via the `@convex/lib/entitlements` alias.
Convex never imports from `src/`.

Exports:

- **Tiers:** `SUBSCRIPTION_TIERS`, `SubscriptionTier`, `HIGHEST_TIER`,
  `normalizeTier(packageId)`.
- **Features:** `FEATURES`, `Feature`, `featureValidator`.
- **Mapping:** `TIER_FEATURES`, `getFeaturesForTier(tier)`.
- **Resolvers** (take a minimal `{ role, subscription }` shape so they accept a
  full `Doc<"profiles">` on the server or the `currentProfile` result on the
  client): `getActiveTier`, `getFeatures`, `hasFeature`, `isSubscriptionActive`.

### Validity — trust the synced `active` flag

PHP is the source of truth. `convex/auth/profiles.ts:upsertFromPhp` writes a
snapshot to `profiles.subscription` on every page load
(`src/app/api/auth/sync-profile/route.ts`):

```ts
subscription?: { packageId: number; from?: string; to?: string; active: boolean }
```

A subscription is treated as active iff `subscription.active === true`. We do
**not** re-compute validity from the `to` date — the PHP-computed `active` flag
is authoritative. Trade-off: a subscription that expires *between* page loads
stays active in Convex until the next sync. `from`/`to` are display-only.

**Exception — reporting/analytics.** The stale-`active` trade-off is fine for
*access* (a user must load a page to play, which re-syncs), but it inflates
*counts*: a user who never returns keeps `active === true` forever after their
`to` date passes. So admin **analytics** count subscribers by the `to` date
instead, via `isSubscriptionActiveByDate(subscription, now)` — when a parseable
`to` exists it alone decides (future ⇒ active), else it falls back to the flag.
This resolver is **reporting-only**; access gating still uses `hasFeature` /
`isSubscriptionActive`.

### Staff override

```ts
getFeatures({ role, subscription }):
  moderator | admin              → features of HIGHEST_TIER  (no subscription needed)
  else, subscription.active      → features for that tier
  else                           → []
```

The subscriptions **billing page** intentionally bypasses this override and reads
the raw `subscription` (a staff member with no purchase still sees the inactive
state on their own billing page) — the override is about *access*, not about what
the user actually bought.

## Backend enforcement (authoritative)

The only real security boundary. `convex/lib/auth.ts` adds `requireFeature`
alongside the existing `requirePermission`, following the same pattern:

```ts
// convex/lib/auth.ts
export async function requireFeature(ctx, feature: Feature): Promise<Doc<"profiles">> {
  const profile = await getAuthenticatedProfile(ctx);
  if (!hasFeature({ role: profile.role, subscription: profile.subscription }, feature)) {
    throw new ConvexError({ code: "SUBSCRIPTION_REQUIRED", message: "…" });
  }
  return profile;
}
```

The distinct `SUBSCRIPTION_REQUIRED` code (vs `FORBIDDEN`) lets the UI show an
upsell rather than a generic denial.

Every gameplay entry point **starts** with `requireFeature`, mirroring how admin
functions start with `requirePermission`:

| Entry mutation | File | Gate |
|---|---|---|
| Create game | `convex/lobby/games.ts` → `create` | `PLAY_GAME` |
| Join / rejoin | `convex/games/core/players.ts` → `join` | `PLAY_GAME` |
| Auto join-request (fired on page load) | `convex/lobby/joinRequests.ts` → `checkOrRequest`, `request` | `PLAY_GAME` |
| Spectate | `convex/games/core/spectators.ts` → `join` | `SPECTATE_GAME` |

A non-subscriber cannot create a join request, join, or spectate even if they
bypass the client (disabled JS, scripted calls). They never get a LiveKit token,
so no video/voice/hidden-role data is reachable.

## Route protection — the game room

Typing `/game/[id]` directly must not grant access. The `/game` layout wraps
children in a redirecting guard:

```tsx
// src/app/game/layout.tsx
<AuthGate>
  <SubscriptionRouteGuard anyOf={[FEATURES.PLAY_GAME, FEATURES.SPECTATE_GAME]}>
    {children}
  </SubscriptionRouteGuard>
</AuthGate>
```

`SubscriptionRouteGuard` ([src/features/auth/components/SubscriptionRouteGuard.tsx](../src/features/auth/components/SubscriptionRouteGuard.tsx))
is the subscription-axis sibling of `PermissionGuard`: while the profile loads it
shows a spinner; if the user holds none of `anyOf` it fires an error toast
("An active subscription is required to access that page.") **once** (a ref guards
against StrictMode double-invoke) and `router.replace`s to `/subscriptions`.

This is **UX, not security** — the server `requireFeature` gates above are the
authoritative boundary. The guard just prevents the room shell from rendering for
non-subscribers.

## Frontend usage

### `useEntitlements()` — `src/features/auth/hooks/useEntitlements.ts`

Subscription-axis sibling of `useAccess()`. Built on the reactive
`api.auth.profiles.currentProfile` query:

```ts
const { isLoading, tier, isSubscribed, features, has } = useEntitlements();
{has(FEATURES.PLAY_GAME) && <CreateButton />}
```

Lives with the auth feature under `src/features/auth/hooks/`.

### `SubscriptionGuard` — `src/features/auth/components/SubscriptionGuard.tsx`

Inline guard (unlike the redirecting route guard): renders `children` when the
user has the feature, otherwise a `fallback` (defaults to `SubscriptionUpsell`, a
link to `/subscriptions`). Also exports `SUBSCRIPTIONS_PATH`.

### UI gating of controls

- **Create** — `src/features/lobby/components/LobbyContent.tsx`: the create button is
  wrapped in `<SubscriptionGuard feature={PLAY_GAME}>`; non-subscribers see an
  upsell button instead.
- **Join / rejoin / spectate** — `src/features/lobby/components/room-card/RoomCard.tsx`: derives
  `canPlay` / `canSpectate` from the same profile query; locked controls show a
  lock icon and redirect to `/subscriptions` on click.
- **Spectator prompt** — `src/features/game-room/components/room/SpectatorJoinPrompt.tsx`: the
  page-level safety net for direct URLs shows a "subscription required" card with
  a *View plans* button.

### Subscriptions / billing page

`src/features/subscriptions/components/SubscriptionsContent.tsx` derives the
active package from the **real** `profile.subscription` (never static config). A
package shows as "Purchased" only when `subscription.active === true`. The numeric
`packageId` (1/2/3) is mapped to the config package id
(`basic`/`standard`/`premium`) via `packageConfigIdForTier()` in
[src/features/subscriptions/lib/subscriptions.ts](../src/features/subscriptions/lib/subscriptions.ts) — the
single place the two id schemes are bridged. The package catalog (prices, labels,
i18n keys) lives in `src/features/subscriptions/lib/subscriptions.json`.

## Internationalization

Strings use **next-intl**. Subscription gate strings live under
`subscriptions.gate` and the error code under `errors.SUBSCRIPTION_REQUIRED`, in
**both** `messages/en.json` and `messages/ka.json`:

- `subscriptions.gate`: `subscribeToPlay`, `lockedTitle`, `lockedBody`,
  `viewPlans`, `noAccessToast`.
- `errors.SUBSCRIPTION_REQUIRED` — resolved by `useErrorMessage()` when a gated
  mutation throws.

## Extending

- **New gated feature:** add a key to `FEATURES`, add it to the relevant tiers in
  `TIER_FEATURES`, and call `requireFeature(ctx, FEATURES.X)` at the server entry
  point (+ optional `<SubscriptionGuard feature={X}>` in the UI). No call sites
  change for existing features.
- **Tier divergence** (a tier unlocks less/more): edit `TIER_FEATURES` only.
- **New gated route/section:** wrap its layout in `<SubscriptionRouteGuard>`.

## File / folder map

| Path | New? | Purpose |
|---|---|---|
| `convex/lib/entitlements.ts` | new | Source of truth: tiers, FEATURES, TIER_FEATURES, resolvers, staff override |
| `convex/lib/auth.ts` | edit | `requireFeature(ctx, feature)` |
| `convex/lobby/games.ts`, `convex/games/core/players.ts`, `convex/games/core/spectators.ts`, `convex/lobby/joinRequests.ts` | edit | `requireFeature` at gameplay entry points |
| `src/features/auth/hooks/useEntitlements.ts` | new | `useEntitlements()` |
| `src/features/auth/components/SubscriptionGuard.tsx` | new | Inline guard + `SubscriptionUpsell` + `SUBSCRIPTIONS_PATH` |
| `src/features/auth/components/SubscriptionRouteGuard.tsx` | new | Redirecting route guard (game room) |
| `src/app/game/layout.tsx` | edit | Wraps the game route in the route guard |
| `src/features/lobby/components/LobbyContent.tsx`, `src/features/lobby/components/room-card/RoomCard.tsx`, `src/features/game-room/components/room/SpectatorJoinPrompt.tsx` | edit | UI gating of create/join/spectate |
| `src/features/subscriptions/components/SubscriptionsContent.tsx`, `src/features/subscriptions/lib/subscriptions.ts`, `src/features/subscriptions/lib/subscriptions.json` | edit | Billing page reads real subscription; `packageConfigIdForTier()` |
| `messages/en.json`, `messages/ka.json` | edit | `subscriptions.gate`, `errors.SUBSCRIPTION_REQUIRED` |

## Verification

1. `npx tsc --noEmit` is clean.
2. **User, no active sub:** create/join/spectate controls show locked/upsell;
   visiting `/game/[id]` directly fires the toast and redirects to
   `/subscriptions`; calling a gated mutation directly throws
   `SUBSCRIPTION_REQUIRED`.
3. **User, active sub (any tier):** create + join + spectate work; controls
   enabled; `/game` reachable.
4. **Moderator/admin, no sub:** full access via the staff override, but their own
   billing page still shows the inactive state.
5. Toggle `subscription.active` on a profile in the Convex dashboard and confirm
   the UI reacts live (reactive `currentProfile` query) after the next sync.
