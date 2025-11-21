# Quick Integration Guide for Visibility System

## What Was Implemented

A complete conditional visibility system that automatically shows/hides participant videos based on game phases and roles. When a participant shouldn't be visible, a beautiful animated cover is shown instead.

## Files Created

### Core System

1. **`src/lib/game/visibility.ts`** - Visibility rules engine
2. **`src/components/video/ParticipantCover.tsx`** - Cover overlay component
3. **`src/hooks/useParticipantVisibility.ts`** - React hook for visibility logic
4. **`src/lib/liveKit/metadata.ts`** - Metadata utilities for roles
5. **`src/lib/liveKit/updateParticipantMetadata.ts`** - Server-side metadata updates

### Documentation

6. **`VISIBILITY_SYSTEM.md`** - Comprehensive system documentation
7. **`VISIBILITY_INTEGRATION_GUIDE.md`** - This file (quick start)

### Modified Files

- **`src/components/participant/ParticipantComponent.tsx`** - Integrated visibility system

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                      Game State Changes                          │
│                    (Phase Transition)                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              useParticipantVisibility Hook                       │
│  • Reads viewer's role from gameSessionState.playerData         │
│  • Reads target's role from participant metadata                │
│  • Checks current game phase                                    │
│  • Calls canSeeParticipant() with all parameters                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  canSeeParticipant()                             │
│  • Evaluates visibility rules based on phase                    │
│  • Returns true/false                                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               ParticipantComponent                               │
│  • If isVisible = true: Shows video                             │
│  • If isVisible = false: Shows ParticipantCover with emoji      │
└─────────────────────────────────────────────────────────────────┘
```

## Integration Steps

### Step 1: Assign Roles in Database

When assigning roles during the game, simply update the database:

```typescript
// Example: In your role assignment API route or server action
import { adminClient } from "@/lib/supabase/admin";

async function assignPlayerRole(gameId: string, playerId: string, role: Role) {
  const { error } = await adminClient
    .from("game_players")
    .update({ role })
    .eq("game_id", gameId)
    .eq("player_id", playerId);

  if (error) throw error;

  // That's it! The visibility system will automatically fetch all players
  // and use their roles for visibility checks
}
```

### Step 2: Ensure Game Session State is Synced

Make sure your `GameSessionState` includes:

- `game_phase`: Current phase (string)
- `playerData`: Current player's data including their `role`

This is already set up in your `useGameSession` hook.

### Step 3: That's It! ✨

The `ParticipantComponent` already integrates the visibility system automatically. No additional changes needed.

## Important: Early Game Phases

### Phases Without Roles

During `game_session_started` and `picking_roles` phases:

- ✅ **Players don't have roles yet** - this is expected and handled
- ✅ **Visibility works without roles** - uses phase-based rules only
- ✅ `game_session_started`: Everyone sees everyone (team formation)
- ✅ `picking_roles`: Only host sees everyone (host assigns roles)

The system gracefully handles `null` roles during these phases, so no special handling is needed!

## Testing the System

### Test Scenario 1: Night Phase

1. Start a game session
2. Transition to `night_phase`
3. **Expected**: All participants show 💤 covers (even host can't see)

### Test Scenario 2: Mafia Meet

1. Assign roles: Some players as DON, MAFIA, MAFIA_RIGHT_HAND, others as CITIZEN
2. Transition to `mafia_meet` phase
3. **Expected**:
   - Mafia members see each other (no cover)
   - Mafia members see host (no cover)
   - Host sees mafia members (no cover)
   - Citizens see covers on everyone (💤)
   - Mafia members see covers on citizens (💤)

### Test Scenario 3: Day Phase

1. Transition to `day_phase`
2. **Expected**: Everyone sees everyone (no covers)

## Current Visibility Rules Summary

| Phase                                | Visible Participants                               |
| ------------------------------------ | -------------------------------------------------- |
| **No game session**                  | Everyone sees everyone                             |
| **game_session_started**             | Everyone sees everyone (no roles yet)              |
| **picking_roles**                    | Only host sees everyone (no roles yet)             |
| **night_phase**                      | Nobody sees anyone (complete darkness)             |
| **introduction_phase**               | Everyone sees everyone                             |
| **day_phase**                        | Everyone sees everyone                             |
| **voting**                           | Everyone sees everyone                             |
| **mafia_meet**                       | DON, MAFIA, MAFIA_RIGHT_HAND see each other + host |
| **don_chooses_right_hand**           | Only DON sees everyone (+ host)                    |
| **yakuda_shogun_meet**               | YAKUZA, SHOGUN see each other + host               |
| **detective_meet**                   | Only DETECTIVE sees self + host                    |
| **doctor_meet**                      | Only DOCTOR sees self + host                       |
| **mafia_chooses_target**             | DON, MAFIA, MAFIA_RIGHT_HAND see each other + host |
| **don_checks_for_detective**         | Only DON sees everyone (+ host)                    |
| **right_hand_checks_for_yakuza**     | Only MAFIA_RIGHT_HAND sees everyone (+ host)       |
| **yakuza_and_shogun_chooses_target** | YAKUZA, SHOGUN see each other + host               |
| **detective_checks_for_mafia**       | Only DETECTIVE sees everyone (+ host)              |
| **doctor_heals_player**              | Only DOCTOR sees everyone (+ host)                 |

## Customization

### Change Cover Emoji

Edit `getCoverMessage()` in `src/lib/game/visibility.ts`:

```typescript
export function getCoverMessage(gamePhase: GamePhase | null): string {
  if (gamePhase === "night_phase") {
    return "🌙"; // Moon instead of Zzz
  }
  // ... other phases
}
```

### Add New Role Visibility

Edit `canSeeParticipant()` in `src/lib/game/visibility.ts`:

```typescript
// Example: Add a new "MAYOR" role that can see everyone during day phase
if (gamePhase === "day_phase") {
  if (viewerRole === "MAYOR") {
    return true; // Mayor sees everyone
  }
  return true; // Everyone else also sees everyone
}
```

### Customize Cover Appearance

Edit `src/components/video/ParticipantCover.tsx`:

```typescript
// Change colors
className = "bg-gradient-to-br from-purple-800 via-blue-900 to-black";

