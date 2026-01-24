import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import {
  joinGamePlayer,
  leaveGamePlayerAdmin,
} from "@/lib/gamePlayers/actions";

/**
 * LiveKit Webhook Endpoint
 *
 * Handles webhook events from LiveKit server, specifically:
 * - participant_left: When a participant leaves the room normally
 * - participant_connection_aborted: When a participant's connection is aborted due to connection issues
 *
 * IMPORTANT: You must configure this webhook URL in your LiveKit server:
 * - LiveKit Cloud: Settings > Webhooks in your project dashboard
 * - Self-hosted: Add webhook config to your LiveKit config file:
 *   webhook:
 *     api_key: 'your-api-key'
 *     urls:
 *       - 'https://yourdomain.com/api/livekit/webhook'
 *
 * Webhook secret is typically the LIVEKIT_API_SECRET.
 */
const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

/**
 * POST /api/livekit/webhook
 *
 * Receives and processes LiveKit webhook events.
 * Only handles participant disconnection events to update player state in the database.
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for webhook signature verification

    const body = await request.text();

    // Get the authorization header which contains the webhook signature
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    // Verify and decode the webhook event
    // Note: receive validates the webhook signature and returns the event
    const event = await receiver.receive(body, authHeader);
    if (event.event === "participant_joined") {
      const room = event.room;
      const participant = event.participant;

      if (!room?.name || !participant?.identity) {
        return NextResponse.json({ received: true });
      }

      const gameId = room.name;
      // const userId = participant.identity;

      await joinGamePlayer(gameId);
    }
    // Handle participant disconnection events
    // Note: According to LiveKit docs, the event is "participant_left" (not "participant_disconnected")
    if (
      event.event === "participant_left" ||
      event.event === "participant_connection_aborted"
    ) {
      const room = event.room;
      const participant = event.participant;

      if (!room?.name || !participant?.identity) {
        return NextResponse.json({ received: true });
      }

      const gameId = room.name;
      const userId = participant.identity;

      // Use the existing leaveGamePlayerAdmin action to handle disconnection
      const result = await leaveGamePlayerAdmin(gameId, userId);

      if (!result.ok) {
        // Don't return error - webhook should acknowledge receipt
      } else {
        console.log(`Player ${userId} disconnected from game ${gameId}`);
      }
    }

    // Always return success to acknowledge webhook receipt
    // Even if processing fails, we don't want LiveKit to retry indefinitely
    return NextResponse.json({ received: true });
  } catch {
    // Return success to prevent retries for malformed requests
    // But log the error for debugging
    return NextResponse.json(
      { error: "Webhook processing failed", received: true },
      { status: 200 }
    );
  }
}
