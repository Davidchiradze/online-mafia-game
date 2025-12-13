/**
 * LiveKit Participant Metadata Utilities
 *
 * Helpers for managing participant metadata in LiveKit rooms.
 * Metadata is used to store participant-specific information like roles.
 */

import type { RemoteParticipant, LocalParticipant } from "livekit-client";
import type { JAPANESE_MAFIA_ROLES } from "@/lib/constants/game";

export type Role = (typeof JAPANESE_MAFIA_ROLES)[number];

export interface ParticipantMetadata {
  role?: Role;
  [key: string]: unknown;
}

/**
 * Parse participant metadata from JSON string
 */
export function parseMetadata(
  participant: RemoteParticipant | LocalParticipant | undefined
): ParticipantMetadata | null {
  if (!participant?.metadata) return null;

  try {
    return JSON.parse(participant.metadata) as ParticipantMetadata;
  } catch {
    return null;
  }
}

/**
 * Update local participant metadata
 * Note: This only works for the local participant
 */
export async function updateLocalMetadata(
  participant: LocalParticipant,
  updates: Partial<ParticipantMetadata>
): Promise<void> {
  const current = parseMetadata(participant) || {};
  const updated = { ...current, ...updates };

  try {
    await participant.setMetadata(JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to update participant metadata:", error);
  }
}

/**
 * Set participant role in metadata
 * This should typically be called from the server/backend when roles are assigned
 */
export function createMetadataWithRole(role: Role): string {
  const metadata: ParticipantMetadata = {
    role,
  };

  return JSON.stringify(metadata);
}
