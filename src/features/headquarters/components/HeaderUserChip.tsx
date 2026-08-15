"use client";

import { Coins } from "lucide-react";
import UserAvatar from "@/shared/ui/UserAvatar";
import type { ViewerProfile } from "@/features/auth/hooks/useViewer";

type HeaderUserChipProps = {
  profile: ViewerProfile;
};

export default function HeaderUserChip({ profile }: HeaderUserChipProps) {
  return (
    <div className="flex cursor-default items-center gap-3 rounded-lg border border-white/10 bg-white/10 px-4 py-2 transition hover:border-white/20">
      <div className="relative">
        <UserAvatar src={profile.avatar} name={profile.nickname} size={30} />
        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a12] bg-green-500" />
      </div>

      <div>
        <div className="text-sm font-semibold leading-tight text-white">
          {profile.nickname}
        </div>
        <div className="mt-0.5 flex items-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-yellow-500/5 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(251,191,36,0.12)]">
            <Coins
              className="size-3 shrink-0 text-amber-400"
              strokeWidth={2.25}
              aria-hidden
            />
            <span className="text-[11px] font-semibold tabular-nums leading-none text-amber-100">
              {profile.amount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
