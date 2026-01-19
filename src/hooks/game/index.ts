// Game-related hooks
export { useGameSession } from "./useGameSession";
export { useGamePlayers } from "./useGamePlayers";
export { usePlayerRoles } from "./usePlayerRoles";
export { usePlayerSlots } from "./usePlayerSlots";
export type { PlayerSlotDescriptor } from "./usePlayerSlots";

export { useNomination } from "./useNomination";
export { useFoulSpeak } from "./useFoulSpeak";
export { useSpeakingProgress } from "./useSpeakingState";

// Mafia night kill
export { useMafiaKillAuthority } from "./useMafiaKillAuthority";
export { useMafiaTargetSelection } from "./useMafiaTargetSelection";
export type { MafiaTargetSelectionResult } from "./useMafiaTargetSelection";

// Yakuza night kill
export { useYakuzaKillAuthority } from "./useYakuzaKillAuthority";
export { useYakuzaTargetSelection } from "./useYakuzaTargetSelection";
export type { YakuzaTargetSelectionResult } from "./useYakuzaTargetSelection";

export { useRoleAssignmentNotification } from "./useRoleAssignmentNotification";
export { useRoleRevealModal } from "./useRoleRevealModal";
