"use server";
import {
  AccessToken,
  VideoGrant,
  Room,
  RoomServiceClient,
  TrackSource,
} from "livekit-server-sdk";

export async function generateLivekitAccessToken(
  roomId: string,
  participantId: string,
  permissions: {
    hidden: boolean;
    roomAdmin: boolean;
    isSpectator?: boolean;
  },
  participantName?: string,
) {
  const displayName = participantName || participantId;

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: participantId,
      name: displayName,
    },
  );

  // Spectators can only subscribe (view-only), not publish
  const isSpectator = permissions.isSpectator ?? false;

  const videoGrant: VideoGrant = {
    room: roomId,
    roomJoin: true,
    canPublish: !isSpectator, // Spectators cannot publish
    canSubscribe: true,
    hidden: permissions.hidden || isSpectator, // Spectators are hidden
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
    process.env.LIVEKIT_API_SECRET!,
  );

  const opts = {
    name: roomId,
    emptyTimeout: 10 * 60, // 10 minutes
    maxParticipants: 31,
  };
  roomService.createRoom(opts).then((room: Room) => {
    console.log("room created", room);
  });
}

export async function deleteLivekitRoom(roomId: string) {
  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
  );
  roomService.deleteRoom(roomId).then(() => {
    console.log("room deleted");
  });
}

export async function removeParticipantFromRoom(
  roomId: string,
  participantId: string,
) {
  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
  );
  await roomService.removeParticipant(roomId, participantId);
}

export async function listParticipantsForRooms(roomIds: string[]) {
  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
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

export async function mutePublishedTrack(
  roomId: string,
  participantId: string,
  trackSid: string,
  muted: boolean,
) {
  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
  );
  await roomService.mutePublishedTrack(roomId, participantId, trackSid, muted);
}

/**
 * Mute or unmute a participant's microphone from the server.
 * This finds the microphone track server-side, so the client only needs to pass room and participant info.
 */
export async function muteParticipantMicrophone(
  roomName: string,
  participantIdentity: string,
  muted: boolean,
) {
  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
  );

  // Get participant info from server
  const participant = await roomService.getParticipant(
    roomName,
    participantIdentity,
  );

  // Find the microphone track
  const audioTrack = participant.tracks.find(
    (track) => track.source === TrackSource.MICROPHONE,
  );

  if (!audioTrack?.sid) {
    throw new Error("No microphone track found for participant");
  }

  await roomService.mutePublishedTrack(
    roomName,
    participantIdentity,
    audioTrack.sid,
    muted,
  );
}
