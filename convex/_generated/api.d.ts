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
import type * as admin_users from "../admin/users.js";
import type * as auth_profiles from "../auth/profiles.js";
import type * as game_cardPicking from "../game/cardPicking.js";
import type * as game_dayPhase from "../game/dayPhase.js";
import type * as game_farewellSpeech from "../game/farewellSpeech.js";
import type * as game_gameLogs from "../game/gameLogs.js";
import type * as game_nightPhase from "../game/nightPhase.js";
import type * as game_players from "../game/players.js";
import type * as game_roles from "../game/roles.js";
import type * as game_sessions from "../game/sessions.js";
import type * as game_spectators from "../game/spectators.js";
import type * as game_voting from "../game/voting.js";
import type * as game_webhookHandler from "../game/webhookHandler.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_admin from "../lib/admin.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_games from "../lib/games.js";
import type * as lib_phaseTransitions from "../lib/phaseTransitions.js";
import type * as lib_profiles from "../lib/profiles.js";
import type * as lib_roles from "../lib/roles.js";
import type * as lib_speakingOrder from "../lib/speakingOrder.js";
import type * as lib_winConditions from "../lib/winConditions.js";
import type * as lobby_games from "../lobby/games.js";
import type * as lobby_hostTransfer from "../lobby/hostTransfer.js";
import type * as lobby_joinRequests from "../lobby/joinRequests.js";
import type * as migrations from "../migrations.js";
import type * as refs_admin from "../refs/admin.js";
import type * as refs_game from "../refs/game.js";
import type * as refs_history from "../refs/history.js";
import type * as refs_lobby from "../refs/lobby.js";
import type * as tables_adminAuditLog from "../tables/adminAuditLog.js";
import type * as tables_cardPickingSessions from "../tables/cardPickingSessions.js";
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
  "admin/users": typeof admin_users;
  "auth/profiles": typeof auth_profiles;
  "game/cardPicking": typeof game_cardPicking;
  "game/dayPhase": typeof game_dayPhase;
  "game/farewellSpeech": typeof game_farewellSpeech;
  "game/gameLogs": typeof game_gameLogs;
  "game/nightPhase": typeof game_nightPhase;
  "game/players": typeof game_players;
  "game/roles": typeof game_roles;
  "game/sessions": typeof game_sessions;
  "game/spectators": typeof game_spectators;
  "game/voting": typeof game_voting;
  "game/webhookHandler": typeof game_webhookHandler;
  "lib/access": typeof lib_access;
  "lib/admin": typeof lib_admin;
  "lib/auth": typeof lib_auth;
  "lib/constants": typeof lib_constants;
  "lib/games": typeof lib_games;
  "lib/phaseTransitions": typeof lib_phaseTransitions;
  "lib/profiles": typeof lib_profiles;
  "lib/roles": typeof lib_roles;
  "lib/speakingOrder": typeof lib_speakingOrder;
  "lib/winConditions": typeof lib_winConditions;
  "lobby/games": typeof lobby_games;
  "lobby/hostTransfer": typeof lobby_hostTransfer;
  "lobby/joinRequests": typeof lobby_joinRequests;
  migrations: typeof migrations;
  "refs/admin": typeof refs_admin;
  "refs/game": typeof refs_game;
  "refs/history": typeof refs_history;
  "refs/lobby": typeof refs_lobby;
  "tables/adminAuditLog": typeof tables_adminAuditLog;
  "tables/cardPickingSessions": typeof tables_cardPickingSessions;
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

export declare const components: {};
