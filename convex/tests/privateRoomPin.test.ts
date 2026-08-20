// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { verifyGamePin } from "../lib/games";

/**
 * CONVEX-TEST INTEGRATION — the private-room PIN gate.
 *
 * SILENT FAILURE MODE: `games.pin` is a secret sitting on a document that
 * `lobby/games:getById` used to publish with a bare `{ ...game }` spread. A
 * leaked PIN breaks nothing visibly — the room still works, it is just no
 * longer private. `tsc` cannot see it either, because the leak is a widened
 * return type, not an error. So the "no PIN in a non-host projection" case
 * below is the only thing standing between the spread and a silent regression.
 *
 * The throttle is tested against `verifyGamePin` directly: it is the shared
 * helper both the player and the spectator entry points call, so covering it
 * once covers both.
 */

const modules = import.meta.glob("../**/*.*s");

const HOST = "host-account";
const OTHER = "other-account";

/** A synced, verified, subscribed profile — the shape `requireFeature` wants. */
function seedProfile(
  t: TestConvex<typeof schema>,
  accountId: string,
  nickname: string,
) {
  return t.run((ctx) =>
    ctx.db.insert("profiles", {
      accountId,
      nickname,
      verified: true,
      subscription: { packageId: 3, active: true },
      createdAt: 0,
      updatedAt: 0,
    }),
  );
}

async function setup() {
  const t = convexTest(schema, modules);
  await seedProfile(t, HOST, "Host");
  await seedProfile(t, OTHER, "Other");
  return {
    t,
    host: t.withIdentity({ subject: HOST }),
    other: t.withIdentity({ subject: OTHER }),
  };
}

/** The `code` property of the thrown `ConvexError`'s data payload. */
async function errorCode(run: Promise<unknown>): Promise<string> {
  try {
    await run;
  } catch (err) {
    const data = (err as { data?: { code?: string } }).data;
    return data?.code ?? String(err);
  }
  throw new Error("expected the call to throw");
}

describe("private room PIN — create & update", () => {
  it("refuses to create a private room without a PIN", async () => {
    const { host } = await setup();
    const code = await errorCode(
      host.mutation(api.lobby.games.create, {
        name: "Locked",
        gameType: "sports_mafia",
        isPrivate: true,
      }),
    );
    expect(code).toBe("GAME_PIN_REQUIRED");
  });

  it("refuses a PIN that is not exactly 4 digits", async () => {
    const { host } = await setup();
    for (const pin of ["123", "12345", "12a4", ""]) {
      const code = await errorCode(
        host.mutation(api.lobby.games.create, {
          name: "Locked",
          gameType: "sports_mafia",
          isPrivate: true,
          pin,
        }),
      );
      // An empty string is falsy, so it trips the "needs a PIN" gate first.
      expect(code).toBe(pin === "" ? "GAME_PIN_REQUIRED" : "GAME_PIN_INVALID");
    }
  });

  it("stores the PIN for a private room and none for a public one", async () => {
    const { t, host } = await setup();
    const privateId = await host.mutation(api.lobby.games.create, {
      name: "Locked",
      gameType: "sports_mafia",
      isPrivate: true,
      pin: "4821",
    });
    // A PIN sent for a public room is ignored, not stored.
    const publicId = await host.mutation(api.lobby.games.create, {
      name: "Open",
      gameType: "sports_mafia",
      isPrivate: false,
      pin: "4821",
    });

    const [priv, pub] = await t.run(async (ctx) => [
      await ctx.db.get(privateId),
      await ctx.db.get(publicId),
    ]);
    expect(priv?.pin).toBe("4821");
    expect(pub?.pin).toBeUndefined();
  });

  it("clears the PIN when the host switches the room to public", async () => {
    const { t, host } = await setup();
    const gameId = await host.mutation(api.lobby.games.create, {
      name: "Locked",
      gameType: "sports_mafia",
      isPrivate: true,
      pin: "4821",
    });

    await host.mutation(api.lobby.games.update, { gameId, isPrivate: false });
    expect((await t.run((ctx) => ctx.db.get(gameId)))?.pin).toBeUndefined();

    // Going private again needs a fresh PIN — the old one is gone.
    const code = await errorCode(
      host.mutation(api.lobby.games.update, { gameId, isPrivate: true }),
    );
    expect(code).toBe("GAME_PIN_REQUIRED");

    await host.mutation(api.lobby.games.update, {
      gameId,
      isPrivate: true,
      pin: "1357",
    });
    expect((await t.run((ctx) => ctx.db.get(gameId)))?.pin).toBe("1357");
  });

  it("renames a private room without resending the PIN", async () => {
    const { t, host } = await setup();
    const gameId = await host.mutation(api.lobby.games.create, {
      name: "Locked",
      gameType: "sports_mafia",
      isPrivate: true,
      pin: "4821",
    });
    await host.mutation(api.lobby.games.update, { gameId, name: "Renamed" });
    const game = await t.run((ctx) => ctx.db.get(gameId));
    expect(game?.name).toBe("Renamed");
    expect(game?.pin).toBe("4821");
  });
});

