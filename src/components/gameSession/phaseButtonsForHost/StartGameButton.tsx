"use client";

import React, { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import PhaseButton from "@/shared/ui/PhaseButton";
import PhaseTitle from "@/shared/ui/PhaseTitle";
import StartGameModal from "./StartGameModal";

const CONTAINER_CLASS = "flex flex-col items-center gap-3 w-44";
const LABEL_CLASS = "font-orbitron text-xs font-bold tracking-wider";

/**
 * Button to start the game session.
 * Shows ready count while not everyone is ready.
 * Shows title + "Start" button once every player currently in the lobby
 * (excluding the host) has marked themselves ready.
 *
 * Ready state is read from the reactive `players` query (gamePlayers.isReady),
 * not from LiveKit metadata.
 */
const StartGameButton = () => {
  const t = useTranslations("game.host");
  const { gameId, players, hostUserId, maxPlayers, ruleset } = useGameRoom();
  const startGameMutation = useMutation(gameSessions.startGame);

  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const { readyCount, totalPlayers, allReady } = useMemo(() => {
    const lobbyPlayers = players.filter((p) => p.playerId !== hostUserId);
    // const total = maxPlayers || lobbyPlayers.length;

    const total = lobbyPlayers.length;
    const ready = lobbyPlayers.filter((p) => p.isReady).length;
    return {
      readyCount: ready,
      totalPlayers: total,
      allReady: total > 0 && ready === total,
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
      setModalOpen(false);
    } catch (error) {
      console.error("Failed to start game:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (allReady) {
    return (
      <div className={CONTAINER_CLASS}>
        <PhaseTitle title={t("readyToPlay")} />
        <span className={`${LABEL_CLASS} text-emerald-400`}>
          {t("allPlayersReady", { count: totalPlayers })}
        </span>
        <PhaseButton
          onClick={() =>
            ruleset.hasSelfJustification
              ? setModalOpen(true)
              : handleConfirmStart(true)
          }
          isLoading={isLoading}
          label={t("start")}
          variant="success"
        />
        {ruleset.hasSelfJustification && (
          <StartGameModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onConfirm={handleConfirmStart}
            isLoading={isLoading}
          />
        )}
      </div>
    );
  }

  const progress = totalPlayers > 0 ? (readyCount / totalPlayers) * 100 : 0;

  return (
    <div className={CONTAINER_CLASS}>
      <PhaseTitle
        title={totalPlayers > 0 ? t("waitingForPlayers") : t("waitingToJoin")}
      />

      {totalPlayers > 0 ? (
        <div className="w-full flex flex-col items-center gap-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={`${LABEL_CLASS} text-white/70`}>
            <span className="text-emerald-400">{readyCount}</span>
            <span className="text-white/40"> / {totalPlayers} </span>
            {t("readyLabel")}
          </span>
        </div>
      ) : (
        <span className={`${LABEL_CLASS} text-white/40`}>
          {t("noPlayersYet")}
        </span>
      )}
    </div>
  );
};

export default StartGameButton;
