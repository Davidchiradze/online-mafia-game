"use client";

import { useTranslations } from "next-intl";
import { normalizeRole } from "@convex/lib/access";

/** Small pill flagging admins/moderators. Neutral for regular users (null). */
export function StaffBadge({ role }: { role: string | undefined }) {
  const t = useTranslations("communityChat");
  const normalized = normalizeRole(role);

  if (normalized === "admin") {
    return (
      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30">
        {t("badgeAdmin")}
      </span>
    );
  }
  if (normalized === "moderator") {
    return (
      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30">
        {t("badgeMod")}
      </span>
    );
  }
  return null;
}
