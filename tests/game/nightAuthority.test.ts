import { describe, it, expect } from "vitest";
import { japaneseNightAuthority } from "@/features/game-room/variants/japanese/nightAuthority";
import { sportsNightAuthority } from "@/features/game-room/variants/sports/nightAuthority";
import type { NightAuthorityInput } from "@/features/game-room/variants/core/types";
import { GamePhase } from "@/shared/lib/constants/game";

/**
 * CHARACTERIZATION TEST — night-action authority per variant (P4-T3).
 *
 * The Japanese cases pin the SINGLE-authority logic: the DON while alive, then
 * the living mafia in the LOWEST-numbered SEAT; SHOGUN > YAKUZA with a lone
 * SHOGUN unable to kill; DOCTOR heals; host never acts. The Sports cases pin the
 * §5 rule: EVERY living mafia acts during `mafia_chooses_target`, and there is
 * no yakuza/doctor.
 */

// A roster keyed by label → player. The label is the role unless `role` says
// otherwise, which is how a roster expresses two players holding MAFIA.
function makeInput(
  roster: Record<
    string,
    { id: string; alive?: boolean; seat?: number; role?: string }
  >,
  over: { viewerId: string; phase: string | null; isHost?: boolean },
): NightAuthorityInput {
  const players = Object.values(roster).map((r, i) => ({
    playerId: r.id,
    isAlive: r.alive ?? true,
    seatNumber: r.seat ?? i + 1,
  }));
  const roleOf = (id: string) => {
    const found = Object.entries(roster).find(([, r]) => r.id === id);
    if (!found) return null;
    const [label, entry] = found;
    return entry.role ?? label;
  };
  return {
    phase: over.phase,
    isHost: over.isHost ?? false,
    userId: over.viewerId,
    viewerRole: roleOf(over.viewerId),
    players,
    roleOf,
  };
}

describe("japaneseNightAuthority — single kill authority", () => {
  const roster = {
    DON: { id: "u1", seat: 3 },
    MAFIA_A: { id: "u2", seat: 1, role: "MAFIA" },
    MAFIA_B: { id: "u3", seat: 5, role: "MAFIA" },
    YAKUZA: { id: "u4", seat: 6 },
    SHOGUN: { id: "u5", seat: 7 },
    DOCTOR: { id: "u6", seat: 8 },
    CITIZEN: { id: "u7", seat: 9 },
  };

  it("mafia authority is the DON when alive", () => {
    const don = japaneseNightAuthority(
      makeInput(roster, { viewerId: "u1", phase: GamePhase.MAFIA_CHOOSES_TARGET }),
    );
    const mafia = japaneseNightAuthority(
      makeInput(roster, { viewerId: "u3", phase: GamePhase.MAFIA_CHOOSES_TARGET }),
    );
    expect(don.hasMafiaKillAuthority).toBe(true);
    expect(mafia.hasMafiaKillAuthority).toBe(false);
  });

  it("falls to the lowest living mafia seat once the DON is dead", () => {
    // DON sits at 3, between the living mafia at 1 and 5 — so the Don's seat
    // being higher than seat 1 must not push authority round to seat 5.
    const dead = { ...roster, DON: { id: "u1", seat: 3, alive: false } };
    const seat1 = japaneseNightAuthority(
      makeInput(dead, { viewerId: "u2", phase: GamePhase.MAFIA_CHOOSES_TARGET }),
    );
    const seat5 = japaneseNightAuthority(
      makeInput(dead, { viewerId: "u3", phase: GamePhase.MAFIA_CHOOSES_TARGET }),
    );
    expect(seat1.hasMafiaKillAuthority).toBe(true);
    expect(seat5.hasMafiaKillAuthority).toBe(false);
  });

  it("moves up to the next-lowest seat when the lowest mafia dies too", () => {
    const dead = {
      ...roster,
      DON: { id: "u1", seat: 3, alive: false },
      MAFIA_A: { id: "u2", seat: 1, role: "MAFIA", alive: false },
    };
    const seat5 = japaneseNightAuthority(
      makeInput(dead, { viewerId: "u3", phase: GamePhase.MAFIA_CHOOSES_TARGET }),
    );
    expect(seat5.hasMafiaKillAuthority).toBe(true);
  });

  it("SHOGUN kills when a YAKUZA is alive; a lone SHOGUN cannot", () => {
    const shogun = japaneseNightAuthority(
      makeInput(roster, {
        viewerId: "u5",
        phase: GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET,
      }),
    );
    expect(shogun.hasYakuzaKillAuthority).toBe(true);

    const noYakuza = { ...roster, YAKUZA: { id: "u4", alive: false } };
    const lone = japaneseNightAuthority(
      makeInput(noYakuza, {
        viewerId: "u5",
        phase: GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET,
      }),
    );
    expect(lone.hasYakuzaKillAuthority).toBe(false);
  });

  it("the DOCTOR heals; the host never has authority", () => {
    const doc = japaneseNightAuthority(
      makeInput(roster, { viewerId: "u6", phase: GamePhase.DOCTOR_HEALS_PLAYER }),
    );
    expect(doc.hasDoctorHealAuthority).toBe(true);

    const asHost = japaneseNightAuthority(
      makeInput(roster, {
        viewerId: "u1",
        phase: GamePhase.MAFIA_CHOOSES_TARGET,
        isHost: true,
      }),
    );
    expect(asHost.hasMafiaKillAuthority).toBe(false);
  });
});

describe("sportsNightAuthority — every living mafia acts", () => {
  const roster = {
    DON: { id: "u1" },
    MAFIA: { id: "u2" },
    DETECTIVE: { id: "u3" },
    CITIZEN: { id: "u4" },
  };

  it("both the DON and each living MAFIA have kill authority", () => {
    const don = sportsNightAuthority(
      makeInput(roster, { viewerId: "u1", phase: GamePhase.MAFIA_CHOOSES_TARGET }),
    );
    const mafia = sportsNightAuthority(
      makeInput(roster, { viewerId: "u2", phase: GamePhase.MAFIA_CHOOSES_TARGET }),
    );
    expect(don.hasMafiaKillAuthority).toBe(true);
    expect(mafia.hasMafiaKillAuthority).toBe(true); // NOT gated by priority
  });

  it("citizens have no authority; a dead mafia loses it", () => {
    const citizen = sportsNightAuthority(
      makeInput(roster, { viewerId: "u3", phase: GamePhase.MAFIA_CHOOSES_TARGET }),
    );
    expect(citizen.hasMafiaKillAuthority).toBe(false);

    const deadMafia = { ...roster, MAFIA: { id: "u2", alive: false } };
    const dead = sportsNightAuthority(
      makeInput(deadMafia, { viewerId: "u2", phase: GamePhase.MAFIA_CHOOSES_TARGET }),
    );
    expect(dead.hasMafiaKillAuthority).toBe(false);
  });

  it("has no yakuza or doctor authority, ever", () => {
    const a = sportsNightAuthority(
      makeInput(roster, { viewerId: "u1", phase: GamePhase.MAFIA_CHOOSES_TARGET }),
    );
    expect(a.hasYakuzaKillAuthority).toBe(false);
    expect(a.isYakuzaPhase).toBe(false);
    expect(a.hasDoctorHealAuthority).toBe(false);
    expect(a.isDoctorPhase).toBe(false);
  });
});
