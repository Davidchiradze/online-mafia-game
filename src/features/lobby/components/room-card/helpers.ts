import type { LobbyGame } from "@/features/lobby/components/LobbyContent";

export type SeatPlayer = LobbyGame["players"][number];

/** One position on the table ring — either a seated player or an empty seat. */
export type SeatSlot = {
  key: string;
  seatNumber: number;
  /** Avatar / leather-pad position, percent within the square table stage. */
  x: number;
  y: number;
  /** Chair position on the wider outer ring, percent within the stage. */
  chx: number;
  chy: number;
  /** Radial rotation transform shared by the chair and the leather seat pad. */
  radialTf: string;
  /**
   * Chair stacking: lower-half chairs sit in front of the rail (4), upper-half
   * chairs tuck behind it (1). The table rail itself sits at z-index 2.
   */
  chairZ: number;
  /** Leather-pad accent line color + its glow (red when a live player sits). */
  padAccent: string;
  padGlow: string;
  player?: SeatPlayer;
  dead: boolean;
};

/** Ring/shadow around a seated player's avatar. */
export const SEAT_RING =
  "0 0 0 2px rgba(255,255,255,0.16),0 4px 10px rgba(0,0,0,0.55)";

// Per-mode tint for the mode chip (background / border / text).
export const MODE_TINT: Record<
  string,
  { bg: string; border: string; color: string }
> = {
  city_mafia: {
    bg: "rgba(56,130,246,0.14)",
    border: "rgba(56,130,246,0.32)",
    color: "#93c5fd",
  },
  japanese_mafia: {
    bg: "rgba(244,63,94,0.14)",
    border: "rgba(244,63,94,0.32)",
    color: "#fda4af",
  },
  sports_mafia: {
    bg: "rgba(16,185,129,0.14)",
    border: "rgba(16,185,129,0.32)",
    color: "#6ee7b7",
  },
};
export const MODE_TINT_FALLBACK = {
  bg: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.14)",
  color: "#d1d5db",
};

// Foreshortened ellipse radii (percent of the square stage) that give the table
// its 3D perspective. Avatars/pads sit on the felt rim; chairs peek out past the
// rail on a wider ring.
const AV_RX = 33;
const AV_RY = 31;
const CH_RX = 40;
const CH_RY = 37;
// Rotate the first seat slightly right of top-center so no avatar sits dead-center
// behind the host crown.
const OFFSET_DEG = 15;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Places non-host players around the ring by seat number. The host is excluded
 * here (rendered in the middle of the table), so the ring holds exactly
 * `ringSeats` positions — the player seats (12 Japanese/City, 10 Sports).
 *
 * Each slot carries both an avatar/pad point (inner felt rim) and a chair point
 * (wider outer ring) plus a radial rotation, so the stage can render the leather
 * chairs and seat pads angled toward the center for a 3D table look.
 */
export function buildSeatRing(
  players: SeatPlayer[],
  hostId: LobbyGame["hostId"],
  ringSeats: number,
): SeatSlot[] {
  const bySeat = new Map<number, SeatPlayer>();
  for (const p of players) {
    if (p.playerId === hostId) continue; // host is centered, not on the ring
    if (p.seatNumber && p.seatNumber >= 1 && p.seatNumber <= ringSeats) {
      bySeat.set(p.seatNumber, p);
    }
  }

  return Array.from({ length: ringSeats }, (_, i) => {
    const deg = -90 + OFFSET_DEG + i * (360 / ringSeats);
    const a = (deg * Math.PI) / 180;
    const radialTf = `translate(-50%,-50%) rotate(${(deg + 90).toFixed(1)}deg)`;
    // Lower-half chairs sit in front of the rail; upper-half tuck behind it.
    const chairZ = Math.sin(a) > 0.15 ? 4 : 1;

    const p = bySeat.get(i + 1);
    const dead = !!p && p.isAlive === false;
    const live = !!p && !dead;

    return {
      key: p?.playerId ?? `empty-${i}`,
      seatNumber: i + 1,
      x: round2(50 + AV_RX * Math.cos(a)),
      y: round2(50 + AV_RY * Math.sin(a)),
      chx: round2(50 + CH_RX * Math.cos(a)),
      chy: round2(50 + CH_RY * Math.sin(a)),
      radialTf,
      chairZ,
      padAccent: live
        ? "rgba(239,68,68,0.85)"
        : dead
          ? "rgba(120,120,130,0.5)"
          : "rgba(255,255,255,0.12)",
      padGlow: live ? "rgba(239,68,68,0.6)" : "rgba(0,0,0,0)",
      player: p,
      dead,
    };
  });
}
