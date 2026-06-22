# Community Chat

> A single global, real-time chat channel for all subscribers, with a live
> "who's online" sidebar. Subscription-gated, soft-delete moderation, and a
> daily retention prune. This describes the **implemented** system.

## Overview

`/community-chat` (under the `(headquarters)` route group) is one site-wide
channel — no per-game or per-room scoping. Messages are stored in Convex and
rendered reactively via `useQuery`; there is no polling, optimistic local
state, or fake/ambient data. The online sidebar is driven by the existing
site-wide presence system (see [server-time.md](./server-time.md) is unrelated;
presence lives in `convex/presence.ts`).

This is the **subscription axis** of access (see
[subscriptions.md](./subscriptions.md)) plus a small slice of the **access-role
axis** (see [authorization.md](./authorization.md)) for moderation.

## Data model — `communityMessages`

`convex/tables/communityMessages.ts`:

| Field | Notes |
|---|---|
| `authorId` | `Id<"profiles">` |
| `authorNickname` / `authorAvatar` / `authorRole` | **Denormalized at send-time** — avoids an O(messages) profile fan-out in `list`, and means a later nickname/role change doesn't retro-edit history. |
| `text` | trimmed, 1–`MAX_MESSAGE_LENGTH` chars |
| `createdAt` | ms epoch |
| `deletedAt` / `deletedBy` | soft-delete; absent ⇒ visible |

Indexes: `by_createdAt` (list newest, prune oldest) and `by_author`
(`[authorId, createdAt]`, for the rate-limit check).

Tunables live in `convex/lib/constants.ts → COMMUNITY_CHAT`:
`MAX_MESSAGE_LENGTH` (500), `SEND_COOLDOWN_MS` (3 000), `LIST_LIMIT` (100),
`RETENTION_LIMIT` (200), `ONLINE_CAP` (1000).

## Backend — `convex/community/`

`messages.ts`:

- **`list`** (query) — most recent `LIST_LIMIT`, returned oldest-first.
  `requireFeature(COMMUNITY_CHAT)`. Soft-deleted rows come back with `text: ""`
  and `deleted: true` (deleted text is **never** shipped to the client).
- **`send`** (mutation) — gate order: `requireFeature` → reject if
  `profile.bannedAt` set (`CHAT_BANNED`) → non-empty (`CHAT_EMPTY`) → length
  (`CHAT_TOO_LONG`) → per-author cooldown via `by_author` (`CHAT_RATE_LIMITED`)
  → insert with the denormalized author snapshot.
- **`remove`** (mutation) — `requirePermission(CHAT_MESSAGE_DELETE)`; idempotent
  soft-delete (`deletedAt`/`deletedBy`).
- **`onlineInCommunity`** (query) — the chat sidebar's online list. Mirrors the
  admin `presence.onlineNow` but gated on `COMMUNITY_CHAT` instead of
  `USER_VIEW`. Kept **separate** from the shared `presence.list` cache, which
  must stay free of per-user reads (see the warning in `convex/presence.ts`).

`maintenance.ts` + `crons.ts`:

- **`pruneOldMessages`** (`internalMutation`) — keeps the most recent
  `RETENTION_LIMIT` rows, deletes the rest (this is also how "message removed"
  placeholders eventually vanish). Scheduled **daily** at 04:00 UTC in
  `convex/crons.ts`.

## Access control

- **Feature** `FEATURES.COMMUNITY_CHAT = "community.chat"` in
  `convex/lib/entitlements.ts` — unlocked by all subscription tiers (it's in
  `ALL_FEATURES`); staff get it via the standard staff override.
- **Permission** `PERMISSIONS.CHAT_MESSAGE_DELETE = "chat.message_delete"` in
  `convex/lib/access.ts` — granted to `moderator` and `admin`.
- **Route guard**: the page wraps `<CommunityChat />` in
  `<SubscriptionRouteGuard anyOf={[FEATURES.COMMUNITY_CHAT]}>` (UX redirect to
  `/subscriptions`). The authoritative boundary is the server `requireFeature`
  on every query/mutation. The `(headquarters)` layout already requires auth via
  `AuthGate`; only the chat page (not leaderboard/match-history) adds the
  subscription guard.

## Frontend

- `src/app/(headquarters)/community-chat/page.tsx` — guard + component (replaced
  the old `ComingSoonPage` placeholder).
- `src/components/dashboard/community-chat/CommunityChat.tsx` — adapted from the
  Figma mock. Differences from the mock: **no faction coloring** (single red
  accent; admins/mods get a small badge), real `UserAvatar`, live `list` /
  `onlineInCommunity` data, no seed/ambient bots, `useErrorMessage` + toast on
  send failure, and a moderator-only delete affordance per message.

## Internationalization

next-intl `communityChat` namespace + `errors.CHAT_*` codes in **both**
`messages/en.json` and `messages/ka.json`. Error codes are surfaced by
`useErrorMessage()` (the same path as `SUBSCRIPTION_REQUIRED`).

## Verification

1. `npx convex codegen` + `npx tsc --noEmit` clean.
2. Two windows (different users, both subscribed): a message in one appears in
   the other immediately; online sidebar reflects both.
3. Non-subscriber: `/community-chat` redirects to `/subscriptions`; calling
   `send`/`list` directly throws `SUBSCRIPTION_REQUIRED`.
4. Banned user (`profiles.bannedAt` set): `send` throws `CHAT_BANNED`.
5. Spam: two sends within 3 s → `CHAT_RATE_LIMITED`. Over-length → `CHAT_TOO_LONG`.
6. Admin/moderator: delete shows "message removed" live in every client.
