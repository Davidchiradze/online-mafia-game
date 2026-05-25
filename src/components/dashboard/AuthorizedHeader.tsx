"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Menu } from "lucide-react";

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

      <div className="flex cursor-default items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md transition-all hover:border-white/20">
        <div className="relative">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-red-600 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile?.avatar}
              alt={profile?.nickname}
              className="h-4 w-4 text-white"
            />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a12] bg-green-500" />
        </div>

        <div>
          <div className="text-sm font-semibold leading-tight text-white">
            {profile?.nickname}
          </div>
          <div className="text-xs leading-tight text-gray-400">ELO: 1000</div>
        </div>
      </div>
    </header>
  );
}
