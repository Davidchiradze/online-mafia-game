"use client";

/**
 * LiveKit Data Channel Listener Hook
 *
 * Generic hook to listen for data messages from a LiveKit room.
 * Messages are sent via LiveKit's reliable data channels for guaranteed delivery.
 *
 * @see https://docs.livekit.io/transport/data/state/
 */

import { useEffect, useCallback, useRef } from "react";
import { Room as LiveKitRoom, RoomEvent, DataPacket_Kind } from "livekit-client";
import type { LiveKitGameMessage } from "@/lib/liveKit/messageTypes";

type DataReceivedCallback = (
  message: LiveKitGameMessage,
  participant?: { identity: string; name?: string }
) => void;

type UseLiveKitDataListenerOptions = {
  /**
   * Callback when a valid game message is received.
   * Called with the parsed message and optional sender info.
   */
  onMessage: DataReceivedCallback;

  /**
   * Whether the listener is enabled.
   * Useful for conditional listening based on game phase.
   * @default true
   */
  enabled?: boolean;

  /**
   * Optional filter to only process certain message types.
   * If not provided, all message types are processed.
   */
  messageTypes?: LiveKitGameMessage["type"][];
};

/**
 * Hook to listen for data messages from a LiveKit room.
 *
 * @param room - The LiveKit room instance
 * @param options - Listener options including callback and filters
 *
 * @example
 * ```tsx
 * useLiveKitDataListener(room, {
 *   onMessage: (message) => {
 *     if (message.type === 'VOTING_SESSION_UPDATE') {
 *       setVotingSession(message.payload.votingSession);
 *     }
 *   },
 *   enabled: isVotingPhase,
 *   messageTypes: ['VOTING_SESSION_UPDATE', 'VOTE_CAST'],
 * });
 * ```
 */
export function useLiveKitDataListener(
  room: LiveKitRoom | null | undefined,
  options: UseLiveKitDataListenerOptions
) {
  const { onMessage, enabled = true, messageTypes } = options;

  // Use refs to avoid recreating the handler on every render
  const onMessageRef = useRef(onMessage);
  const messageTypesRef = useRef(messageTypes);

  // Keep refs updated
  useEffect(() => {
    onMessageRef.current = onMessage;
    messageTypesRef.current = messageTypes;
  }, [onMessage, messageTypes]);

  // Memoized handler that uses refs
  const handleDataReceived = useCallback(
    (
      payload: Uint8Array,
      participant?: { identity: string; name?: string },
      kind?: DataPacket_Kind
    ) => {
      // Only process reliable messages (game state should always be reliable)
      // But we'll accept any kind since the server sends reliable
      try {
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(payload);
        const message = JSON.parse(jsonString) as LiveKitGameMessage;

        // Validate message has required 'type' field
        if (!message || typeof message.type !== "string") {
          console.warn("[LiveKit Data] Received invalid message format:", message);
          return;
        }

        // Filter by message types if specified
        const allowedTypes = messageTypesRef.current;
        if (allowedTypes && !allowedTypes.includes(message.type)) {
          return;
        }

        // Call the callback with parsed message
        onMessageRef.current(message, participant);
      } catch (error) {
        console.error(
          "[LiveKit Data] Failed to parse data message:",
          error instanceof Error ? error.message : error
        );
      }
    },
    []
  );

  useEffect(() => {
    if (!room || !enabled) return;

    // Add listener for data received events
    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, enabled, handleDataReceived]);
}

/**
 * Type for the data received event handler parameters.
 * Useful for typing custom handlers outside this hook.
 */
export type LiveKitDataReceivedHandler = (
  payload: Uint8Array,
  participant?: { identity: string; name?: string },
  kind?: DataPacket_Kind
) => void;

