# Visibility System Documentation

## Overview

The visibility system controls who can see whom during different game phases in the online Mafia game. It ensures that participants' video feeds are only visible to authorized viewers based on their roles and the current game phase.

## Architecture

The system consists of four main components:

### 1. Visibility Rules (`src/lib/game/visibility.ts`)

Core logic that determines visibility based on:

- Viewer's role
- Target participant's role
- Current game phase
- Host status (viewer and target)

**Key Function:**

```typescript
canSeeParticipant(
  viewerRole: Role,
  targetRole: Role,
  gamePhase: GamePhase | null,
  isViewerHost: boolean,
  isTargetHost: boolean
): boolean
```

### 2. Participant Cover Component (`src/components/video/ParticipantCover.tsx`)

Visual overlay shown when a participant should not be visible. Displays:

- Animated emoji (💤 for sleeping, 🎭 for role selection)
- Participant name/index
- Gradient background with subtle patterns

### 3. Visibility Hook (`src/hooks/useParticipantVisibility.ts`)

React hook that integrates with LiveKit and game state:

```typescript
const { isVisible, coverMessage } = useParticipantVisibility(
  trackRef,
  participantId
);
```

Returns:

- `isVisible`: Whether video should be shown
- `coverMessage`: Emoji/message for the cover
- `viewerRole`: Current viewer's role
- `targetRole`: Target participant's role

### 4. Participant Component Integration (`src/components/participant/ParticipantComponent.tsx`)

The ParticipantComponent automatically uses the visibility hook and conditionally renders the cover overlay.

## Visibility Rules by Phase

### Universal Rules

- **Host**: Can see everyone at all times (except during night_phase)
- **No Game Session**: Everyone can see everyone

### Phase-Specific Rules

| Phase                              | Who Can See                  | Who They See                     |
| ---------------------------------- | ---------------------------- | -------------------------------- |
| `game_session_started`             | Everyone                     | Everyone (no roles assigned yet) |
| `picking_roles`                    | Host only                    | Everyone (no roles assigned yet) |
| `night_phase`                      | No one                       | No one (complete darkness)       |
| `introduction_phase`               | Everyone                     | Everyone                         |
| `day_phase`                        | Everyone                     | Everyone                         |
| `voting`                           | Everyone                     | Everyone                         |
| `mafia_meet`                       | Don, Mafia, Right Hand, Host | Each other + Host                |
| `don_chooses_right_hand`           | Don, Host                    | Everyone                         |
| `yakuda_shogun_meet`               | Yakuza, Shogun, Host         | Each other + Host                |
| `detective_meet`                   | Detective, Host              | Self + Host                      |
| `doctor_meet`                      | Doctor, Host                 | Self + Host                      |
| `mafia_chooses_target`             | Don, Mafia, Right Hand, Host | Each other + Host                |
| `don_checks_for_detective`         | Don, Host                    | Everyone (for checking)          |
| `right_hand_checks_for_yakuza`     | Right Hand, Host             | Everyone (for checking)          |
| `yakuza_and_shogun_chooses_target` | Yakuza, Shogun, Host         | Each other + Host                |
| `detective_checks_for_mafia`       | Detective, Host              | Everyone (for checking)          |
| `doctor_heals_player`              | Doctor, Host                 | Everyone (for healing)           |

## Implementation Guide

### Setting Participant Roles

Roles are stored in the database and automatically fetched for visibility checks. When roles are assigned:

```typescript
// Update database with assigned roles
await supabase
  .from("game_players")
  .update({ role: "MAFIA" })
  .eq("game_id", gameId)
  .eq("player_id", playerId);

// The visibility system will automatically fetch and use these roles
// No need to manually update LiveKit metadata for visibility
```

### Server-Side Integration

When roles are assigned during the `picking_roles` phase:

1. Assign roles to players in the database (`game_players` table)
2. Update LiveKit participant metadata with the assigned role
3. The visibility system will automatically use this metadata

Example flow:

