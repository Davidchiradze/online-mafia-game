"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { cardPicking } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import type { GameSessionState } from "@/features/game-room/context/gameRoomContext";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";

type SessionStartedPanelProps = {
  gameSessionState: GameSessionState;
};

/**
 * Pre-game, session open, roles not dealt yet.
 *
 * The action enters the card-picking phase via `cardPicking.start`, which
 * atomically shuffles the deck, inserts the picking session and flips the
 * phase. It is idempotent server-side (a second call returns the existing
 * session id); the 3s mount disable is what stops the host generating a second
 * click while the first round-trip is in flight.
 */
export default function SessionStartedPanel({
  gameSessionState,
}: SessionStartedPanelProps) {
  const t = useTranslations("game.host");
  const tPhases = useTranslations("game.phases");
  const [isLoading, setIsLoading] = useState(false);
  const startCardPicking = useMutation(cardPicking.start);

  const handleStartPickingRoles = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await startCardPicking({
        gameId: gameSessionState.gameId as Id<"games">,
      });
    } catch (error) {
      console.error("Failed to start card picking:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const descriptor: HostPanelDescriptor = {
    eyebrow: t("preGame"),
    title: tPhases("game_session_started"),
    status: t("rolesNotDealt"),
    actions: [
      {
        id: "pick-roles",
        label: t("pickRoles"),
        variant: "primary",
        onClick: () => {
          void handleStartPickingRoles();
        },
        isLoading,
        disableOnMountMs: 3000,
      },
    ],
  };

  return <HostPanel descriptor={descriptor} />;
}
