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
  Loader2,
  Lock,
  Moon,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useErrorMessage } from "@/lib/i18n/errorMessage";
import { useEntitlements } from "@/hooks/auth/useEntitlements";
import { SUBSCRIPTIONS_PATH } from "@/components/auth/SubscriptionGuard";
import { FEATURES } from "@convex/lib/entitlements";
import { cn } from "@/lib/utils";
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

type Accent = "red" | "amber" | "zinc";

const ACCENT_CHIP: Record<Accent, string> = {
  red: "border-red-500/20 bg-red-500/10 text-red-400",
  amber: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  zinc: "border-white/10 bg-white/[0.05] text-zinc-400",
};

/** Shared card shell so the three states stay visually identical. */
function PromptCard({
  icon: Icon,
  accent,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  accent: Accent;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-white/5 bg-[#13131a] p-8 text-center shadow-xl">
        <div
          className={cn(
            "mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border",
            ACCENT_CHIP[accent],
          )}
        >
          <Icon className="h-7 w-7" />
        </div>

        <h2 className="mb-2 font-orbitron text-xl font-bold tracking-tight text-white">
          {title}
        </h2>
        <p className="mb-7 font-sans text-sm leading-relaxed text-zinc-400">
          {description}
        </p>

        {children}
      </div>
    </div>
  );
}

const BACK_BUTTON_CLASS =
  "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 py-3 font-sans text-sm font-medium text-zinc-400 transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

export default function SpectatorJoinPrompt({ gameId, game, isPrivate }: Props) {
  const t = useTranslations("game.spectatorJoin");
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinSpectator = useMutation(gameSpectators.join);
  const getErrorMessage = useErrorMessage();
  const tGate = useTranslations("subscriptions.gate");
  const { isLoading: entLoading, has } = useEntitlements();
  const canSpectate = has(FEATURES.SPECTATE_GAME);

  const handleJoinAsSpectator = async () => {
    if (isJoining) return;
    setIsJoining(true);
    setError(null);
    try {
      await joinSpectator({ gameId: gameId as Id<"games"> });
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
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 py-3 font-sans text-sm font-semibold text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all hover:from-amber-500 hover:to-amber-600 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
          >
            {tGate("viewPlans")}
          </button>
        </div>
      </PromptCard>
    );
  }

  if (isPrivate) {
    return (
      <PromptCard
        icon={Lock}
        accent="zinc"
        title={t("privateGame")}
        description={t("privateGameDesc", { name: game.name })}
      >
        <button
          onClick={() => router.push("/lobby")}
          className={cn(BACK_BUTTON_CLASS, "w-full")}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToLobby")}
        </button>
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
      icon={Eye}
      accent="red"
      title={t("gameInProgress")}
      description={t("gameInProgressDesc", { name: game.name })}
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
          disabled={isJoining}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 py-3 font-sans text-sm font-semibold text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all hover:from-red-500 hover:to-red-600 hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isJoining ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("joining")}
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              {t("watchGame")}
            </>
          )}
        </button>
      </div>
    </PromptCard>
  );
}
