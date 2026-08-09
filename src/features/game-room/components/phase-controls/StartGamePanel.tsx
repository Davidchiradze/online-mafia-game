"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";
import StartGameModal from "./StartGameModal";

/**
 * Pre-game, no session: the lobby is filling and the host is waiting to start.
 *
 * Ready state comes from the reactive `players` query (`gamePlayers.isReady`),
 * never from LiveKit metadata. Unlike the button this replaced, the action is
 * always rendered — disabled, with a reason in its tooltip, until everyone is
 * ready — because the panel's action zone is a fixed track and an empty one
 * reads as "there is nothing to do here".
 */
export default function StartGamePanel() {
  const t = useTranslations("game.host");
  const { gameId, players, hostUserId, ruleset } = useGameRoom();
  const startGameMutation = useMutation(gameSessions.startGame);

  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { readyCount, totalPlayers, allReady } = useMemo(() => {
    const lobbyPlayers = players.filter((p) => p.playerId !== hostUserId);
    const ready = lobbyPlayers.filter((p) => p.isReady).length;
    return {
      readyCount: ready,
      totalPlayers: lobbyPlayers.length,
      allReady: lobbyPlayers.length > 0 && ready === lobbyPlayers.length,
    };
  }, [players, hostUserId]);

  const handleConfirmStart = async (withoutSelfJustification: boolean) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await startGameMutation({
        gameId: gameId as Id<"games">,
        withoutSelfJustification,
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to start game:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartClick = () => {
    // Japanese asks the host whether nominated players get a self-justification
    // phase; Sports never has one, so it starts straight away (§ ruleset).
    if (ruleset.hasSelfJustification) {
      setIsModalOpen(true);
      return;
    }
    void handleConfirmStart(true);
  };

  const descriptor: HostPanelDescriptor = {
    eyebrow: t("preGame"),
    title: allReady
      ? t("readyToPlay")
      : totalPlayers > 0
        ? t("waitingForPlayers")
        : t("waitingToJoin"),
    status:
      totalPlayers > 0
        ? t("readyStatus", { ready: readyCount, total: totalPlayers })
        : t("noPlayersYet"),
    progress:
      totalPlayers > 0
        ? { value: readyCount, total: totalPlayers }
        : undefined,
    actions: [
      {
        id: "start-game",
        label: t("start"),
        variant: "success",
        onClick: handleStartClick,
        disabled: !allReady,
        isLoading,
        title: allReady ? undefined : t("waitingForAllReady"),
      },
    ],
  };

  return (
    <>
      <HostPanel descriptor={descriptor} />
      {ruleset.hasSelfJustification && (
        <StartGameModal
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
          }}
          onConfirm={(withoutSelfJustification) => {
            void handleConfirmStart(withoutSelfJustification);
          }}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
