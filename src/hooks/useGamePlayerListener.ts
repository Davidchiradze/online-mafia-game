// "use client";

// import { useEffect } from "react";
// import { createClient } from "@/lib/supabase/client";
// import type { GameSessionState } from "@/types/game/type";
// import type { Tables } from "@/db/supabase/database.types";

// /**
//  * Hook to subscribe to game_players table changes (UPDATE only for current user)
//  * Updates the player data in game session state for the current user only
//  * Note: Roles are NOT exposed via this listener - they're in game_player_roles table
//  */
// export function useGamePlayerListener(
//   gameId: string,
//   userId: string,
//   setGameSessionState: React.Dispatch<
//     React.SetStateAction<GameSessionState | null>
//   >,
//   enabled: boolean = true
// ) {
//   useEffect(() => {
//     if (!gameId || !userId || !enabled) return;
//     const supabase = createClient();

//     const playerChannel = supabase
//       .channel(`game_players_changes_${gameId}_${userId}`)
//       .on(
//         "postgres_changes",
//         {
//           event: "UPDATE",
//           schema: "public",
//           table: "game_players",
//           filter: `game_id=eq.${gameId} AND player_id=eq.${userId}`,
//         },
//         (payload) => {
//           const updatedPlayerData = payload?.new as Tables<"game_players">;
//           setGameSessionState((prev: GameSessionState | null) => {
//             if (!prev) return prev;
//             // Only update if this is the current user's player data
//             if (updatedPlayerData.player_id === userId) {
//               return { ...prev, playerData: updatedPlayerData };
//             }
//             return prev;
//           });
//         }
//       )
//       .subscribe();

//     return () => {
//       supabase.removeChannel(playerChannel);
//     };
//   }, [enabled, gameId, userId, setGameSessionState]);
// }
