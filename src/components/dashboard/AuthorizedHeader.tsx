"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Coins, Menu } from "lucide-react";
import UserAvatar from "../ui/UserAvatar";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";

type AuthorizedHeaderProps = {
  onOpenMobileMenu: () => void;
};

export default function AuthorizedHeader({
  onOpenMobileMenu,
}: AuthorizedHeaderProps) {
  const profile = useQuery(api.auth.profiles.currentProfile);
  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/5 bg-black/10 px-4 backdrop-blur-md transition-colors sm:px-6 lg:px-8">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="-ml-2 rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <div className="flex cursor-default items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md transition hover:border-white/20">
        <div className="relative">
          {/* <div className="h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-red-600 shadow-lg"> */}
          <UserAvatar
            src={profile?.avatar}
            name={profile?.nickname}
            size={30}
          />
          {/* </div> */}
          <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a12] bg-green-500" />
        </div>

        <div>
          <div className="text-sm font-semibold leading-tight text-white">
            {profile?.nickname}
          </div>
          <div className="mt-0.5 flex items-center">
            <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-yellow-500/5 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(251,191,36,0.12)]">
              <Coins
                className="size-3 shrink-0 text-amber-400"
                strokeWidth={2.25}
                aria-hidden
              />
              <span className="text-[11px] font-semibold tabular-nums leading-none text-amber-100">
                {profile?.amount}
              </span>
            </div>
          </div>
        </div>
        </div>
      </div>
    </header>
  );
}