// Change emoji size
className = "text-9xl md:text-[12rem]";

// Add animations
className = "animate-bounce";
```

## Troubleshooting

### Issue: Participants are always visible (cover never shows)

**Solution**:

1. Check that `gameSessionState` is populated
2. Verify `game_phase` is set correctly
3. Ensure `gameSessionState.allPlayers` contains player data
4. Check browser console for errors in `useParticipantVisibility`

### Issue: Everyone sees covers (even when they shouldn't)

**Solution**:

1. Verify roles are set in database (`game_players` table)
2. Check that `gameSessionState.allPlayers` includes all players with roles
3. Check that `trackRef.participant.identity` matches player IDs in database
4. Add console.log in `useParticipantVisibility` to debug:

```typescript
console.log({
  viewerRole,
  targetRole,
  gamePhase,
  isVisible,
});
```

### Issue: Host can't see anyone

**Solution**:

1. Verify `isHost` flag in `GameRoomContext`
2. Check that `hostUserId` matches current user's ID
3. Note: During `night_phase`, even host can't see (this is by design)

## Next Steps

### Required for Production

- [ ] Implement `updateParticipantMetadataWithRole()` using LiveKit RoomService API
- [ ] Add server-side validation for phase transitions
- [ ] Set up role assignment workflow to call metadata updates
- [ ] Test with multiple users in different roles

### Optional Enhancements

- [ ] Add fade transitions when visibility changes
- [ ] Implement audio muting based on visibility
- [ ] Add blur effect option instead of complete cover
- [ ] Create admin override for debugging
- [ ] Add role-specific cover themes

## Example: Complete Role Assignment Flow

```typescript
// Server action or API route
export async function assignRoles(gameId: string) {
  // 1. Get all players
  const { data: players } = await supabase
    .from("game_players")
    .select("*")
    .eq("game_id", gameId);

  // 2. Randomly assign roles
  const roles: Role[] = ["DON", "MAFIA", "DETECTIVE", "CITIZEN", ...];
  const shuffled = shuffleArray(roles);

  // 3. Update database and metadata
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const role = shuffled[i];

    // Update database
    await supabase
      .from("game_players")
      .update({ role })
      .eq("id", player.id);

    // Update LiveKit metadata
    await updateParticipantMetadataWithRole(
      gameId,
      player.player_id,
      role,
      player.seat_index
    );
  }

  // 4. Transition to next phase
  await updateGamePhase(gameId, "mafia_meet");
}
```

## Support

For questions or issues:

1. Check `VISIBILITY_SYSTEM.md` for detailed documentation
2. Review visibility rules in `src/lib/game/visibility.ts`
3. Add debug logs in `useParticipantVisibility` hook
4. Test with console.log to trace the flow

---

**Built with**: React, TypeScript, LiveKit, TailwindCSS
**Follows**: Best practices for component-based architecture and separation of concerns
