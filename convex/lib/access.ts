import { v } from "convex/values";

/* ============================================================================
 * ACCESS CONTROL — SINGLE SOURCE OF TRUTH
 *
 * Roles, permissions, role→permission mapping, and route policy all live here.
 * See docs/authorization.md.
 *
 * Why this file is in `convex/`:
 *   - The Convex server is the AUTHORITATIVE authorization layer and must run
 *     this logic (`requirePermission` in convex/lib/auth.ts).
 *   - Convex can only import from `convex/` + node_modules, never from `src/`.
 *   - The Next.js web layer (middleware, layouts, hooks, UI) CAN import this
 *     via the `@convex/lib/access` alias — so both sides share ONE definition.
 *
 * These ACCESS roles are unrelated to:
 *   - PHP `accounts.role` (billing/account type — never synced into Convex), and
 *   - in-game roles like DON/MAFIA/DOCTOR (see convex/lib/roles.ts).
 * ========================================================================== */

/* ----------------------------------------------------------------------------
 * Roles
 * -------------------------------------------------------------------------- */

export const ACCESS_ROLES = ["user", "moderator", "admin"] as const;
export type AccessRole = (typeof ACCESS_ROLES)[number];

/** Role assumed when a profile has no explicit `role` (the common case). */
export const DEFAULT_ACCESS_ROLE: AccessRole = "user";

/** Validator for `profiles.role` / role mutation args. */
export const accessRoleValidator = v.union(
  v.literal("user"),
  v.literal("moderator"),
  v.literal("admin"),
);

/** Coerce any stored/unknown value into a valid AccessRole. */
export function normalizeRole(role: string | null | undefined): AccessRole {
  return (ACCESS_ROLES as readonly string[]).includes(role ?? "")
    ? (role as AccessRole)
    : DEFAULT_ACCESS_ROLE;
}

/* ----------------------------------------------------------------------------
 * Permissions (capabilities)
 *
 * Check PERMISSIONS, not roles, at call sites — so adding a future role is a
 * one-line change to ROLE_PERMISSIONS below and nothing else moves.
 * -------------------------------------------------------------------------- */

export const PERMISSIONS = {
  /** May open the /admin panel at all. */
  ADMIN_PANEL_ACCESS: "admin_panel.access",
  /** View any user's profile/details. */
  USER_VIEW: "user.view",
  /** Ban / suspend a user. */
  USER_BAN: "user.ban",
  /** Assign access roles to users. */
  ROLE_ASSIGN: "role.assign",
  /** View any game (bypass in-game visibility rules). */
  GAME_VIEW_ALL: "game.view_all",
  /** Force-end / cancel a game. */
  GAME_FORCE_END: "game.force_end",
  /** Issue a balance refund (calls the PHP refund endpoint). */
  GAME_REFUND: "game.refund",
  /** Delete any message in the community chat (soft-delete). */
  CHAT_MESSAGE_DELETE: "chat.message_delete",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

/* ----------------------------------------------------------------------------
 * Role → permissions
 * -------------------------------------------------------------------------- */

export const ROLE_PERMISSIONS: Record<AccessRole, readonly Permission[]> = {
  user: [],
  moderator: [
    PERMISSIONS.ADMIN_PANEL_ACCESS,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.GAME_VIEW_ALL,
    PERMISSIONS.GAME_FORCE_END,
    PERMISSIONS.CHAT_MESSAGE_DELETE,
  ],
  admin: ALL_PERMISSIONS, // full access
};

export function getPermissionsForRole(
  role: string | null | undefined,
): readonly Permission[] {
  return ROLE_PERMISSIONS[normalizeRole(role)];
}

export function roleHasPermission(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  return getPermissionsForRole(role).includes(permission);
}

/* ----------------------------------------------------------------------------
 * Route policy
 *
 * Public    = no authentication required.
 * Protected = authenticated AND holds the required permission.
 * Everything not listed as public is private (authenticated) by default.
 * -------------------------------------------------------------------------- */

/** Shown when an authenticated user is missing a required permission. */
export const AUTH_ERROR_PATH = "/auth/required";

export const PUBLIC_PATH_PREFIXES = [
  "/api/auth/",
  "/api/livekit/webhook",
  "/api/time",
  "/.well-known/",
  "/_next/",
  "/favicon.ico",
  AUTH_ERROR_PATH,
] as const;

/** Routes that require a permission beyond just being authenticated. */
export const PROTECTED_ROUTE_RULES: ReadonlyArray<{
  prefix: string;
  permission: Permission;
}> = [{ prefix: "/admin", permission: PERMISSIONS.ADMIN_PANEL_ACCESS }];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * The permission required to access `pathname`, or `null` if the route only
 * needs authentication. (The edge can't evaluate this — role lives in Convex —
 * so it's consumed by the /admin layout and enforced authoritatively by the
 * Convex functions the page calls.)
 */
export function requiredPermissionForPath(pathname: string): Permission | null {
  const rule = PROTECTED_ROUTE_RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  return rule ? rule.permission : null;
}
