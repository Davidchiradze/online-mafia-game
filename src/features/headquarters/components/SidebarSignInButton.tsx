"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { loginStartUrl } from "@/features/auth/lib/phpLogin";

type SidebarSignInButtonProps = {
  expanded: boolean;
};

export default function SidebarSignInButton({
  expanded,
}: SidebarSignInButtonProps) {
  const pathname = usePathname();
  const t = useTranslations("auth");

  return (
    <a
      href={loginStartUrl(pathname)}
      className="group relative flex h-11 w-full items-center rounded-lg px-[10px] text-gray-400 transition-all duration-300 ease-in-out hover:bg-red-500/10 hover:text-red-400"
    >
      <LogIn className="h-5 w-5 shrink-0 transition-colors group-hover:text-red-500" />
      <span
        className={cn(
          "ml-0 max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-300 ease-in-out",
          expanded && "ml-3 max-w-[100px] opacity-100",
        )}
      >
        {t("signInOnSite")}
      </span>
    </a>
  );
}
