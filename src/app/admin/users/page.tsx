"use client";

import { useTranslations } from "next-intl";
import UsersTable from "@/components/admin/UsersTable";

export default function AdminUsersPage() {
  const t = useTranslations("admin");
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{t("users.title")}</h1>
      <UsersTable />
    </div>
  );
}
