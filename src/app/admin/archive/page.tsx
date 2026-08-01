"use client";

import { useTranslations } from "next-intl";
import ArchiveList from "@/features/admin/components/ArchiveList";

export default function AdminArchivePage() {
  const t = useTranslations("admin");
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">{t("archive.title")}</h1>
      <p className="mb-6 text-sm text-gray-400">{t("archive.subtitle")}</p>
      <ArchiveList />
    </div>
  );
}
