import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTP } from "./ResendOTP";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      verify: ResendOTP,
      reset: ResendOTPPasswordReset,
      profile(params) {
        return {
          email: params.email as string,
          name: (params.nickname as string) ?? "",
        };
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, args) {
      const db = ctx.db as any;

      if (args.type === "credentials" && args.existingUserId === null) {
        const user = await ctx.db.get(args.userId);
        const nickname = (user?.name as string) || "Player";
        const email = args.profile.email || (user?.email as string) || "";

        const existing = await db
          .query("profiles")
          .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
          .unique();

        if (!existing) {
          await db.insert("profiles", {
            userId: args.userId,
            email,
            nickname,
            verified: false,
          });
        }
      }

      if (args.type === "verification") {
        const profile = await db
          .query("profiles")
          .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
          .unique();

        if (profile) {
          await db.patch(profile._id, { verified: true });
        } else {
          const user = await ctx.db.get(args.userId);
          const nickname = (user?.name as string) || "Player";
          const email = args.profile.email || (user?.email as string) || "";

          await db.insert("profiles", {
            userId: args.userId,
            email,
            nickname,
            verified: true,
          });
        }
      }
    },
  },
});
