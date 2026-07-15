import { describe, it, expect } from "vitest";
import { japaneseNightAuthority } from "@/game/japanese/nightAuthority";
import { sportsNightAuthority } from "@/game/sports/nightAuthority";
import type { NightAuthorityInput } from "@/game/core/types";

/**
 * CHARACTERIZATION TEST — night-action authority per variant (P4-T3).
 *
 * The Japanese cases pin the SINGLE-authority logic extracted verbatim from the
 * old `useNightActionAuthority` (DON > MAFIA_RIGHT_HAND > MAFIA; SHOGUN > YAKUZA
 * with a lone SHOGUN unable to kill; DOCTOR heals; host never acts). The Sports
 * cases pin the §5 rule: EVERY living mafia acts during `mafia_chooses_target`,
 * and there is no yakuza/doctor.
 */

// A roster keyed by role → playerId, with an alive map.
function makeInput(
  roster: Record<string, { id: string; alive?: boolean }>,
  over: { viewerId: string; phase: string | null; isHost?: boolean },
): NightAuthorityInput {
  const players = Object.values(roster).map((r) => ({
    playerId: r.id,
    isAlive: r.alive ?? true,
  }));
  const roleOf = (id: string) =>
    Object.entries(roster).find(([, r]) => r.id === id)?.[0] ?? null;
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
    DON: { id: "u1" },
    MAFIA_RIGHT_HAND: { id: "u2" },
    MAFIA: { id: "u3" },
    YAKUZA: { id: "u4" },
    SHOGUN: { id: "u5" },
    DOCTOR: { id: "u6" },
    CITIZEN: { id: "u7" },
  };

  it("mafia authority is the DON when alive", () => {
    const don = japaneseNightAuthority(
      makeInput(roster, { viewerId: "u1", phase: "mafia_chooses_target" }),
    );
    const mafia = japaneseNightAuthority(
      makeInput(roster, { viewerId: "u3", phase: "mafia_chooses_target" }),
    );
    expect(don.hasMafiaKillAuthority).toBe(true);
    expect(mafia.hasMafiaKillAuthority).toBe(false);
  });

  it("falls to the RIGHT_HAND when the DON is dead", () => {
    const dead = { ...roster, DON: { id: "u1", alive: false } };
    const rh = japaneseNightAuthority(
      makeInput(dead, { viewerId: "u2", phase: "mafia_chooses_target" }),
    );
    expect(rh.hasMafiaKillAuthority).toBe(true);
  });

  it("SHOGUN kills when a YAKUZA is alive; a lone SHOGUN cannot", () => {
    const shogun = japaneseNightAuthority(
      makeInput(roster, {
        viewerId: "u5",
        phase: "yakuza_and_shogun_chooses_target",
      }),
    );
    expect(shogun.hasYakuzaKillAuthority).toBe(true);

    const noYakuza = { ...roster, YAKUZA: { id: "u4", alive: false } };
    const lone = japaneseNightAuthority(
      makeInput(noYakuza, {
        viewerId: "u5",
        phase: "yakuza_and_shogun_chooses_target",
      }),
    );
    expect(lone.hasYakuzaKillAuthority).toBe(false);
  });

  it("the DOCTOR heals; the host never has authority", () => {
    const doc = japaneseNightAuthority(
      makeInput(roster, { viewerId: "u6", phase: "doctor_heals_player" }),
    );
    expect(doc.hasDoctorHealAuthority).toBe(true);

    const asHost = japaneseNightAuthority(
      makeInput(roster, {
        viewerId: "u1",
        phase: "mafia_chooses_target",
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
      makeInput(roster, { viewerId: "u1", phase: "mafia_chooses_target" }),
    );
    const mafia = sportsNightAuthority(
      makeInput(roster, { viewerId: "u2", phase: "mafia_chooses_target" }),
    );
    expect(don.hasMafiaKillAuthority).toBe(true);
    expect(mafia.hasMafiaKillAuthority).toBe(true); // NOT gated by priority
  });

  it("citizens have no authority; a dead mafia loses it", () => {
    const citizen = sportsNightAuthority(
      makeInput(roster, { viewerId: "u3", phase: "mafia_chooses_target" }),
    );
    expect(citizen.hasMafiaKillAuthority).toBe(false);

    const deadMafia = { ...roster, MAFIA: { id: "u2", alive: false } };
    const dead = sportsNightAuthority(
      makeInput(deadMafia, { viewerId: "u2", phase: "mafia_chooses_target" }),
    );
    expect(dead.hasMafiaKillAuthority).toBe(false);
  });

  it("has no yakuza or doctor authority, ever", () => {
    const a = sportsNightAuthority(
      makeInput(roster, { viewerId: "u1", phase: "mafia_chooses_target" }),
    );
    expect(a.hasYakuzaKillAuthority).toBe(false);
    expect(a.isYakuzaPhase).toBe(false);
    expect(a.hasDoctorHealAuthority).toBe(false);
    expect(a.isDoctorPhase).toBe(false);
  });
});
