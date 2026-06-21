"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { api } from "@convex/_generated/api";
import { adminUsers } from "@convex/refs/admin";
import type { Id } from "@convex/_generated/dataModel";
import {
  ACCESS_ROLES,
  PERMISSIONS,
  type AccessRole,
} from "@convex/lib/access";
import { useAccess } from "@/hooks/auth/useAccess";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { toast } from "@/lib/utils/toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const PAGE_SIZE = 20;

export default function UsersTable() {
  const t = useTranslations("admin");
  const { can } = useAccess();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounce the search input so we don't re-query on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { results, status, loadMore } = usePaginatedQuery(
    adminUsers.list,
    { search: search || undefined },
    { initialNumItems: PAGE_SIZE },
  );

  const onReachEnd = useCallback(() => {
    if (status === "CanLoadMore") loadMore(PAGE_SIZE);
  }, [status, loadMore]);
  const sentinelRef = useInfiniteScroll(onReachEnd, status === "CanLoadMore");

  const assignRole = useMutation(api.admin.users.assignRole);
  const setBanned = useMutation(api.admin.users.setBanned);
  const canAssignRole = can(PERMISSIONS.ROLE_ASSIGN);
  const canBan = can(PERMISSIONS.USER_BAN);

  const handleRole = async (
    targetProfileId: Id<"profiles">,
    role: AccessRole,
  ) => {
    try {
      await assignRole({ targetProfileId, role });
      toast.success(t("users.roleUpdated"));
    } catch (e) {
      toast.error(errorMessage(e, t("errors.generic")));
    }
  };

  const handleBan = async (
    targetProfileId: Id<"profiles">,
    banned: boolean,
  ) => {
    const reason = banned
      ? window.prompt(t("users.banReasonPrompt")) ?? undefined
      : undefined;
    if (banned && reason === undefined) return; // cancelled
    try {
      await setBanned({ targetProfileId, banned, reason });
      toast.success(banned ? t("users.bannedDone") : t("users.unbannedDone"));
    } catch (e) {
      toast.error(errorMessage(e, t("errors.generic")));
    }
  };

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t("users.search")}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-white/20 focus:outline-none"
        />
      </div>

      {status === "LoadingFirstPage" ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner message={t("loading")} />
        </div>
      ) : results.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          {t("users.noResults")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">{t("users.user")}</th>
                <th className="px-4 py-3 font-medium">{t("users.role")}</th>
                <th className="px-4 py-3 font-medium">{t("users.status")}</th>
                <th className="px-4 py-3 font-medium">{t("users.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((u) => (
                <tr key={u._id} className="border-t border-white/5">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{u.nickname}</div>
                    {u.email && (
                      <div className="text-xs text-gray-500">{u.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canAssignRole ? (
                      <select
                        value={u.role}
                        onChange={(e) =>
                          handleRole(u._id, e.target.value as AccessRole)
                        }
                        className="rounded-md border border-white/10 bg-neutral-900 px-2 py-1 text-sm"
                      >
                        {ACCESS_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t(`roles.${r}`)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>{t(`roles.${u.role}`)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.bannedAt ? (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
                        {t("users.banned")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                        {t("users.active")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canBan && (
                      <button
                        onClick={() => handleBan(u._id, !u.bannedAt)}
                        className="rounded-md border border-white/10 px-3 py-1 text-xs hover:bg-white/10"
                      >
                        {u.bannedAt ? t("users.unban") : t("users.ban")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {status === "LoadingMore" && (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          )}
          <div ref={sentinelRef} className="h-px w-full" />
        </div>
      )}
    </div>
  );
}

function errorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "data" in e) {
    const data = (e as { data?: unknown }).data;
    if (data && typeof data === "object" && "message" in data) {
      return String((data as { message: unknown }).message);
    }
  }
  return e instanceof Error ? e.message : fallback;
}
