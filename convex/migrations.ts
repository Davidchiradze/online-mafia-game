import { internalMutation } from "./_generated/server";

/**
 * One-time migration: clear legacy `profiles.role` values so the field can be
 * tightened from `v.optional(v.string())` to the typed union
 * (`accessRoleValidator`, user/moderator/admin).
 *
 * `profiles.role` is now Convex-owned and written only through
 * `accessRoleValidator`-validated mutation args, but historical rows may still
 * hold stale free-form strings (e.g. an old PHP-synced value). Absence of
 * `role` is treated as the default ("user") in code, so clearing is safe.
 *
 * Run order to tighten the schema:
 *   1. Deploy with `profiles.role` still `v.optional(v.string())` (current).
 *   2. `npx convex run migrations:clearLegacyRoles`
 *   3. Switch `profiles.role` to `accessRoleValidator` and deploy.
 *
 * Idempotent — safe to run multiple times.
 */
export const clearLegacyRoles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const VALID = new Set(["user", "moderator", "admin"]);
    const profiles = await ctx.db.query("profiles").collect();
    let cleared = 0;
    for (const profile of profiles) {
      if (profile.role !== undefined && !VALID.has(profile.role)) {
        await ctx.db.patch(profile._id, { role: undefined });
        cleared++;
      }
    }
    return { total: profiles.length, cleared };
  },
});
