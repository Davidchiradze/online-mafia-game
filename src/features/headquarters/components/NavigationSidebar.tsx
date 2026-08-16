"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crosshair, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { useViewer } from "@/features/auth/hooks/useViewer";
import SidebarSignInButton from "@/features/headquarters/components/SidebarSignInButton";
import {
  NAVIGATION_SIDEBAR_ITEMS,
  type NavigationSidebarItem,
} from "@/shared/lib/constants/navigationSidebarItems";

type NavigationSidebarProps = {
  expanded: boolean;
  onSignOut: () => void;
};

function NavItem({
  item,
  isActive,
  expanded,
}: {
  item: NavigationSidebarItem;
  isActive: boolean;
  expanded: boolean;
}) {
  const Icon = item.icon;
  const t = useTranslations("nav");

  const className = cn(
    "group relative mx-3 flex h-11 items-center rounded-lg px-[14px] transition-all duration-300 ease-in-out",
    isActive
      ? "bg-red-900/20 text-white shadow-[inset_0_0_20px_rgba(220,38,38,0.1)]"
      : "text-gray-400 hover:bg-white/5 hover:text-white",
  );

  const content = (
    <>
      {isActive ? (
        <div className="absolute bottom-0 left-0 top-0 w-1 rounded-r-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
      ) : null}

      <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-red-600/0 via-red-600/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-colors",
          isActive ? "text-red-500" : "group-hover:text-gray-200",
        )}
      />

      <span
        className={cn(
          "ml-0 max-w-0 flex-1 overflow-hidden whitespace-nowrap font-medium opacity-0 transition-all duration-300 ease-in-out",
          expanded && "ml-3 max-w-[200px] opacity-100",
        )}
      >
        {t(item.labelKey)}
      </span>
    </>
  );

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  );
}

export default function NavigationSidebar({
  expanded,
  onSignOut,
}: NavigationSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { isGuest } = useViewer();
  const items = isGuest
    ? NAVIGATION_SIDEBAR_ITEMS.filter((item) => item.guestVisible)
    : NAVIGATION_SIDEBAR_ITEMS;

  return (
    <>
      <div className="flex h-[72px] w-full shrink-0 items-center overflow-hidden p-4">
        <Link href="/lobby" className="group flex w-full items-center">
          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-900 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all group-hover:shadow-[0_0_30px_rgba(220,38,38,0.6)]">
            <Crosshair className="h-6 w-6 text-white" />
          </div>

          <span
            className={cn(
              "ml-0 max-w-0 overflow-hidden whitespace-nowrap text-[1.2rem] font-bold uppercase tracking-[0.2em] text-white opacity-0 transition-all duration-300 ease-in-out",
              expanded && "ml-3 max-w-[110px] opacity-100",
            )}
          >
            Mafia
          </span>
        </Link>
      </div>

      <div className="custom-scrollbar flex w-full flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto py-6">
        {items.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            expanded={expanded}
            isActive={pathname === item.href}
          />
        ))}
      </div>

      <div className="w-full shrink-0 overflow-hidden border-t border-white/5 p-4">
        {isGuest ? (
          <SidebarSignInButton expanded={expanded} />
        ) : (
          <button
            type="button"
            onClick={onSignOut}
            className="group relative flex h-11 w-full items-center rounded-lg px-[10px] text-gray-400 transition-all duration-300 ease-in-out hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-5 w-5 shrink-0 transition-colors group-hover:text-red-500" />
            <span
              className={cn(
                "ml-0 max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-300 ease-in-out",
                expanded && "ml-3 max-w-[100px] opacity-100",
              )}
            >
              {t("logout")}
            </span>
          </button>
        )}
      </div>
    </>
  );
}
