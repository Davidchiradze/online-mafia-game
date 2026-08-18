/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_gameLogs from "../admin/gameLogs.js";
import type * as admin_games from "../admin/games.js";
import type * as admin_stats from "../admin/stats.js";
import type * as admin_users from "../admin/users.js";
import type * as auth_profiles from "../auth/profiles.js";
import type * as community_maintenance from "../community/maintenance.js";
import type * as community_messages from "../community/messages.js";
import type * as community_readState from "../community/readState.js";
import type * as crons from "../crons.js";
import type * as games_core_bestMove from "../games/core/bestMove.js";
import type * as games_core_broadcasts from "../games/core/broadcasts.js";
import type * as games_core_cardPicking from "../games/core/cardPicking.js";
import type * as games_core_dayPhase from "../games/core/dayPhase.js";
import type * as games_core_dayRound from "../games/core/dayRound.js";
import type * as games_core_farewellSpeech from "../games/core/farewellSpeech.js";
import type * as games_core_fouls from "../games/core/fouls.js";
import type * as games_core_gameLogs from "../games/core/gameLogs.js";
import type * as games_core_leaderboard from "../games/core/leaderboard.js";
import type * as games_core_mafiaSuccession from "../games/core/mafiaSuccession.js";
import type * as games_core_nightPhase from "../games/core/nightPhase.js";
import type * as games_core_phaseTransitions from "../games/core/phaseTransitions.js";
import type * as games_core_players from "../games/core/players.js";
import type * as games_core_roles from "../games/core/roles.js";
import type * as games_core_sessions from "../games/core/sessions.js";
import type * as games_core_speakingOrder from "../games/core/speakingOrder.js";
import type * as games_core_spectators from "../games/core/spectators.js";
import type * as games_core_types from "../games/core/types.js";
import type * as games_core_voting from "../games/core/voting.js";
import type * as games_core_webhookHandler from "../games/core/webhookHandler.js";
import type * as games_core_winConditions from "../games/core/winConditions.js";
import type * as games_japanese_definition from "../games/japanese/definition.js";
import type * as games_japanese_nightModel from "../games/japanese/nightModel.js";
import type * as games_japanese_phases from "../games/japanese/phases.js";
import type * as games_japanese_winConditions from "../games/japanese/winConditions.js";
import type * as games_registry from "../games/registry.js";
import type * as games_sports_bestMove from "../games/sports/bestMove.js";
import type * as games_sports_definition from "../games/sports/definition.js";
import type * as games_sports_nightModel from "../games/sports/nightModel.js";
import type * as games_sports_nightPhase from "../games/sports/nightPhase.js";
import type * as games_sports_phases from "../games/sports/phases.js";
import type * as games_sports_roles from "../games/sports/roles.js";
import type * as games_sports_winConditions from "../games/sports/winConditions.js";
import type * as http from "../http.js";
import type * as integrations_playerStats from "../integrations/playerStats.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_admin from "../lib/admin.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_entitlements from "../lib/entitlements.js";
import type * as lib_games from "../lib/games.js";
import type * as lib_nightSessions from "../lib/nightSessions.js";
import type * as lib_playerRatings from "../lib/playerRatings.js";
import type * as lib_playerStats from "../lib/playerStats.js";
import type * as lib_profiles from "../lib/profiles.js";
import type * as lib_publicApi from "../lib/publicApi.js";
import type * as lib_ratings from "../lib/ratings.js";
import type * as lib_roles from "../lib/roles.js";
import type * as lobby_games from "../lobby/games.js";
import type * as lobby_hostTransfer from "../lobby/hostTransfer.js";
import type * as lobby_joinRequests from "../lobby/joinRequests.js";
import type * as migrations from "../migrations.js";
import type * as presence from "../presence.js";
import type * as refs_admin from "../refs/admin.js";
import type * as refs_game from "../refs/game.js";
import type * as refs_history from "../refs/history.js";
import type * as refs_leaderboard from "../refs/leaderboard.js";
import type * as refs_lobby from "../refs/lobby.js";
import type * as tables_adminAuditLog from "../tables/adminAuditLog.js";
import type * as tables_cardPickingSessions from "../tables/cardPickingSessions.js";
import type * as tables_communityMessages from "../tables/communityMessages.js";
import type * as tables_communityReadState from "../tables/communityReadState.js";
import type * as tables_gameBroadcasts from "../tables/gameBroadcasts.js";
import type * as tables_gameLogPlayers from "../tables/gameLogPlayers.js";
import type * as tables_gameLogs from "../tables/gameLogs.js";
import type * as tables_gamePlayerRoles from "../tables/gamePlayerRoles.js";
import type * as tables_gamePlayers from "../tables/gamePlayers.js";
import type * as tables_gameSessions from "../tables/gameSessions.js";
import type * as tables_gameSpectators from "../tables/gameSpectators.js";
import type * as tables_games from "../tables/games.js";
import type * as tables_index from "../tables/index.js";
import type * as tables_joinRequests from "../tables/joinRequests.js";
import type * as tables_nightPhaseSessions from "../tables/nightPhaseSessions.js";
import type * as tables_playerRatings from "../tables/playerRatings.js";
import type * as tables_playerStats from "../tables/playerStats.js";
import type * as tables_profiles from "../tables/profiles.js";
import type * as tables_votes from "../tables/votes.js";
import type * as tables_votingSessions from "../tables/votingSessions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/gameLogs": typeof admin_gameLogs;
  "admin/games": typeof admin_games;
  "admin/stats": typeof admin_stats;
  "admin/users": typeof admin_users;
  "auth/profiles": typeof auth_profiles;
  "community/maintenance": typeof community_maintenance;
  "community/messages": typeof community_messages;
  "community/readState": typeof community_readState;
  crons: typeof crons;
  "games/core/bestMove": typeof games_core_bestMove;
  "games/core/broadcasts": typeof games_core_broadcasts;
  "games/core/cardPicking": typeof games_core_cardPicking;
  "games/core/dayPhase": typeof games_core_dayPhase;
  "games/core/dayRound": typeof games_core_dayRound;
  "games/core/farewellSpeech": typeof games_core_farewellSpeech;
  "games/core/fouls": typeof games_core_fouls;
  "games/core/gameLogs": typeof games_core_gameLogs;
  "games/core/leaderboard": typeof games_core_leaderboard;
  "games/core/mafiaSuccession": typeof games_core_mafiaSuccession;
  "games/core/nightPhase": typeof games_core_nightPhase;
  "games/core/phaseTransitions": typeof games_core_phaseTransitions;
  "games/core/players": typeof games_core_players;
  "games/core/roles": typeof games_core_roles;
  "games/core/sessions": typeof games_core_sessions;
  "games/core/speakingOrder": typeof games_core_speakingOrder;
  "games/core/spectators": typeof games_core_spectators;
  "games/core/types": typeof games_core_types;
  "games/core/voting": typeof games_core_voting;
  "games/core/webhookHandler": typeof games_core_webhookHandler;
  "games/core/winConditions": typeof games_core_winConditions;
  "games/japanese/definition": typeof games_japanese_definition;
  "games/japanese/nightModel": typeof games_japanese_nightModel;
  "games/japanese/phases": typeof games_japanese_phases;
  "games/japanese/winConditions": typeof games_japanese_winConditions;
  "games/registry": typeof games_registry;
  "games/sports/bestMove": typeof games_sports_bestMove;
  "games/sports/definition": typeof games_sports_definition;
  "games/sports/nightModel": typeof games_sports_nightModel;
  "games/sports/nightPhase": typeof games_sports_nightPhase;
  "games/sports/phases": typeof games_sports_phases;
  "games/sports/roles": typeof games_sports_roles;
  "games/sports/winConditions": typeof games_sports_winConditions;
  http: typeof http;
  "integrations/playerStats": typeof integrations_playerStats;
  "lib/access": typeof lib_access;
  "lib/admin": typeof lib_admin;
  "lib/auth": typeof lib_auth;
  "lib/constants": typeof lib_constants;
  "lib/entitlements": typeof lib_entitlements;
  "lib/games": typeof lib_games;
  "lib/nightSessions": typeof lib_nightSessions;
  "lib/playerRatings": typeof lib_playerRatings;
  "lib/playerStats": typeof lib_playerStats;
  "lib/profiles": typeof lib_profiles;
  "lib/publicApi": typeof lib_publicApi;
  "lib/ratings": typeof lib_ratings;
  "lib/roles": typeof lib_roles;
  "lobby/games": typeof lobby_games;
  "lobby/hostTransfer": typeof lobby_hostTransfer;
  "lobby/joinRequests": typeof lobby_joinRequests;
  migrations: typeof migrations;
  presence: typeof presence;
  "refs/admin": typeof refs_admin;
  "refs/game": typeof refs_game;
  "refs/history": typeof refs_history;
  "refs/leaderboard": typeof refs_leaderboard;
  "refs/lobby": typeof refs_lobby;
  "tables/adminAuditLog": typeof tables_adminAuditLog;
  "tables/cardPickingSessions": typeof tables_cardPickingSessions;
  "tables/communityMessages": typeof tables_communityMessages;
  "tables/communityReadState": typeof tables_communityReadState;
  "tables/gameBroadcasts": typeof tables_gameBroadcasts;
  "tables/gameLogPlayers": typeof tables_gameLogPlayers;
  "tables/gameLogs": typeof tables_gameLogs;
  "tables/gamePlayerRoles": typeof tables_gamePlayerRoles;
  "tables/gamePlayers": typeof tables_gamePlayers;
  "tables/gameSessions": typeof tables_gameSessions;
  "tables/gameSpectators": typeof tables_gameSpectators;
  "tables/games": typeof tables_games;
  "tables/index": typeof tables_index;
  "tables/joinRequests": typeof tables_joinRequests;
  "tables/nightPhaseSessions": typeof tables_nightPhaseSessions;
  "tables/playerRatings": typeof tables_playerRatings;
  "tables/playerStats": typeof tables_playerStats;
  "tables/profiles": typeof tables_profiles;
  "tables/votes": typeof tables_votes;
  "tables/votingSessions": typeof tables_votingSessions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  presence: {
    public: {
      disconnect: FunctionReference<
        "mutation",
        "internal",
        { scheduled?: boolean; sessionToken: string },
        null
      >;
      heartbeat: FunctionReference<
        "mutation",
        "internal",
        {
          interval?: number;
          roomId: string;
          sessionId: string;
          userId: string;
        },
        { roomToken: string; sessionToken: string }
      >;
      list: FunctionReference<
        "query",
        "internal",
        { limit?: number; roomToken: string },
        Array<{
          data?: any;
          lastDisconnected: number;
          online: boolean;
          userId: string;
        }>
      >;
      listRoom: FunctionReference<
        "query",
        "internal",
        { limit?: number; onlineOnly?: boolean; roomId: string },
        Array<{ lastDisconnected: number; online: boolean; userId: string }>
      >;
      listUser: FunctionReference<
        "query",
        "internal",
        { limit?: number; onlineOnly?: boolean; userId: string },
        Array<{ lastDisconnected: number; online: boolean; roomId: string }>
      >;
      removeRoom: FunctionReference<
        "mutation",
        "internal",
        { roomId: string },
        null
      >;
      removeRoomUser: FunctionReference<
        "mutation",
        "internal",
        { roomId: string; userId: string },
        null
      >;
      updateRoomUser: FunctionReference<
        "mutation",
        "internal",
        { data?: any; roomId: string; userId: string },
        null
      >;
    };
  };
};
