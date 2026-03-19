import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { ConvexHttpClient } from "convex/browser";
import { webhookHandler } from "@convex/refs/game";

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * POST /api/livekit/webhook
 *
 * Receives and processes LiveKit webhook events.
 * Handles participant disconnection and room cleanup via Convex actions.
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

      if (room?.name && participant?.identity) {
        await convex.action(webhookHandler.handleParticipantLeft, {
          gameId: room.name,
          userId: participant.identity,
        });
      }
    }

    if (event.event === "room_finished") {
      const room = event.room;

      if (room?.name) {
        await convex.action(webhookHandler.handleRoomFinished, {
          gameId: room.name,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Webhook processing failed:", e);
    return NextResponse.json(
      { error: "Webhook processing failed", received: true },
      { status: 200 }
    );
  }
}
