import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Append an entry to the admin audit log. Call from every privileged
 * mutation/action in convex/admin/** after the action succeeds.
 */
export async function writeAudit(
  ctx: MutationCtx,
  actorProfileId: Id<"profiles">,
  action: string,
  targetId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await ctx.db.insert("adminAuditLog", {
    actorProfileId,
    action,
    targetId,
    metadata,
    createdAt: Date.now(),
  });
}
