"use server";
import {
  AccessToken,
  VideoGrant,
  Room,
  RoomServiceClient,
} from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";

// In-memory lock system to prevent race conditions during seat assignment
const seatAssignmentLocks = new Map<string, Promise<void>>();

async function withSeatAssignmentLock<T>(
  roomId: string,
  operation: () => Promise<T>
): Promise<T> {
  // Wait for any existing lock to complete
  while (seatAssignmentLocks.has(roomId)) {
    await seatAssignmentLocks.get(roomId);
  }

  // Create a new lock for this operation
  let resolveLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });
  seatAssignmentLocks.set(roomId, lockPromise);

  try {
    // Execute the operation
    return await operation();
  } finally {
    // Release the lock
    seatAssignmentLocks.delete(roomId);
    resolveLock!();
  }
}

export async function generateLivekitAccessToken(
  roomId: string,
  participantId: string,
  permissions: {
    hidden: boolean;
    roomAdmin: boolean;
    seatIndex?: number;
  }
) {
  // Resolve participant display name from the authenticated session
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const participantName =
    ((session?.user?.user_metadata as Record<string, unknown>)
      ?.nickname as string) ||
    session?.user?.email ||
    participantId;

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: participantId,
      name: participantName,
      // Include seat index in initial metadata if provided
      ...(permissions.seatIndex !== undefined && {
        metadata: JSON.stringify({ seatIndex: permissions.seatIndex }),
      }),
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
  // Merge with existing metadata so seatIndex is preserved
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
 * Core seat calculation logic - shared by both pre-assignment and post-connection assignment.
 * Determines which seat a participant should occupy based on game state.
 *
 * @returns seat number (1-maxPlayers) or null if no seat available
 */
async function calculateSeatForParticipant(
  roomId: string,
  participantId: string,
  existingParticipants: { identity: string; metadata?: string }[],
  maxPlayers: number
): Promise<number | null> {
  const supabase = await createClient();

  // Check if game has started
  const { data: game } = await supabase
    .from("games")
    .select("game_status")
    .eq("id", roomId)
    .single();

  // If game has started (playing or finished), get seat from game_players table
  if (
    game &&
    (game.game_status === "playing" || game.game_status === "finished")
  ) {
    const { data: gamePlayer } = await supabase
      .from("game_players")
      .select("seat_number")
      .eq("game_id", roomId)
      .eq("player_id", participantId)
      .single();

    return gamePlayer?.seat_number ?? null;
  }

  // Game not started: find first empty seat
  // Collect all currently occupied seats
  const used = new Set<number>();
  for (const p of existingParticipants) {
    // Skip the current participant if they're already in the list (reconnection case)
    if (p.identity === participantId) continue;

    try {
      const metadata = p.metadata
        ? (JSON.parse(p.metadata) as Record<string, unknown>)
        : {};
      const seatIndex = metadata?.seatIndex;
      if (
        typeof seatIndex === "number" &&
        Number.isInteger(seatIndex) &&
        seatIndex >= 1 &&
        seatIndex <= maxPlayers
      ) {
        used.add(seatIndex);
      }
    } catch {
      // Ignore malformed metadata
    }
  }

  // Find first available seat
  for (let i = 1; i <= maxPlayers; i++) {
    if (!used.has(i)) {
      return i;
    }
  }

  return null; // All seats occupied
}

/**
 * Pre-calculates and returns the seat number for a participant before they connect.
 * This should be called BEFORE generating the LiveKit token so the seat can be
 * included in the initial participant metadata, preventing visual "jumps".
 *
 * @returns seat number or null if no seat available
 */
export async function preassignSeat(
  roomId: string,
  participantId: string,
  maxPlayers: number = 12
): Promise<number | null> {
  return withSeatAssignmentLock(roomId, async () => {
    const roomService = new RoomServiceClient(
      process.env.NEXT_PUBLIC_LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );

    const participants = await roomService.listParticipants(roomId);
    return calculateSeatForParticipant(
      roomId,
      participantId,
      participants,
      maxPlayers
    );
  });
}

export async function clearSeatIndex(
  roomId: string,
  participantId: string
): Promise<void> {
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
    meta = target.metadata
      ? (JSON.parse(target.metadata) as Record<string, unknown>)
      : {};
  } catch {
    meta = {};
  }
  if (Object.prototype.hasOwnProperty.call(meta, "seatIndex")) {
    delete meta.seatIndex;
    await roomService.updateParticipant(roomId, participantId, {
      metadata: JSON.stringify(meta),
    });
  }
}
