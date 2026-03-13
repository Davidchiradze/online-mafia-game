import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import type { Id } from "@convex/_generated/dataModel";

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const leavePlayerInternal = makeFunctionReference<
  "mutation",
  { gameId: Id<"games">; userId: Id<"profiles"> },
  null
>("game/players:leaveAdminInternal");

const leaveSpectatorInternal = makeFunctionReference<
  "mutation",
  { gameId: Id<"games">; userId: Id<"profiles"> },
  null
>("game/spectators:leaveAdminInternal");

const removeGameInternal = makeFunctionReference<
  "mutation",
  { gameId: Id<"games"> },
  null
>("lobby/games:removeInternal");

/**
 * POST /api/livekit/webhook
 *
 * Receives and processes LiveKit webhook events.
 * Handles participant disconnection and room cleanup via Convex internal mutations.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const event = await receiver.receive(body, authHeader);

    if (
      event.event === "participant_left" ||
      event.event === "participant_connection_aborted"
    ) {
      const room = event.room;
      const participant = event.participant;

      if (!room?.name || !participant?.identity) {
        return NextResponse.json({ received: true });
      }

      const gameId = room.name as Id<"games">;
      const userId = participant.identity as Id<"profiles">;

      try {
        await convex.mutation(leavePlayerInternal, { gameId, userId });
        console.log(`Player ${userId} disconnected from game ${gameId}`);
      } catch {
        try {
          await convex.mutation(leaveSpectatorInternal, { gameId, userId });
          console.log(`Spectator ${userId} disconnected from game ${gameId}`);
        } catch {
          // Neither player nor spectator — ignore
        }
      }
    }

    if (event.event === "room_finished") {
      const room = event.room;

      if (!room?.name) {
        return NextResponse.json({ received: true });
      }

      const gameId = room.name as Id<"games">;

      try {
        await convex.mutation(removeGameInternal, { gameId });
        console.log(`Game ${gameId} deleted after room finished`);
      } catch (e) {
        console.log(`Failed to delete game ${gameId}:`, e);
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Webhook processing failed", received: true },
      { status: 200 }
    );
  }
}
