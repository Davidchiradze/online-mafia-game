# Authorization — Roles, Permissions & the Admin Panel

> Design contract for app-level access control: the `/admin` panel, the
> `user / moderator / admin` roles, and how routes, server functions, and UI are
> gated. This describes the **planned** implementation — it is the spec the code
> follows, not a record of code that already exists.

## Overview

The app needs an admin panel (`/admin`) and app-level roles so staff can manage
users and games in production. This is **access control** (who may perform an
action), and it is deliberately separate from two other things that also use the
word "role":

| Concept | Lives in | Example values | This doc? |
|---|---|---|---|
| **Access role** (this doc) | Convex `profiles.role` | `user`, `moderator`, `admin` | ✅ |
| In-game role | `gamePlayerRoles.role` | `DON`, `MAFIA`, `DOCTOR` | ❌ (see [game-design.md](./game-design.md)) |
| PHP account role | MySQL `accounts` | billing/account type | ❌ never synced into Convex |

The PHP account role is **not** synced into Convex (the sync in
`src/app/api/auth/sync-profile/route.ts` intentionally omits it). `profiles.role`
is therefore **Convex-owned** and means only one thing: the access role.

## Model: permission-based RBAC

Each user has exactly **one** access role. Roles do not get checked directly at
call sites — instead each role maps to a set of **permissions** (capabilities),
and code checks permissions. Adding a future role then means one new entry in the
role→permission map and nothing else moves.

### Roles

```ts
export const ACCESS_ROLES = ["user", "moderator", "admin"] as const;
export type AccessRole = (typeof ACCESS_ROLES)[number];
export const DEFAULT_ACCESS_ROLE: AccessRole = "user"; // absent role ⇒ user
```

### Permissions and the role map

```ts
export const PERMISSIONS = {
  ADMIN_PANEL_ACCESS: "admin_panel.access", // may open /admin at all
  USER_VIEW:          "user.view",          // view users
  USER_BAN:           "user.ban",           // ban / suspend
  ROLE_ASSIGN:        "role.assign",        // promote / demote
  GAME_VIEW_ALL:      "game.view_all",      // see any game (bypass visibility)
  GAME_FORCE_END:     "game.force_end",     // force-end / cancel a game
  GAME_REFUND:        "game.refund",        // trigger PHP refund (money)
} as const;
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
```

| Permission | user | moderator | admin |
|---|:--:|:--:|:--:|
| `admin_panel.access` | — | ✅ | ✅ |
| `user.view` | — | ✅ | ✅ |
| `game.view_all` | — | ✅ | ✅ |
| `game.force_end` | — | ✅ | ✅ |
| `role.assign` | — | — | ✅ |
| `user.ban` | — | — | ✅ |
| `game.refund` | — | — | ✅ |

Rationale: **moderator** = moderation + read-only visibility; **admin** =
everything, including the money-sensitive (`refund`) and privilege-changing
(`role.assign`, `user.ban`) operations.

## Single source of truth — `convex/lib/access.ts`

All of the above — roles, permissions, the role→permission map, helpers, and the
route policy — live in **one new file**, `convex/lib/access.ts`.

**Why `convex/` and not `src/`:** the Convex server is the authoritative gate and
must run this logic, and the import boundary is one-way — `src/` imports from
`convex/` via the `@convex/*` alias (see `tsconfig.json`), but `convex/` never
imports from `src/`. Putting the source of truth in `convex/lib/` lets **both**
runtimes share the exact same definitions: Convex functions import it directly,
and the Next.js layer imports it via `@convex/lib/access`.

The module exports:

- **Roles:** `ACCESS_ROLES`, `AccessRole`, `DEFAULT_ACCESS_ROLE`,
  `accessRoleValidator` (a `v.union` of the role literals, for the schema),
  `normalizeRole(role)`.
- **Permissions:** `PERMISSIONS`, `Permission`.
- **Mapping:** `ROLE_PERMISSIONS: Record<AccessRole, readonly Permission[]>`,
  `getPermissionsForRole(role)`, `roleHasPermission(role, permission)`.
- **Route policy:** `PUBLIC_PATH_PREFIXES`, `PROTECTED_ROUTE_RULES`,
  `isPublicPath(pathname)`, `requiredPermissionForPath(pathname)`.

Style follows the existing constants modules (`convex/lib/constants.ts`,
`src/lib/constants/game.ts`): `as const`, union literals, `Record<…>` maps.