describe("private room PIN — who can read it", () => {
  it("never returns the PIN from getById, for the host or anyone else", async () => {
    const { host, other } = await setup();
    const gameId = await host.mutation(api.lobby.games.create, {
      name: "Locked",
      gameType: "sports_mafia",
      isPrivate: true,
      pin: "4821",
    });

    for (const as of [host, other]) {
      const game = await as.query(api.lobby.games.getById, { gameId });
      expect(game).not.toBeNull();
      expect(game).not.toHaveProperty("pin");
    }
  });

  it("omits the PIN from the guest-readable lobby list", async () => {
    const { t, host } = await setup();
    await host.mutation(api.lobby.games.create, {
      name: "Locked",
      gameType: "sports_mafia",
      isPrivate: true,
      pin: "4821",
    });
    const rooms = await t.query(api.lobby.games.list, {});
    expect(rooms).toHaveLength(1);
    expect(rooms[0]).not.toHaveProperty("pin");
  });

  it("returns the PIN to the host and refuses everyone else", async () => {
    const { host, other } = await setup();
    const gameId = await host.mutation(api.lobby.games.create, {
      name: "Locked",
      gameType: "sports_mafia",
      isPrivate: true,
      pin: "4821",
    });

    expect(await host.query(api.lobby.games.getPin, { gameId })).toBe("4821");
    expect(
      await errorCode(other.query(api.lobby.games.getPin, { gameId })),
    ).toBe("HOST_ONLY");
  });

  it("returns null for a public room", async () => {
    const { host } = await setup();
    const gameId = await host.mutation(api.lobby.games.create, {
      name: "Open",
      gameType: "sports_mafia",
      isPrivate: false,
    });
    expect(await host.query(api.lobby.games.getPin, { gameId })).toBeNull();
  });
});

describe("verifyGamePin", () => {
  /** Seeds a private room and returns a runner bound to the joiner. */
  async function pinFixture() {
    const { t, host } = await setup();
    const gameId = await host.mutation(api.lobby.games.create, {
      name: "Locked",
      gameType: "sports_mafia",
      isPrivate: true,
      pin: "4821",
    });
    const joinerId = (await t.run((ctx) =>
      ctx.db
        .query("profiles")
        .withIndex("by_accountId", (q) => q.eq("accountId", OTHER))
        .unique(),
    ))!._id as Id<"profiles">;

    const attempt = (pin: string | undefined) =>
      t.run(async (ctx) => {
        const game = (await ctx.db.get(gameId))!;
        return await verifyGamePin(ctx.db, game, joinerId, pin);
      });

    return { t, gameId, joinerId, attempt };
  }

  it("passes on the right PIN and rejects the wrong one", async () => {
    const { attempt } = await pinFixture();
    expect(await attempt("4821")).toBe("ok");
    expect(await attempt("1111")).toBe("wrong");
    expect(await attempt(undefined)).toBe("wrong");
  });

  it("is a no-op for a public room", async () => {
    const { t } = await setup();
    const hostId = (await t.run((ctx) =>
      ctx.db
        .query("profiles")
        .withIndex("by_accountId", (q) => q.eq("accountId", HOST))
        .unique(),
    ))!._id;
    const gameId = await t.run((ctx) =>
      ctx.db.insert("games", {
        code: "OPEN01",
        name: "Open",
        hostId,
        gameType: "sports_mafia",
        gameStatus: "not_started",
        maxPlayers: 10,
        isPrivate: false,
      }),
    );
    const verdict = await t.run(async (ctx) => {
      const game = (await ctx.db.get(gameId))!;
      return await verifyGamePin(ctx.db, game, hostId, undefined);
    });
    expect(verdict).toBe("ok");
  });

  it("locks the user out after 5 wrong PINs and clears the count on success", async () => {
    const { t, gameId, attempt } = await pinFixture();

    for (let i = 0; i < 5; i++) {
      expect(await attempt("1111")).toBe("wrong");
    }
    // The 6th try is refused without even comparing — a correct PIN is
    // rejected too, which is the point of the throttle.
    expect(await attempt("4821")).toBe("locked");

    // Expire the window; the right PIN then works and wipes the counter.
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("gamePinAttempts")
        .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
        .unique();
      await ctx.db.patch(row!._id, { lastFailedAt: Date.now() - 10 * 60_000 });
    });
    expect(await attempt("4821")).toBe("ok");

    const rows = await t.run((ctx) =>
      ctx.db
        .query("gamePinAttempts")
        .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
        .collect(),
    );
    expect(rows).toHaveLength(0);
  });

  it("treats a private room with no PIN as locked, not open", async () => {
    const { t } = await setup();
    const hostId = (await t.run((ctx) =>
      ctx.db
        .query("profiles")
        .withIndex("by_accountId", (q) => q.eq("accountId", HOST))
        .unique(),
    ))!._id;
    // A row from before this feature existed.
    const gameId = await t.run((ctx) =>
      ctx.db.insert("games", {
        code: "LEGACY",
        name: "Legacy private",
        hostId,
        gameType: "sports_mafia",
        gameStatus: "not_started",
        maxPlayers: 10,
        isPrivate: true,
      }),
    );
    const verdict = await t.run(async (ctx) => {
      const game = (await ctx.db.get(gameId))!;
      return await verifyGamePin(ctx.db, game, hostId, "4821");
    });
    expect(verdict).toBe("unset");
  });

  it("deletes attempt rows with the game", async () => {
    const { t, gameId, attempt } = await pinFixture();
    expect(await attempt("1111")).toBe("wrong");
    expect(
      await t.run((ctx) => ctx.db.query("gamePinAttempts").collect()),
    ).toHaveLength(1);

    const host = t.withIdentity({ subject: HOST });
    await host.mutation(api.lobby.games.remove, { gameId });
    expect(
      await t.run((ctx) => ctx.db.query("gamePinAttempts").collect()),
    ).toHaveLength(0);
  });
});
