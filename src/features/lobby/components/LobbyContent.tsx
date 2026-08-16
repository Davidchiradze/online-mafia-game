"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { LobbyGameSummary } from "@convex/refs/lobby";
import RoomCard from "@/features/lobby/components/room-card/RoomCard";
import CreateGameModal from "@/features/lobby/components/CreateGameModal";
import { Plus, Search, SearchX } from "lucide-react";
import FeatureBanner from "./FeatureBanner";
import PromoBanner from "./PromoBanner";
import { LobbySubscriptionModal } from "./LobbySubscriptionModal";
import {
  SubscriptionGuard,
  SubscriptionUpsell,
} from "@/features/auth/components/SubscriptionGuard";
import { SignInCta } from "@/features/auth/components/SignInCta";
import { useViewer } from "@/features/auth/hooks/useViewer";
import { FEATURES } from "@convex/lib/entitlements";

export type LobbyGame = LobbyGameSummary;

type Props = {
  games: LobbyGame[];
};

export default function LobbyContent({ games }: Props) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const router = useRouter();
  const viewer = useViewer();
  const t = useTranslations("lobby");
  const tg = useTranslations("game");
  const ta = useTranslations("auth");

  const handleCreated = (gameId: string) => {
    router.push(`/game/${gameId}`);
  };

  const navigateToRoom = (roomId: string) => {
    router.push(`/game/${roomId}`);
  };

  const filtered = useMemo(() => {
    return games.filter((s) => {
      const matchSearch =
        search.trim() === "" ||
        s.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" || s.gameStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [games, search, statusFilter]);

  return (
    <div className="relative z-10 px-4 pb-16 pt-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-[26px]">
        {/* Header: title left · streak + rating top-right */}
        <div className="flex flex-wrap items-end justify-between gap-7">
          <div className="min-w-[260px]">
            <h1
              className="mb-2 bg-gradient-to-r from-white via-red-100 to-white bg-clip-text font-orbitron text-transparent"
              style={{
                fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
                fontWeight: 700,
              }}
            >
              {t("gameLobbyTitle")}
            </h1>
            <p className="max-w-[46ch] font-sans text-[0.94rem] text-gray-500 text-pretty">
              {t("gameLobbySubtitle")}
            </p>
          </div>
        </div>

        {/* Legacy tournament artwork banner — kept for reuse if we swap the YouTube feature out */}
        {/* <PromoBanner
          href="https://www.mafia.ge/ka/tournament/details/15"
          bannerImageUrl="https://www.mafia.ge/templates/newassets/img/tournament-banner.png"
          bannerImageMobileUrl="https://www.mafia.ge/templates/newassets/img/tournament-bannermob.png"
          cupImageUrl="https://www.mafia.ge/templates/newassets/img/cupImage.png"
          eyebrow={t("promoEyebrow")}
          title={t("promoTitle")}
          highlight={t("promoHighlight")}
          status={t("promoStatus")}
        /> */}

        {/* Rooms section head + the single primary action */}
        <div className="flex flex-wrap items-center justify-between gap-5 border-t border-white/[0.08] pt-4">
          <div className="flex items-baseline gap-3">
            <h2 className="font-orbitron text-sm font-bold uppercase tracking-[0.16em] text-gray-200">
              {t("roomsHeading")}
            </h2>
            <span className="font-orbitron text-[0.8rem] font-bold text-gray-500">
              {filtered.length}
            </span>
          </div>

          {viewer.isLoading ? (
            <div className="h-[46px] w-[168px] shrink-0 rounded-[11px] border border-white/5 bg-white/[0.03]" />
          ) : viewer.isGuest ? (
            <SignInCta label={ta("signInToPlay")} />
          ) : (
            <SubscriptionGuard
              feature={FEATURES.PLAY_GAME}
              fallback={
                <SubscriptionUpsell className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-5 py-2.5 font-sans text-sm font-semibold text-amber-300 transition hover:border-amber-500/50 hover:bg-amber-500/[0.14]" />
              }
            >
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex shrink-0 cursor-pointer items-center justify-center gap-2.5 rounded-[11px] bg-gradient-to-r from-red-500 to-red-700 px-6 py-3 font-orbitron text-[0.82rem] font-bold tracking-[0.04em] text-white shadow-[0_0_22px_rgba(220,38,38,0.38),inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:-translate-y-px hover:shadow-[0_0_38px_rgba(220,38,38,0.66),inset_0_1px_0_rgba(255,255,255,0.24)] active:translate-y-0"
              >
                <Plus className="h-4 w-4" strokeWidth={2.6} />
                {t("createRoom")}
              </button>
            </SubscriptionGuard>
          )}
        </div>

        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.14] px-7 py-14 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            style={{
              background:
                "linear-gradient(150deg,rgba(255,120,120,0.035) 0%,rgba(255,255,255,0.02) 50%,rgba(255,255,255,0.01) 100%)",
            }}
          >
            <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-white/10 bg-black/35 shadow-[inset_0_0_18px_rgba(220,38,38,0.12)]">
              <SearchX className="h-6 w-6 text-gray-500" strokeWidth={1.7} />
            </div>
            <div className="font-orbitron text-base font-bold tracking-wide text-gray-200">
              {tg("table.noRoomsFound")}
            </div>
            {/* <p className="max-w-[340px] font-sans text-sm leading-relaxed text-gray-500 text-pretty">
              {t("emptyMessage")}
            </p> */}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),360px))] justify-start gap-5">
            {filtered.map((room) => (
              <RoomCard
                key={room._id}
                room={room}
                onNavigate={navigateToRoom}
              />
            ))}
          </div>
        )}

        {/* Featured YouTube banner */}
        <FeatureBanner
          videoId="y7t8PA8nh38"
          badge={t("featureBadge")}
          source={t("featureSource")}
          title={t("featureTitle")}
          blurb={t("featureBlurb")}
          ctaLabel={t("featureCta")}
        />
      </div>

      <CreateGameModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />

      {viewer.isMember && <LobbySubscriptionModal />}
    </div>
  );
}
