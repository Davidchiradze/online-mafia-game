// LiveKit-related hooks
export { useLivekitRoom } from "./useLivekitRoom";
export { useLivekitConnect } from "./useLivekitConnect";
export { useDeadPlayerMute } from "./useDeadPlayerMute";
export { useSpeakingAutoMute } from "./useSpeakingAutoMute";
export { useEnsurePlayerSeat } from "./useEnsurePlayerSeat";
export { useJoinPermissionListener } from "./useJoinPermissionListener";

// LiveKit Data Channel hooks
export { useLiveKitDataListener } from "./useLiveKitDataListener";
export type { LiveKitDataReceivedHandler } from "./useLiveKitDataListener";

// LiveKit Voting hooks (replaces Supabase Realtime)
export { useLiveKitVotingListener } from "./useLiveKitVotingListener";
// Note: VotingSession and VoteData types are available from "@/lib/liveKit/messageTypes"
// or from the old "@/hooks/realtime" during migration period