```typescript
// In your role assignment logic
async function assignRolesToPlayers(
  gameId: string,
  assignments: Map<string, Role>
) {
  for (const [playerId, role] of assignments) {
    // Update database
    await supabase
      .from("game_players")
      .update({ role })
      .eq("game_id", gameId)
      .eq("player_id", playerId);

    // Update LiveKit metadata
    const metadata = createMetadataWithRole(role);
    await updateParticipantMetadata(playerId, metadata);
  }
}
```

### Client-Side Usage

The visibility system is automatically integrated into `ParticipantComponent`. No additional changes needed for basic usage.

To manually check visibility in custom components:

```typescript
import { useParticipantVisibility } from "@/hooks/useParticipantVisibility";

function CustomComponent({ trackRef, participantId }) {
  const { isVisible, coverMessage, viewerRole, targetRole } =
    useParticipantVisibility(trackRef, participantId);

  if (!isVisible) {
    return <ParticipantCover message={coverMessage} />;
  }

  return <VideoComponent />;
}
```

## Extending the System

### Adding New Roles

1. Add the role to `JAPANESE_MAFIA_ROLES` in `src/lib/constants/game.ts`
2. Update visibility rules in `src/lib/game/visibility.ts`
3. Add role label to `JAPANESE_MAFIA_ROLE_LABEL`

### Adding New Phases

1. Add the phase to `GAME_PHASES` in `src/lib/constants/game.ts`
2. Add visibility logic in `canSeeParticipant()` function
3. Optionally update `getCoverMessage()` for custom cover messages

### Custom Cover Messages

Modify `getCoverMessage()` in `visibility.ts`:

```typescript
export function getCoverMessage(gamePhase: GamePhase | null): string {
  if (gamePhase === "my_custom_phase") {
    return "🔮"; // Custom emoji
  }
  // ... existing logic
}
```

## Testing Visibility Rules

To test visibility rules:

1. **Join as different roles**: Create multiple browser sessions with different user accounts
2. **Assign different roles**: Use the role assignment UI (host controls)
3. **Progress through phases**: Observe which participants can see each other
4. **Verify host visibility**: Host should always see everyone (except night phase)
5. **Check night phase**: Ensure complete darkness for all participants

## Performance Considerations

- Visibility calculations are memoized using `useMemo` to prevent unnecessary re-renders
- Cover component is lightweight (just CSS gradients and emojis)
- No network calls are made for visibility checks (all client-side calculation)

## Security Notes

⚠️ **Important**: This is a client-side visibility system. It controls UI display only.

- Video streams are still transmitted to all participants
- This is by design for WebRTC efficiency (LiveKit handles stream routing)
- For true privacy, implement server-side selective forwarding units (SFU) rules in LiveKit

For enhanced privacy in production:

- Configure LiveKit room permissions to restrict video track subscriptions
- Implement server-side validation for phase transitions
- Use LiveKit's built-in permission system for sensitive phases

## Troubleshooting

### Participants Can't See Each Other When They Should

**Check:**

1. Is participant metadata set correctly? (Check browser console for metadata logs)
2. Is `gameSessionState` properly synced? (Check Redux/context state)
3. Are roles assigned in the database?
4. Is the game phase correct?

### Cover Not Showing When It Should

**Check:**

1. Is `useParticipantVisibility` hook being called?
2. Are trackRef and participantId passed correctly?
3. Check browser console for any errors

### Host Can't See Participants

**Check:**

1. Is `isViewerHost` flag set correctly in `useGameRoom()`?
2. Is `hostUserId` properly synced?
3. During night phase, even host can't see (by design)

## Future Enhancements

Potential improvements:

- [ ] Audio muting based on visibility rules
- [ ] Blur effect instead of complete cover for semi-privacy
- [ ] Animated transitions between visible/hidden states
- [ ] Role-specific cover themes (different colors/emojis per role)
- [ ] Admin override to see all participants regardless of rules
- [ ] Spectator mode with configurable visibility
