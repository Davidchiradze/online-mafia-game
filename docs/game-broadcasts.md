# Game Room Notifications (Staff Broadcasts + System Pushes)

> A per-game notification channel delivered to **everyone in the room** — all
> seated players **and** spectators — as a one-time toast. Staff use it to
> respond to in-game reports; the same channel is reusable for system-generated
> pushes (news, automated events). This describes the **implemented** system.

## Overview

A "broadcast" is a room-scoped notification that surfaces once, as a transient
toast, on every connected client in that game. It is **not** a chat thread: there
is no history UI, no read state, and nothing is persisted client-side.

Delivery is over **Convex reactive queries**, not LiveKit data channels. Convex
re-runs the query and pushes current state to every subscribed client — including
one that is mid-reconnect — so the message can't be silently dropped for the exact
player a report-response needs to reach. Players and spectators already subscribe
to Convex regardless of LiveKit connection state, so both receive it uniformly.
LiveKit stays audio/video-only (see [realtime.md](./realtime.md)).

The channel is **not staff-only plumbing.** A `kind` discriminator lets the same
table carry staff messages and future system/news pushes; the staff "send message
to room" tool is just one producer.

## Data model — `gameBroadcasts`

`convex/tables/gameBroadcasts.ts`:

| Field | Notes |
|---|---|
| `gameId` | `Id<"games">` |
| `kind` | `"staff" \| "system" \| "news"` — drives toast presentation; extensible |
| `text` | trimmed, 1–`GAME_BROADCAST.MAX_MESSAGE_LENGTH` chars |
| `title` | optional — e.g. a news headline |
| `senderId` / `senderNickname` / `senderRole` | **Optional**, denormalized at write-time. Absent for system/automated pushes. |
| `createdAt` | ms epoch |

Index: `by_gameId` (`[gameId, createdAt]`) — serves both the newest-first `recent`
query and the cascade-delete lookup.

Tunables live in `convex/lib/constants.ts → GAME_BROADCAST`:
`MAX_MESSAGE_LENGTH` (500), `RECENT_WINDOW_MS` (120 000), `LIST_LIMIT` (10).

### Lifecycle — no retention cron

`gameBroadcasts` is listed in `GAME_RELATED_TABLES` (`convex/lib/games.ts`), so
`deleteGameAndRelations` cascades the rows away when the game is deleted. There is
no separate prune job — broadcasts live and die with their game.

## Backend — `convex/game/broadcasts.ts`

One private `insertBroadcast` helper is the single source of truth for game
existence and text validation (`GAME_NOT_FOUND` / `BROADCAST_EMPTY` /
`BROADCAST_TOO_LONG`), shared by two producers:

- **`send`** (mutation, `{ gameId, text }`) — the **staff** producer. Gated by
  `requirePermission(GAME_BROADCAST)` (moderators + admins). Inserts `kind: "staff"`
  with the sender snapshot, and records an `adminAuditLog` entry (`game.broadcast`).
- **`push`** (`internalMutation`, `{ gameId, kind, text, title? }`) — the reusable
  **system** producer. No auth, no sender. Call it from other Convex functions,
  crons, or `ctx.scheduler` via `internal.game.broadcasts.push` to emit news or
  automated notifications. Mirrors the internal-only pattern used by the
  `*Internal` mutations in `convex/game/*`.
- **`recent`** (query, `{ gameId }`) — any authenticated user (all lobby members
  receive room notifications regardless of subscription tier). Returns rows for the
  game newer than `now - RECENT_WINDOW_MS`, newest-first, capped at `LIST_LIMIT`.
  The freshness window keeps the subscription cheap and stops a just-joined client
  being toasted with stale announcements.

Client-facing refs (`send`, `recent`) are in `convex/refs/game.ts → gameBroadcasts`.
`push` is internal and is invoked via the generated `internal.` reference, not a ref.

## Access control

- **Permission** `PERMISSIONS.GAME_BROADCAST = "game.broadcast"`
  (`convex/lib/access.ts`) — granted to `moderator` **and** `admin` (unlike
  `GAME_REVEAL_ROLES`, which is admin-only). See [authorization.md](./authorization.md).
- **No subscription gate** on `recent`: every player/spectator must receive room
  notifications, so it only requires authentication (`getAuthenticatedProfile`).
- **UI gate**: the staff tool is shown only to a spectating moderator/admin; the
  `send` mutation re-checks `GAME_BROADCAST` server-side — the authoritative boundary.

## Frontend

### Receiving — `useGameBroadcasts` (the listener)

`src/hooks/game/useGameBroadcasts.tsx` subscribes to `gameBroadcasts.recent` and
turns each **new** row into a toast (`src/lib/utils/toast.tsx`). It tracks shown
ids in a `useRef<Set>`; on first load it adopts the current window as already-seen
so joining mid-game never replays the backlog — the same skip-first-render approach
as `useFoulNotification`. Presentation switches on `kind` (staff messages show the
sender label, news shows its title). Toasts auto-close after 8s.

The hook is called directly in the two components that render a room —
`src/components/liveKit/LiveKitTestComponent.tsx` (players) and
`src/components/game/SpectatorView.tsx` (spectators). These views are mutually
exclusive per client, so exactly one instance runs — no duplicate toasts. It is
**not** mounted in `gameRoomContext` (nothing in the context consumes it).

### Sending — the staff tool (`src/components/game/staff-tools/`)

The floating staff toolbar is a folder of single-responsibility components:

- `StaffToolsButton.tsx` — the FAB + panel container; gates each tool by privilege.
- `ToolButton.tsx` — shared presentational row (icon, title, description, trailing).
- `RevealRolesTool.tsx` — host-POV role reveal (admin only; see game-design).
- `BroadcastTool.tsx` — "send message to room" launcher; owns its modal state.
- `BroadcastModal.tsx` — compose + `useMutation(gameBroadcasts.send)`; toast on
  success, `useErrorMessage()` toast on failure (same error path as community chat).

`canBroadcast` (= spectating **and** `GAME_BROADCAST`) is computed locally in
`StaffToolsButton` from the current profile, not stored in `gameRoomContext` —
only the staff toolbar needs it. (Contrast `canRevealRoles`, which *does* live in
the context because it feeds the `gameRoles.getVisible` query.)

## Internationalization

next-intl `game.staffTools` namespace (`broadcast`, `broadcastTitle`,
`broadcastPlaceholder`, `send`, `sending`, `cancel`, `broadcastSent`) and a
`game.broadcast` namespace (`staffLabel`) in **both** `messages/en.json` and
`messages/ka.json`. Error codes `FORBIDDEN`, `BROADCAST_EMPTY`, `BROADCAST_TOO_LONG`
are added to the `errors` namespace and surfaced by `useErrorMessage()`.

## Verification

1. `npx convex codegen` + `npx tsc --noEmit` clean.
2. Three windows on one live game (player, spectator, staff spectator): staff opens
   Staff Tools → Send message to room → sends. Player and spectator both see the
   toast **once**; it does not re-fire on unrelated re-renders.
3. A window that joins *after* a message was sent is not toasted with the backlog;
   a message sent within `RECENT_WINDOW_MS` still reaches someone who just joined.
4. Non-staff calling `game/broadcasts:send` directly → `FORBIDDEN`. Moderator and
   admin can both send. Empty/over-length → `BROADCAST_EMPTY` / `BROADCAST_TOO_LONG`.
5. Reusability: run `internal.game.broadcasts.push` from the Convex dashboard with
   `{ gameId, kind: "news", title, text }` — every client in the room toasts it once,
   unattributed.
6. Delete/finish the game → its `gameBroadcasts` rows are gone (cascade).
