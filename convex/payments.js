import { internal } from "./_generated/api";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const recordVerifiedPayment = mutation({
  args: {
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    amount: v.number(),
    currency: v.string(),

    paidByUserId: v.id("users"),
    receivedByUserId: v.id("users"),

    groupId: v.optional(v.id("groups")),
    note: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const caller = await ctx.runQuery(
      internal.users.getCurrentUser
    );

    if (args.amount <= 0) {
      throw new Error("Payment amount must be positive");
    }

    if (args.paidByUserId === args.receivedByUserId) {
      throw new Error("Payer and receiver cannot be the same");
    }

    if (
      caller._id !== args.paidByUserId &&
      caller._id !== args.receivedByUserId
    ) {
      throw new Error(
        "You must be either the payer or receiver"
      );
    }

    // Prevent duplicate payment recording
    const existingPayment = await ctx.db
      .query("paymentTransactions")
      .withIndex(
        "by_razorpay_order_id",
        (q) => q.eq(
          "razorpayOrderId",
          args.razorpayOrderId
        )
      )
      .first();

    if (existingPayment) {
      return existingPayment._id;
    }

    return await ctx.db.insert("paymentTransactions", {
      razorpayOrderId: args.razorpayOrderId,
      razorpayPaymentId: args.razorpayPaymentId,
      amount: args.amount,
      currency: args.currency,

      status: "verified",

      paidByUserId: args.paidByUserId,
      receivedByUserId: args.receivedByUserId,

      groupId: args.groupId,
      note: args.note,

      createdAt: Date.now(),
    });
  },
});