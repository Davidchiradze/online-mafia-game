/**
 * @deprecated This file is deprecated.
 *
 * Role filtering is now handled server-side via server actions:
 * - `getFilteredPlayerRoles()` in `src/lib/gamePlayerRoles/actions.ts`
 *
 * The filtering logic ensures:
 * - Mafia team (DON, MAFIA, MAFIA_RIGHT_HAND) can see each other's roles
 * - Yakuza team (YAKUZA, SHOGUN) can see each other's roles
 * - Host can see all roles
 * - Others see roles as null
 *
 * Roles are now stored in the separate `game_player_roles` table.
 */
export {};
