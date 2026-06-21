"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAccess } from "@/hooks/auth/useAccess";
import { PERMISSIONS } from "@convex/lib/access";

export default function AdminDashboardPage() {
  const t = useTranslations("admin");
  const { can, role } = useAccess();

  const cards = [
    {
      href: "/admin/users",
      title: t("nav.users"),
      desc: t("dashboard.usersDesc"),
      show: can(PERMISSIONS.USER_VIEW),
    },
    {
      href: "/admin/games",
      title: t("nav.games"),
      desc: t("dashboard.gamesDesc"),
      show: can(PERMISSIONS.GAME_VIEW_ALL),
    },
    {
      href: "/admin/archive",
      title: t("nav.archive"),
      desc: t("dashboard.archiveDesc"),
      show: can(PERMISSIONS.GAME_VIEW_ALL),
    },
  ].filter((c) => c.show);

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("dashboard.heading")}</h1>
      <p className="mt-1 text-sm text-gray-400">
        {t("dashboard.signedInAs", { role: t(`roles.${role}`) })}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
          >
            <h2 className="text-lg font-medium">{c.title}</h2>
            <p className="mt-1 text-sm text-gray-400">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
