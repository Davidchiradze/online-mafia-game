"use server";
import {
  AccessToken,
  VideoGrant,
  Room,
  RoomServiceClient,
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
  // Resolve participant display name from the authenticated session
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const participantName =
    (session?.user?.user_metadata as any)?.nickname ||
    session?.user?.email ||
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
    } catch (_e) {
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
  // Merge with existing metadata so seatIndex is preserved
  let existingMeta: Record<string, unknown> = {};
  try {
    const participants = await roomService.listParticipants(roomId);
    const target = participants.find((p) => p.identity === participantId);
    if (target?.metadata) {
      try {
        existingMeta = JSON.parse(target.metadata) as Record<string, unknown>;
      } catch (_e) {
        existingMeta = {};
      }
    }
  } catch (_e) {
    existingMeta = {};
  }

  await roomService.updateParticipant(roomId, participantId, {
    metadata: JSON.stringify({ ...existingMeta, ready }),
  });
}

export async function assignSeatIfMissing(
  roomId: string,
  participantId: string,
  maxPlayers: number = 12
) {
  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );
  const participants = await roomService.listParticipants(roomId);
  const target = participants.find((p) => p.identity === participantId);
  if (!target) return;

  let meta: Record<string, unknown> = {};
  try {
    meta = target.metadata ? (JSON.parse(target.metadata) as any) : {};
  } catch (_e) {
    meta = {};
  }

  const hasSeat =
    typeof (meta as any).seatIndex === "number" &&
    Number.isInteger((meta as any).seatIndex) &&
    (meta as any).seatIndex >= 1 &&
    (meta as any).seatIndex <= maxPlayers;
  if (hasSeat) return;

  const used = new Set<number>();
  for (const p of participants) {
    if (p.identity === participantId) continue;
    try {
      const pm = p.metadata ? (JSON.parse(p.metadata) as any) : {};
      const s = pm?.seatIndex;
      if (
        typeof s === "number" &&
        Number.isInteger(s) &&
        s >= 1 &&
        s <= maxPlayers
      ) {
        used.add(s);
      }
    } catch (_e) {}
  }

  let seat: number | undefined;
  for (let i = 1; i <= maxPlayers; i++) {
    if (!used.has(i)) {
      seat = i;
      break;
    }
  }
  if (!seat) return;

  await roomService.updateParticipant(roomId, participantId, {
    metadata: JSON.stringify({ ...meta, seatIndex: seat }),
  });
}
