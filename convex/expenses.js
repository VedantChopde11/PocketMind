import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const getExpensesBetweenUsers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    if (me._id === userId) throw new Error("Cannot query yourself");

    
    const myPaid = await ctx.db
      .query("expenses")
      .withIndex("by_user_and_group", (q) =>
        q.eq("paidByUserId", me._id).eq("groupId", undefined)
      )
      .collect();

    const theirPaid = await ctx.db
      .query("expenses")
      .withIndex("by_user_and_group", (q) =>
        q.eq("paidByUserId", userId).eq("groupId", undefined)
      )
      .collect();

    
    const candidateExpenses = [...myPaid, ...theirPaid];

    
    const expenses = candidateExpenses.filter((e) => {
      
      const meInSplits = e.splits.some((s) => s.userId === me._id);
      const themInSplits = e.splits.some((s) => s.userId === userId);

      const meInvolved = e.paidByUserId === me._id || meInSplits;
      const themInvolved = e.paidByUserId === userId || themInSplits;

      return meInvolved && themInvolved;
    });

    expenses.sort((a, b) => b.date - a.date);

   
    const settlements = await ctx.db
      .query("settlements")
      .filter((q) =>
        q.and(
          q.eq(q.field("groupId"), undefined),
          q.or(
            q.and(
              q.eq(q.field("paidByUserId"), me._id),
              q.eq(q.field("receivedByUserId"), userId)
            ),
            q.and(
              q.eq(q.field("paidByUserId"), userId),
              q.eq(q.field("receivedByUserId"), me._id)
            )
          )
        )
      )
      .collect();

    settlements.sort((a, b) => b.date - a.date);

  
    let balance = 0;

    for (const e of expenses) {
      if (e.paidByUserId === me._id) {
        const split = e.splits.find((s) => s.userId === userId && !s.paid);
        if (split) balance += split.amount; 
      } else {
        const split = e.splits.find((s) => s.userId === me._id && !s.paid);
        if (split) balance -= split.amount; 
      }
    }

    for (const s of settlements) {
      if (s.paidByUserId === me._id)
        balance += s.amount;
      else balance -= s.amount;
    }

    
    const other = await ctx.db.get(userId);
    if (!other) throw new Error("User not found");

    return {
      expenses,
      settlements,
      otherUser: {
        id: other._id,
        name: other.name,
        email: other.email,
        imageUrl: other.imageUrl,
      },
      balance,
    };
  },
});


export const deleteExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    
    const user = await ctx.runQuery(internal.users.getCurrentUser);

   
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }

   
    if (expense.createdBy !== user._id && expense.paidByUserId !== user._id) {
      throw new Error("You don't have permission to delete this expense");
    }

  
    const allSettlements = await ctx.db.query("settlements").collect();

    const relatedSettlements = allSettlements.filter(
      (settlement) =>
        settlement.relatedExpenseIds !== undefined &&
        settlement.relatedExpenseIds.includes(args.expenseId)
    );

    for (const settlement of relatedSettlements) {
     
      const updatedRelatedExpenseIds = settlement.relatedExpenseIds.filter(
        (id) => id !== args.expenseId
      );

      if (updatedRelatedExpenseIds.length === 0) {
        
        await ctx.db.delete(settlement._id);
      } else {
     
        await ctx.db.patch(settlement._id, {
          relatedExpenseIds: updatedRelatedExpenseIds,
        });
      }
    }

    
    await ctx.db.delete(args.expenseId);

    return { success: true };
  },
});