# Community Chat

> A single global, real-time chat channel for all subscribers, surfaced through
> a floating chat **widget** with a live "who's online" panel and an unread
> count badge. Subscription-gated, soft-delete moderation, and a daily retention
> prune. This describes the **implemented** system.

## Overview

The community channel is one site-wide channel — no per-game or per-room
scoping. It is reached through the **floating chat widget**
(`FloatingChatWidget`, mounted once in `HeadquartersWrapper`) rather than a
routed page — there is no `/community-chat` route. Messages are stored in Convex
and rendered reactively via `useQuery`; there is no polling, optimistic local
state, or fake/ambient data. The online list is driven by the existing
site-wide presence system (presence lives in `convex/presence.ts`).

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

## Data model — `communityReadState`

`convex/tables/communityReadState.ts` — per-user read state powering the
widget's unread badge (industry-standard server-side `last_read` model: syncs
across devices, survives a cache clear).

| Field | Notes |
|---|---|
| `profileId` | `Id<"profiles">` — one row per user |
| `lastReadAt` | ms epoch of the most recent mark-read |

Index: `by_profile` (`[profileId]`). Kept in its own table rather than as a
`profiles` field on purpose — writing read state on every mark-read would
invalidate the heavily-subscribed `currentProfile` query everywhere.

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

`readState.ts` (the unread badge — both `requireFeature(COMMUNITY_CHAT)`):

- **`unreadCount`** (query) — counts non-deleted messages newer than the
  caller's `lastReadAt`, **excluding the caller's own** messages. Returns `0`
  when no read-state row exists (new users aren't greeted with a backlog) and
  caps at 99 (UI renders "99+"). Bounded by retention, so it's cheap + reactive.
- **`markRead`** (mutation) — upserts the caller's read-state row to
  `Date.now()` (server-stamped). The widget calls it on open and as new messages
  arrive while open; the row is created lazily on first open.

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
- **UI gate**: `FloatingChatWidget` renders nothing unless
  `useEntitlements().has(COMMUNITY_CHAT)` — so non-subscribers never see the
  widget and its gated queries are never called. This is UX only; the
  authoritative boundary is the server `requireFeature` on every
  query/mutation.

## Frontend

- `src/features/headquarters/community-chat/FloatingChatWidget.tsx` — the floating
  widget. A red FAB fixed bottom-right (`z-40`) shows the live `unreadCount`
  badge; clicking it toggles a bottom-right panel (compact, or expanded with the
  online list). Open/expanded state persists in `localStorage`. The heavy `list`
  / `onlineInCommunity` subscriptions are skipped while collapsed (the
  `active` flag on `useCommunityChat`); only the lightweight `unreadCount`
  subscription stays live. Mounted once in `HeadquartersWrapper`, so it appears
  on every headquarters page **and** `/lobby` (both use that wrapper) — but not
  the in-game room. **No faction coloring** (single red accent; admins/mods get
  a small badge), real `UserAvatar`, live data, no seed/ambient bots,
  `useErrorMessage` + toast on send failure, and a moderator-only delete
  affordance per message. Reuses the presentational `MessageList` / `MessageItem`
  / `Composer` / `OnlinePanel` components.

## Internationalization

next-intl `communityChat` namespace + `errors.CHAT_*` codes in **both**
`messages/en.json` and `messages/ka.json`. Error codes are surfaced by
`useErrorMessage()` (the same path as `SUBSCRIPTION_REQUIRED`).

## Verification

1. `npx convex codegen` + `npx tsc --noEmit` clean.
2. Two windows (different users, both subscribed): a message in one appears in
   the other immediately; online panel reflects both.
3. Non-subscriber: the widget never renders; calling `send`/`list`/`unreadCount`
   directly throws `SUBSCRIPTION_REQUIRED`.
4. Unread badge: a message from another user bumps the collapsed widget's badge
   live; opening clears it; reload keeps it cleared (server-side persistence,
   cross-device). Your own messages never count toward your badge.
5. Banned user (`profiles.bannedAt` set): `send` throws `CHAT_BANNED`.
6. Spam: two sends within 3 s → `CHAT_RATE_LIMITED`. Over-length → `CHAT_TOO_LONG`.
7. Admin/moderator: delete shows "message removed" live in every client.
