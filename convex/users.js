
import { createClerkClient } from "@clerk/backend";
import { mutation, query } from "./_generated/server";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (user) return user._id;

    return await ctx.db.insert("users", {
      name: identity.name ?? "Anonymous",
      email: identity.email,
      imageUrl: identity.pictureUrl,
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});

export const getCurrentUser= query({
  handler: async(ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if(!identity) {
      throw new Error("Not Authentcated")
    }

    const user = await ctx.db.query("users").withIndex("by_token" , (q) => {
      q.eq("tokenIdentifier" , identity.tokenIdentifier).first()
      if(!user) {
        throw new Error("User Not Found")
      }
      return user
    })
  }
})