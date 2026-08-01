"use client";

import { useMemo, useState } from "react";
import { Users, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Id } from "@convex/_generated/dataModel";
import UserAvatar from "@/shared/ui/UserAvatar";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import { StaffBadge } from "./StaffBadge";
import type { OnlineUser } from "./types";

type Props = {
  /** `undefined` while loading. */
  users: OnlineUser[] | undefined;
  count: number;
  myId: Id<"profiles"> | undefined;
  /** When provided, renders a close button (mobile drawer). */
  onClose?: () => void;
};

export function OnlinePanel({ users, count, myId, onClose }: Props) {
  const t = useTranslations("communityChat");
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const list = users ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => u.nickname.toLowerCase().includes(q));
  }, [search, users]);

  return (
    <>
      <div className="shrink-0 px-5 py-4 border-b border-white/5 flex items-center gap-2">
        <Users className="w-4 h-4 text-zinc-400" />
        <span
          className="text-zinc-300 uppercase tracking-[0.15em] text-xs"
          style={{ fontFamily: "Orbitron, sans-serif", fontWeight: 600 }}
        >
          {t("onlineCount", { count })}
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="shrink-0 px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlayers")}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
          />
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 flex flex-col gap-1">
        {users === undefined ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {filteredUsers.map((user) => (
              <div
                key={user.profileId}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <div className="relative">
                  <UserAvatar src={user.avatar} name={user.nickname} size={36} />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a12] bg-green-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-zinc-200 truncate group-hover:text-white">
                      {user.nickname}
                      {user.profileId === myId && (
                        <span className="text-zinc-500 text-xs"> {t("you")}</span>
                      )}
                    </span>
                    <StaffBadge role={user.role} />
                  </div>
                  <div className="text-[11px] text-zinc-500">{t("statusOnline")}</div>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center text-zinc-500 text-sm py-8">
                {t("noPlayers")}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
