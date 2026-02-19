"use server";
import {
  AccessToken,
  VideoGrant,
  Room,
  RoomServiceClient,
  TrackSource,
} from "livekit-server-sdk";
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


export async function mutePublishedTrack(
  roomId: string,
  participantId: string,
  trackSid: string,
  muted: boolean
) {
  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );
  await roomService.mutePublishedTrack(roomId, participantId, trackSid, muted);
}

/**
 * Mute or unmute a participant's microphone from the server.
 * This finds the microphone track server-side, so the client only needs to pass room and participant info.
 *
 * @param roomName - The LiveKit room name (game ID)
 * @param participantIdentity - The participant's identity (user ID)
 * @param muted - Whether to mute (true) or unmute (false)
 * @returns Object with success status and optional error message
 */
export async function muteParticipantMicrophone(
  roomName: string,
  participantIdentity: string,
  muted: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const roomService = new RoomServiceClient(
      process.env.NEXT_PUBLIC_LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );

    // Get participant info from server
    const participant = await roomService.getParticipant(
      roomName,
      participantIdentity
    );

    // Find the microphone track
    const audioTrack = participant.tracks.find(
      (track) => track.source === TrackSource.MICROPHONE
    );

    if (!audioTrack?.sid) {
      // Participant might not have published their mic yet - this is not a critical error
      console.warn(
        `[muteParticipantMicrophone] No microphone track for ${participantIdentity} in room ${roomName}`
      );
      return { ok: false, message: "No microphone track found" };
    }

    await roomService.mutePublishedTrack(
      roomName,
      participantIdentity,
      audioTrack.sid,
      muted
    );

    return { ok: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[muteParticipantMicrophone] Failed to ${muted ? "mute" : "unmute"} ${participantIdentity}:`,
      errorMessage
    );
    return { ok: false, message: errorMessage };
  }
}

/**
 * Mute all participants in a room except for the specified speaker.
 * Used when transitioning speaking turns.
 *
 * @param roomName - The LiveKit room name (game ID)
 * @param speakerIdentity - The identity of the participant who should be unmuted (or null to mute all)
 * @param participantIdentities - Array of all participant identities in the room
 */
export async function muteAllExceptSpeaker(
  roomName: string,
  speakerIdentity: string | null,
  participantIdentities: string[]
): Promise<void> {
  await Promise.all(
    participantIdentities.map((identity) =>
      muteParticipantMicrophone(
        roomName,
        identity,
        identity !== speakerIdentity
      ).catch((err) => {
        console.error(
          `[muteAllExceptSpeaker] Failed to set mute state for ${identity}:`,
          err
        );
      })
    )
  );
}

/**
 * Mute all participants in a room.
 * Used when pausing speaking or transitioning phases.
 *
 * @param roomName - The LiveKit room name (game ID)
 * @param participantIdentities - Array of all participant identities in the room
 */
export async function muteAllParticipants(
  roomName: string,
  participantIdentities: string[]
): Promise<void> {
  await muteAllExceptSpeaker(roomName, null, participantIdentities);
}