"use client";
import { useTranslations } from "next-intl";

export function useRoleLabel() {
  const t = useTranslations("game");
  return (role: string) =>
    t.has(`roles.${role}`)
      ? t(`roles.${role}` as Parameters<typeof t>[0])
      : role
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
}
