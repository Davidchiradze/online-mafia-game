"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Ban, MoreVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PERMISSIONS } from "@convex/lib/access";
import { useAccess } from "@/hooks/auth/useAccess";
import { toast } from "@/shared/lib/utils/toast";

type Props = {
  gameLogId: Id<"gameLogs">;
  /**
   * Whether the game has a decided winner. Only a decided game can be annulled —
   * a no-contest carries no ELO to reverse.
   */
  hasWinner: boolean;
};

/**
 * Kebab (3-dot) actions menu for a row in the admin game archive. Its one action,
 * **Annul game**, converts the game to a no-contest and reverses every player's
 * ELO from it (see `convex/admin/gameLogs.ts` → `annulGame` and
 * /docs/ranking-system.md). Renders nothing unless the viewer holds `GAME_ANNUL`
 * and the game still has a winner — kept out of `ArchiveRow` so that row stays a
 * presentational component.
 *
 * Uses Radix Popover (same primitive as `ParticipantMenuButton`) so the menu is
 * portaled out of the row and can't be clipped; every click is `stopPropagation`'d
 * so it never toggles the row's expand/collapse.
 */
export default function ArchiveRowActions({ gameLogId, hasWinner }: Props) {
  const t = useTranslations("admin");
  const { can } = useAccess();
  const annulGame = useMutation(api.admin.gameLogs.annulGame);
  const [menuOpen, setMenuOpen] = useState(false);
  const [annulling, setAnnulling] = useState(false);

  if (!can(PERMISSIONS.GAME_ANNUL) || !hasWinner) return null;

  const handleAnnul = async () => {
    setMenuOpen(false);
    if (annulling) return;
    if (!window.confirm(t("archive.annulConfirm"))) return;
    setAnnulling(true);
    try {
      await annulGame({ gameLogId });
      toast.success(t("archive.annulDone"));
    } catch (e) {
      toast.error(errorMessage(e, t("errors.generic")));
    } finally {
      setAnnulling(false);
    }
  };

  return (
    <PopoverPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={t("archive.actions")}
          onClick={(e) => e.stopPropagation()}
          className="rounded-full border border-transparent p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200 data-[state=open]:bg-white/10 data-[state=open]:text-white"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          onClick={(e) => e.stopPropagation()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 w-52 overflow-hidden rounded-xl p-1 text-sm text-white animate-in fade-in-0 zoom-in-95"
          style={{
            background:
              "linear-gradient(135deg, rgba(20,20,30,0.97) 0%, rgba(10,10,18,0.97) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          <button
            type="button"
            disabled={annulling}
            onClick={(e) => {
              e.stopPropagation();
              void handleAnnul();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Ban className="h-4 w-4 shrink-0" />
            {t("archive.annul")}
          </button>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
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
