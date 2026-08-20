"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { gameSpectators } from "@convex/refs/game";
import {
  ArrowLeft,
  Check,
  Eye,
  KeyRound,
  Loader2,
  Lock,
  Moon,
  X,
} from "lucide-react";
import { ROOM_PIN } from "@convex/lib/constants";
import type { LucideIcon } from "lucide-react";
import PromptCard, {
  BACK_BUTTON_CLASS,
} from "@/features/game-room/components/room/PromptCard";
import { useErrorMessage } from "@/shared/lib/i18n/errorMessage";
import { useEntitlements } from "@/features/auth/hooks/useEntitlements";
import { useAccess } from "@/features/auth/hooks/useAccess";
import { SUBSCRIPTIONS_PATH } from "@/features/auth/components/SubscriptionGuard";
import { FEATURES } from "@convex/lib/entitlements";
import { PERMISSIONS } from "@convex/lib/access";
import { cn } from "@/shared/lib/cn";
import type { Id } from "@convex/_generated/dataModel";

type GameSummary = {
  _id: Id<"games">;
  name: string;
  hostId: Id<"profiles">;
  gameType: string;
  gameStatus: string;
  maxPlayers: number;
};

type Props = {
  gameId: string;
  game: GameSummary;
  currentSpectatorCount: number;
  isPrivate?: boolean;
};

export default function SpectatorJoinPrompt({ gameId, game, isPrivate }: Props) {
  const t = useTranslations("game.spectatorJoin");
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");

  const joinSpectator = useMutation(gameSpectators.join);
  const getErrorMessage = useErrorMessage();
  const tGate = useTranslations("subscriptions.gate");
  const { isLoading: entLoading, has } = useEntitlements();
  const canSpectate = has(FEATURES.SPECTATE_GAME);
  const { can } = useAccess();
  // Staff (moderators/admins) watch a private game without its PIN — the
  // server authorizes this in `game.spectators.join` via GAME_SPECTATE_ANY.
  const canBypassPrivate = can(PERMISSIONS.GAME_SPECTATE_ANY);

  const needsPin = Boolean(isPrivate) && !canBypassPrivate;
  const canJoin = !isJoining && (!needsPin || ROOM_PIN.PATTERN.test(pin));

  const handleJoinAsSpectator = async () => {
    if (!canJoin) return;
    setIsJoining(true);
    setError(null);
    try {
      const result = await joinSpectator({
        gameId: gameId as Id<"games">,
        pin: needsPin ? pin : undefined,
      });
      if (!result.ok) {
        // A wrong or throttled PIN comes back as a value, not a throw, so the
        // server keeps the attempt it just counted. Same shape as a
        // ConvexError's `.data`, so it translates identically.
        setError(getErrorMessage({ data: { code: result.code } }));
        setPin("");
        setIsJoining(false);
        return;
      }
      setHasJoined(true);
    } catch (err) {
      setError(getErrorMessage(err));
      setIsJoining(false);
    }
  };

  if (hasJoined) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        <p className="font-sans text-sm text-zinc-400">
          {t("connectingAsSpectator")}
        </p>
      </div>
    );
  }

  // Spectating requires an active subscription (or staff). UX gate — the
  // server enforces it in `game.spectators.join`. Skip while the profile loads
  // so subscribed users don't flash the locked state.
  if (!entLoading && !canSpectate) {
    return (
      <PromptCard
        icon={Lock}
        accent="amber"
        title={tGate("lockedTitle")}
        description={tGate("lockedBody")}
      >
        <div className="flex gap-3">
          <button onClick={() => router.push("/lobby")} className={BACK_BUTTON_CLASS}>
            <ArrowLeft className="h-4 w-4" />
            {t("backToLobby")}
          </button>
          <button
            onClick={() => router.push(SUBSCRIPTIONS_PATH)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 py-3 font-sans text-sm font-semibold text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] transition hover:from-amber-500 hover:to-amber-600 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
          >
            {tGate("viewPlans")}
          </button>
        </div>
      </PromptCard>
    );
  }

  const spectatorRules: {
    icon: LucideIcon;
    chip: string;
    textKey:
      | "willWatchDayPhase"
      | "willSeeDiscussions"
      | "nightPhasesHidden"
      | "cannotParticipate";
  }[] = [
    {
      icon: Check,
      chip: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
      textKey: "willWatchDayPhase",
    },
    {
      icon: Check,
      chip: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
      textKey: "willSeeDiscussions",
    },
    {
      icon: Moon,
      chip: "border-amber-500/20 bg-amber-500/10 text-amber-400",
      textKey: "nightPhasesHidden",
    },
    {
      icon: X,
      chip: "border-red-500/20 bg-red-500/10 text-red-400",
      textKey: "cannotParticipate",
    },
  ];

  return (
    <PromptCard
      icon={needsPin ? KeyRound : Eye}
      accent={needsPin ? "amber" : "red"}
      title={needsPin ? t("privatePinTitle") : t("gameInProgress")}
      description={
        needsPin
          ? t("privatePinDesc", { name: game.name })
          : t("gameInProgressDesc", { name: game.name })
      }
    >
      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-left">
          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
          <p className="font-sans text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Spectator rules */}
      <div className="mb-7 space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left">
        <p className="mb-3 font-sans text-xs uppercase tracking-wider text-zinc-500">
          {t("asASpectatorYouWill")}
        </p>
        {spectatorRules.map(({ icon: Icon, chip, textKey }) => (
          <div key={textKey} className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border",
                chip,
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="font-sans text-sm text-zinc-300">{t(textKey)}</span>
          </div>
        ))}
      </div>

      {needsPin && (
        <input
          value={pin}
          onChange={(e) =>
            setPin(e.target.value.replace(/\D/g, "").slice(0, ROOM_PIN.LENGTH))
          }
          onKeyDown={(e) => e.key === "Enter" && handleJoinAsSpectator()}
          placeholder={t("pinPlaceholder")}
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={ROOM_PIN.LENGTH}
          aria-label={t("privatePinTitle")}
          className="mb-6 w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-center font-orbitron text-2xl tracking-[0.6em] text-white placeholder-gray-600 transition focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
        />
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push("/lobby")}
          disabled={isJoining}
          className={BACK_BUTTON_CLASS}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </button>
        <button
          onClick={handleJoinAsSpectator}
          disabled={!canJoin}
          className={cn(
            "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50",
            needsPin
              ? "bg-gradient-to-r from-amber-600 to-amber-700 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:from-amber-500 hover:to-amber-600 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
              : "bg-gradient-to-r from-red-600 to-red-700 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:from-red-500 hover:to-red-600 hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]",
          )}
        >
          {isJoining ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("joining")}
            </>
          ) : (
            <>
              {needsPin ? (
                <KeyRound className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {t("watchGame")}
            </>
          )}
        </button>
      </div>
    </PromptCard>
  );
}
