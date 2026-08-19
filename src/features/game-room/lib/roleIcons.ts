import type { StaticImageData } from "next/image";
import citizen from "@/shared/assets/icons/citizen.png";
import detective from "@/shared/assets/icons/detective.png";
import doctor from "@/shared/assets/icons/doctor.png";
import don from "@/shared/assets/icons/don.png";
import mafia from "@/shared/assets/icons/mafia.png";
import serialKiller from "@/shared/assets/icons/serialKiller.png";
import shogun from "@/shared/assets/icons/shogun.png";
import yakuza from "@/shared/assets/icons/yakuza.png";

/**
 * Role → standalone badge icon, for the tile sizes where a role *label* is too
 * small to read.
 *
 * Each icon is a self-contained coloured diamond on a transparent background
 * and already carries its faction's colour (black = mafia, purple = yakuza,
 * red = citizens), so callers render it bare — putting it on the text badge's
 * coloured pill would double the colour and clip the diamond's corners.
 *
 * Keyed on `string`, not the `ALL_ROLES` union: consumers receive a role as a
 * plain string off the server, and a role from a not-yet-iconned variant should
 * resolve to `undefined` for the caller to fall back on, not fail to compile in
 * a component that never names a role. `roleIcons.test.ts` asserts every role
 * in `ALL_ROLES` has an entry, which is what would otherwise go unnoticed.
 */
const ROLE_ICONS: Record<string, StaticImageData> = {
  CITIZEN: citizen,
  DETECTIVE: detective,
  DOCTOR: doctor,
  DON: don,
  MAFIA: mafia,
  SERIAL_KILLER: serialKiller,
  SHOGUN: shogun,
  YAKUZA: yakuza,
};

/** The badge icon for a role, or `undefined` when the role has no artwork. */
export function getRoleIcon(
  role: string | null | undefined,
): StaticImageData | undefined {
  if (!role) return undefined;
  return ROLE_ICONS[role.toUpperCase()];
}