## Backend enforcement (authoritative)

The **only** real security boundary. Extends the existing helpers in
`convex/lib/auth.ts`, reusing the established pattern
(`getAuthenticatedUser` → `getAuthenticatedAccountId` → profile lookup; errors as
`ConvexError({ code, message })`).

```ts
// convex/lib/auth.ts (additions)

/** Full authenticated profile (throws NOT_AUTHENTICATED / PROFILE_SYNC_REQUIRED). */
export async function getAuthenticatedProfile(ctx): Promise<Doc<"profiles">> { … }

/** Authoritative permission gate. Throws FORBIDDEN if the role lacks `permission`. */
export async function requirePermission(ctx, permission: Permission): Promise<Doc<"profiles">> {
  const profile = await getAuthenticatedProfile(ctx);
  if (!roleHasPermission(profile.role, permission)) {
    throw new ConvexError({ code: "FORBIDDEN", message: "…" });
  }
  return profile;
}
```

`getAuthenticatedUser` is refactored to delegate to `getAuthenticatedProfile` so
existing call sites are unchanged. Every admin mutation/query **starts** with
`requirePermission(...)`, mirroring how game mutations start with `assertIsHost(...)`
(`convex/lib/games.ts`).

```ts
// convex/admin/users.ts
export const assignRole = mutation({
  args: { targetProfileId: v.id("profiles"), role: accessRoleValidator },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, PERMISSIONS.ROLE_ASSIGN);
    await ctx.db.patch(args.targetProfileId, { role: args.role });
    await writeAudit(ctx, actor._id, "role.assign", args.targetProfileId, { role: args.role });
  },
});
```

**DO** authorize at the very top of every admin function.
**DON'T** rely on the UI hiding a button — the function is the gate.

### Admin functions — `convex/admin/` (new folder)

- `convex/admin/users.ts` — `listUsers` (`USER_VIEW`), `assignRole` (`ROLE_ASSIGN`),
  `setBanned` (`USER_BAN`).
- `convex/admin/games.ts` — `forceEndGame` (`GAME_FORCE_END`); `refundGame` is an
  **`action`** (it calls the external PHP refund endpoint per
  [payments-php-contract.ka.md](./payments-php-contract.ka.md)). An action can't read
  the DB directly, so it authorizes via a permission-checking query/helper, then calls
  PHP with `adminAccountId` for audit (`GAME_REFUND`).

### Audit log — `convex/tables/adminAuditLog.ts` (new table)

Every admin mutation/action records who did what:
`{ actorProfileId, action, targetId?, metadata?, createdAt }`, registered in
`convex/schema.ts`. The payments contract already anticipates this (refunds carry
`adminAccountId`).

## Route protection — layered, not edge-role-gated

Three layers, only the last is authoritative:

| Layer | File | Gate | Authoritative? |
|---|---|---|---|
| Middleware (edge) | `src/middleware.ts`, `src/middlewares/*` | authenticated vs. public | no |
| `/admin` layout | `src/app/admin/layout.tsx` | redirect if missing `admin_panel.access` | no (UX) |
| Convex functions | `convex/admin/*`, `requirePermission` | per-permission | **yes** |

**Role is deliberately NOT placed in the JWT.** The JWT is minted by the Next.js
bridge (`src/app/api/auth/bridge/route.ts`) and is relatively long-lived; baking
role into it would mean a promotion/demotion doesn't take effect until the token
refreshes. Reading the role from Convex at request time (cheap and reactive here)
avoids that staleness. The trade-off — a non-admin can momentarily load the
`/admin` shell before the layout redirects — is acceptable because **no privileged
data loads**: every admin query/mutation enforces `requirePermission`.

**Middleware** stays as-is (the existing chain
`publicPageMiddleware → jwtCookieMiddleware → bridgeRedirectMiddleware` already
gates `/admin` as authenticated-only). The only change: `src/middlewares/constants.ts`
re-exports `PUBLIC_PATH_PREFIXES` / `AUTH_ERROR_PATH` from `@convex/lib/access`, so the
route policy lives in one place and never drifts.

## Frontend usage

### `useAccess()` hook — `src/hooks/auth/useAccess.ts` (new)

Built on the existing profile query, derives permissions via the shared map:

```ts
export function useAccess() {
  const profile = useQuery(api.auth.profiles.currentProfile);
  const isLoading = profile === undefined;
  const role = normalizeRole(profile?.role ?? null);
  return {
    isLoading,
    role,
    permissions: getPermissionsForRole(role),
    can: (p: Permission) => roleHasPermission(role, p),
  };
}
```

