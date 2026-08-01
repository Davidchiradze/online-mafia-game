import type { StaticImageData } from "next/image";
import cardBack from "@/features/game-room/assets/cards/CardBack.png";
import don from "@/features/game-room/assets/cards/don.png";
import mafia from "@/features/game-room/assets/cards/mafia.png";
import shogun from "@/features/game-room/assets/cards/shogun.png";
import yakuza from "@/features/game-room/assets/cards/yakuza.png";
import detective from "@/features/game-room/assets/cards/detective.png";
import doctor from "@/features/game-room/assets/cards/doctor.png";
import citizen from "@/features/game-room/assets/cards/citizen.png";

/** Decorative back face used for face-down cards. */
export const CARD_BACK_IMAGE: StaticImageData = cardBack;

/**
 * Map of role keys to their face image.
 * MAFIA_RIGHT_HAND reuses mafia.png by design (the role is produced by
 * promotion during `don_chooses_right_hand` and shares the mafia art).
 */
const ROLE_IMAGE_MAP: Record<string, StaticImageData> = {
  DON: don,
  MAFIA: mafia,
  MAFIA_RIGHT_HAND: mafia,
  SHOGUN: shogun,
  YAKUZA: yakuza,
  DETECTIVE: detective,
  DOCTOR: doctor,
  CITIZEN: citizen,
};

/**
 * Resolve the face image for a role.
 * Falls back to the back image when the role is unknown or null so callers
 * can always render an `<Image>` without conditional logic.
 */
export function getRoleImage(role: string | null | undefined): StaticImageData {
  if (!role) return CARD_BACK_IMAGE;
  return ROLE_IMAGE_MAP[role.toUpperCase()] ?? CARD_BACK_IMAGE;
}
