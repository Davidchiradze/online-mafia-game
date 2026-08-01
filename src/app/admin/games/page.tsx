"use client";

import { useTranslations } from "next-intl";
import GamesTable from "@/features/admin/components/GamesTable";

export default function AdminGamesPage() {
  const t = useTranslations("admin");
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{t("games.title")}</h1>
      <GamesTable />
    </div>
  );
}