Export through a `src/hooks/auth/index.ts` barrel and add `export * from "./auth"`
to `src/hooks/index.ts`.

### `PermissionGuard` — `src/components/auth/PermissionGuard.tsx` (new)

Client guard used by the `/admin` layout: loading → `LoadingSpinner`; missing
permission → `router.replace`; else render children. **UX only, not security.**

### Conditional rendering

Mirror the existing `isHost` pattern (`gameRoomContext.tsx`) but with `can()`:

```tsx
const { can } = useAccess();
{can(PERMISSIONS.GAME_REFUND) && <RefundButton />}
```

### Pages & components

- `src/app/admin/` (new): `layout.tsx` (wraps children in
  `<PermissionGuard permission={ADMIN_PANEL_ACCESS}>`), `page.tsx` (dashboard),
  `users/page.tsx`, `games/page.tsx`.
- `src/components/admin/` (new): `UserTable`, `RoleSelect`, `AuditLogList`, etc.,
  following the feature-folder convention ([ADR-007](./decisions.md)).

## Internationalization

The app uses **next-intl**. Admin UI strings go under a new top-level **`admin`**
namespace in **both** `messages/en.json` and `messages/ka.json` (Georgian), consumed
via `useTranslations("admin")`. Do not hard-code user-facing strings.

## Schema

`convex/tables/profiles.ts`:

- `role` is tightened from `v.optional(v.string())` to
  `v.optional(accessRoleValidator)`. Absence ⇒ `user` (handled in code via
  `DEFAULT_ACCESS_ROLE`), so a normal user stores no role value.
- Add Convex-owned `bannedAt?: v.number()` and `banReason?: v.string()` (not synced
  from PHP).

Tightening the validator requires the existing stale string values to be cleared
first — see Follow-ups.

## Bootstrapping the first admin

Everyone defaults to `user`, and only an admin can assign roles — a chicken/egg.
Seed the first admin **manually via the Convex dashboard**: open the `profiles`
table, find your row, set `role: "admin"`. No code path needed.

## File / folder placement map

| Path | New? | Purpose |
|---|---|---|
| `convex/lib/access.ts` | new | Source of truth: roles, permissions, map, route policy |
| `convex/lib/auth.ts` | edit | `getAuthenticatedProfile`, `requirePermission`, `requireRole` |
| `convex/admin/users.ts`, `convex/admin/games.ts` | new folder | Admin mutations/queries/actions |
| `convex/tables/adminAuditLog.ts` | new | Audit table (register in `convex/schema.ts`) |
| `convex/tables/profiles.ts` | edit | Typed `role`, `bannedAt`, `banReason` |
| `convex/migrations.ts` | new | One-time clear of stale `role` strings |
| `src/middlewares/constants.ts` | edit | Re-export route policy from `@convex/lib/access` |
| `src/hooks/auth/useAccess.ts` (+ `index.ts`) | new | `useAccess()` |
| `src/components/auth/PermissionGuard.tsx` | new | Client guard |
| `src/components/admin/*` | new folder | Admin UI components |
| `src/app/admin/*` | new folder | `/admin` route, layout, sections |
| `messages/en.json`, `messages/ka.json` | edit | `admin` i18n namespace |

## Follow-ups (not blocking)

- **Schema tightening migration.** Sequence: (1) deploy a `clearLegacyRoles`
  `internalMutation` in `convex/migrations.ts` while `role` is still
  `v.optional(v.string())`; (2) `npx convex run migrations:clearLegacyRoles`;
  (3) flip the schema to `v.optional(accessRoleValidator)` and deploy. Out-of-order
  pushes fail because Convex validates existing docs against the new schema.
- **Ban enforcement.** Decide where a banned user is blocked — preferred:
  `getAuthenticatedProfile` rejects when `bannedAt` is set, so every authenticated
  call is covered in one place.

## Verification (when implemented)

1. `npx tsc --noEmit` is clean.
2. Manual `/admin` access:
   - admin → sees the panel;
   - authenticated non-admin → redirected away by the layout;
   - unauthenticated → bounced to PHP login by existing middleware.
3. Authoritative check: call an admin mutation (e.g. `assignRole`) as a non-admin →
   rejected with `FORBIDDEN`, even if the UI is bypassed.
4. Audit: each successful admin action writes an `adminAuditLog` row.
