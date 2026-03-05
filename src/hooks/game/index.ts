// Game-related hooks
export { useGameSession } from "./useGameSession";
export { useGamePlayers } from "./useGamePlayers";
export { usePlayerRoles } from "./usePlayerRoles";
export { usePlayerSlots } from "./usePlayerSlots";
export type { PlayerSlotDescriptor } from "./usePlayerSlots";

export { useNomination } from "./useNomination";
export { useFoulSpeak } from "./useFoulSpeak";
export { useFoulNotification } from "./useFoulNotification";
export { useSpeakingProgress } from "./useSpeakingState";

// Night action authority (synchronous, replaces async authority hooks)
export { useNightActionAuthority } from "./useNightActionAuthority";
export type { NightActionAuthority } from "./useNightActionAuthority";

// Healed players (single fetch per game, not per participant)
export { useHealedPlayers } from "./useHealedPlayers";

// Mafia night kill
export { useMafiaTargetSelection } from "./useMafiaTargetSelection";
export type { MafiaTargetSelectionResult } from "./useMafiaTargetSelection";

// Yakuza night kill
export { useYakuzaTargetSelection } from "./useYakuzaTargetSelection";
export type { YakuzaTargetSelectionResult } from "./useYakuzaTargetSelection";

// Doctor heal
export { useDoctorHealSelection } from "./useDoctorHealSelection";
export type { DoctorHealSelectionResult } from "./useDoctorHealSelection";

export { useRoleAssignmentNotification } from "./useRoleAssignmentNotification";
export { useRoleRevealModal } from "./useRoleRevealModal";

// Voting
export { useVotingButton } from "./useVotingButton";
export { useVoteIndicator } from "./useVoteIndicator";
