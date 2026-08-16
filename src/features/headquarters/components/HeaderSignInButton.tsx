"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";
import { loginStartUrl } from "@/features/auth/lib/phpLogin";

export default function HeaderSignInButton() {
  const pathname = usePathname();
  const t = useTranslations("auth");

  return (
    <a
      href={loginStartUrl(pathname)}
      className="inline-flex items-center gap-2 rounded-[11px] bg-gradient-to-r from-red-500 to-red-700 px-5 py-2.5 font-orbitron text-[0.78rem] font-bold tracking-[0.04em] text-white shadow-[0_0_22px_rgba(220,38,38,0.38),inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:-translate-y-px hover:shadow-[0_0_38px_rgba(220,38,38,0.66),inset_0_1px_0_rgba(255,255,255,0.24)]"
    >
      <LogIn className="h-4 w-4" strokeWidth={2.4} />
      {t("signInOnSite")}
    </a>
  );
}
