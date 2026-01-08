"use server";
import {
  AccessToken,
  VideoGrant,
  Room,
  RoomServiceClient,
} from "livekit-server-sdk";
import { TrackType } from "@livekit/protocol";
import { createClient } from "@/lib/supabase/server";

export async function generateLivekitAccessToken(
  roomId: string,
  participantId: string,
  permissions: {
    hidden: boolean;
    roomAdmin: boolean;
  }
) {
  // Resolve participant display name from the authenticated user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const participantName =
    ((user?.user_metadata as Record<string, unknown>)?.nickname as string) ||
    user?.email ||
    participantId;

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: participantId,
      name: participantName,
    }
  );

  const videoGrant: VideoGrant = {
    room: roomId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    hidden: permissions.hidden || false,
    roomAdmin: permissions.roomAdmin || false,
  };

  at.addGrant(videoGrant);

  const token = await at.toJwt();
  return token;
}

export async function createLivekitRoom(roomId: string) {
  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  const opts = {
    name: roomId,
    emptyTimeout: 10 * 60, // 10 minutes
    maxParticipants: 20,
  };
  roomService.createRoom(opts).then((room: Room) => {
    console.log("room created", room);
  });
}

export async function deleteLivekitRoom(roomId: string) {
  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );
  roomService.deleteRoom(roomId).then(() => {
    console.log("room deleted");
  });
}

export async function removeParticipantFromRoom(
  roomId: string,
  participantId: string
) {
  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );
  await roomService.removeParticipant(roomId, participantId);
}

export async function listParticipantsForRooms(roomIds: string[]) {
  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  const results: Record<string, { count: number; names: string[] }> = {};
  for (const roomId of roomIds) {
    try {
      const participants = await roomService.listParticipants(roomId);
      const names = participants.map((p) => p.name || p.identity || "");
      results[roomId] = { count: participants.length, names };
    } catch {
      results[roomId] = { count: 0, names: [] };
    }
  }
  return results;
}

export async function setParticipantReady(
  roomId: string,
  participantId: string,
  ready: boolean
) {
  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );
  // Merge with existing metadata so other fields are preserved
  let existingMeta: Record<string, unknown> = {};
  try {
    const participants = await roomService.listParticipants(roomId);
    const target = participants.find((p) => p.identity === participantId);
    if (target?.metadata) {
      try {
        existingMeta = JSON.parse(target.metadata) as Record<string, unknown>;
      } catch {
        existingMeta = {};
      }
    }
  } catch {
    existingMeta = {};
  }

  await roomService.updateParticipant(roomId, participantId, {
    metadata: JSON.stringify({ ...existingMeta, ready }),
  });
}

/**
 * Mute all participants except the host
 * @param roomId - The LiveKit room ID (same as game ID)
 * @param hostId - The host's user ID to exclude from muting
 */
export async function muteAllParticipantsExceptHost(
  roomId: string,
  hostId: string
) {
  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  try {
    const participants = await roomService.listParticipants(roomId);

    // Mute audio tracks for all participants except the host
    for (const participant of participants) {
      if (participant.identity === hostId) continue;

      // Find and mute audio tracks only (TrackType.AUDIO = 0, TrackType.VIDEO = 1)
      for (const track of participant.tracks) {
        if (track.type === TrackType.AUDIO) {
          await roomService.mutePublishedTrack(
            roomId,
            participant.identity,
            track.sid,
            true // muted = true
          );
        }
      }
    }

    return { ok: true };
  } catch (error) {
    console.error("Failed to mute participants:", error);
    return { ok: false, message: "Failed to mute participants" };
  }
}
