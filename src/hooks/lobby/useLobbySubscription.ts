"use client";

import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { GameRoom, DbGamePlayer } from "@/types/game/type";
import { Tables } from "@/db/supabase/database.types";

type GameRow = Tables<"games">;

/**
 * Hook to subscribe to real-time updates for the lobby:
 * - games table: INSERT, UPDATE, DELETE
 * - game_players table: INSERT, DELETE (triggers refetch of player names)
 */
export function useLobbySubscription(
    sessions: GameRoom[],
    setSessions: React.Dispatch<React.SetStateAction<GameRoom[]>>
) {

    const handleGameInsert = useCallback(
        (payload: { new: GameRow }) => {
            const newGame = payload.new;
            const gameRoom: GameRoom = {
                id: newGame.id,
                name: newGame.name,
                host_id: newGame.host_id!,
                game_type: newGame.game_type as GameRoom["game_type"],
                game_status: newGame.game_status as GameRoom["game_status"],
                max_players: newGame.max_players,
                players: [],
                created_at: newGame.created_at!,
                updated_at: newGame.updated_at!,
            };
            setSessions((prev) => {
                // Avoid duplicates
                if (prev.some((s) => s.id === gameRoom.id)) return prev;
                return [gameRoom, ...prev];
            });
        },
        [setSessions]
    );

    const handleGameUpdate = useCallback(
        (payload: { new: GameRow }) => {
            const updated = payload.new;
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === updated.id
                        ? {
                            ...s,
                            name: updated.name,
                            host_id: updated.host_id!,
                            game_type: updated.game_type as GameRoom["game_type"],
                            game_status: updated.game_status as GameRoom["game_status"],
                            max_players: updated.max_players,
                            updated_at: updated.updated_at!,
                        }
                        : s
                )
            );
        },
        [setSessions]
    );

    const handleGameDelete = useCallback(
        (payload: { old: { id: string } }) => {
            const deletedId = payload.old.id;
            setSessions((prev) => prev.filter((s) => s.id !== deletedId));
        },
        [setSessions]
    );

    const handlePlayerInsert = useCallback(
        (player: DbGamePlayer) => {
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === player.game_id
                        ? {
                            ...s,
                            players: [...s.players, player],
                        }
                        : s
                )
            );
        },
        [setSessions]
    );

    const handlePlayerDelete = useCallback(
        (playerId: string) => {
            setSessions((prev) =>
                prev.map((s) => ({
                    ...s,
                    players: s.players.filter((p) => p.id !== playerId),
                }))
            );
        },
        [setSessions]
    );

    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel("lobby_realtime")
            // Subscribe to games table changes
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "games",
                },
                (payload) => {
                    handleGameInsert({ new: payload.new as unknown as GameRow });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "games",
                },
                (payload) => {
                    handleGameUpdate({ new: payload.new as unknown as GameRow });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "games",
                },
                (payload) => {
                    const oldGame = payload.old as { id?: string };
                    if (oldGame.id) {
                        handleGameDelete({ old: { id: oldGame.id } });
                    }
                }
            )
            // Subscribe to game_players table changes
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "game_players",
                },
                (payload) => {
                    const newPlayer = payload.new as DbGamePlayer;
                    if (newPlayer.game_id) {
                        handlePlayerInsert(newPlayer);
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "game_players",
                },
                (payload) => {
                    const oldPlayer = payload.old as { id?: string };
                    if (oldPlayer.id) {
                        handlePlayerDelete(oldPlayer.id);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [handleGameInsert, handleGameUpdate, handleGameDelete, handlePlayerInsert, handlePlayerDelete]);
}

