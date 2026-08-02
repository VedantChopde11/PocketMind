
import { createClerkClient } from "@clerk/backend";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

    const user = await ctx.db.query("users").withIndex("by_token" , (q) => 
      q.eq("tokenIdentifier" , identity.tokenIdentifier)
    ).unique()
    if(!user) {
        throw new Error("User Not Found")
      }
      return user
  }
})

export const searchUsers = query({
  args: {
    query: v.string(),
  },
  handler: async(ctx,args) => {
    const currentUser = await ctx.runQuery(internal.users.getCurrentUser)
    
    if(args.query.length < 2) 
      return []

    const nameResults = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .collect()
    
    const emailResults = await ctx.db
      .query("users")
      .withSearchIndex("search_email", (q) => q.search("email", args.query))
      .collect()

    const users = [
      ...nameResults,
      ...emailResults.filter(
        (email) => !nameResults.some((name) => name._id === email._id)
      ),
    ]

    return users
      .filter((user) => user._id !== currentUser._id)
      .map((user) => ({
        id: user._id,
        name:user.name,
        email: user.email,
        imageUrl: user.imageUrl,
      }))
  }
})