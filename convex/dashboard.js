import { internal } from "./_generated/api"
import { query } from "./_generated/server"

export const getUserBalances = query({
    handler: async(ctx) => {
        const user = await ctx.runQuery(internal.users.getCurrentUser)

        const expenses = (await ctx.db.query("expenses").collect()).filter(
            (e)=> 
                !e.groupId &&
                (e.paidByUserId === user._id || e.splits.some((s) => s.userId === user._id)) 
        )

        let youOwe = 0
        let youAreOwed = 0
        const balanceByUser = {}

        for (const e of expenses) {
            const isPayer = e.paidByUserId === user._id
            const mySplit = e.splits.find((s) => s.userId === user._id)

            if(isPayer){
                for(const s of e.splits){
                    if(s.userId === user._id || s.paid) continue

                    youAreOwed+= s.amount;

                    (balanceByUser[s.userId] ??= {owed:0, owing: 0}).owed += s.amount;
                } 
            }
            else if(mySplit && !mySplit.paid){
                youOwe += mySplit.amount;

                (balanceByUser[e.paidByUserId] ??= {owed: 0, owing: 0}).owing += mySplit.amount;
            }
        }
       
        const settlements = (await ctx.db.query("settlements").collect()).filter(
            (s) => 
                !s.groupId &&
                (s.paidByUserId === user._id || s.receivedByUserId === user._id)
        )

        for(const s of settlements){
            if(s.paidByUserId === user._id){
                youOwe -= s.amount;
                (balanceByUser[s.paidByUserId] ??= {owed:0 , owing: 0}).owed -= s.amount;
            }
        }

        const youOweList = []
        const youAreOwedByList = []

        for(const [uid,{owed,owing}] of Object.entries(balanceByUser)){
            const net = owed - owing
            if(net === 0) continue

            const counterpart = await ctx.db.get(uid)
            const base = {
                userId: uid,
                name: counterpart?.name ?? "unknown",
                imageUrl: counterpart?.imageUrl,
                amount: Math.abs(net)
            }
            net > 0 ? youAreOwedByList.push(base) : youOweList.push(base)

        }
        
        youOweList.sort((a,b) => b.amount - a.amount)
        youAreOwedByList.sort((a,b) => b.amount - a.amount)

        return {
            youOwe,
            youAreOwed,
            totalBalance: youAreOwed-youOwe,
            oweDetails: {youOwe: youOweList, youAreOwedBy: youAreOwedByList},
        }
    }
})

export const getTotalSpent = query({
    handler: async(ctx) => {
        const user = await ctx.runQuery(internal.users.getCurrentUser)

        const currentYear = new Date().getFullYear()
        const startOfYear = new Date(currentYear,0,1).getTime()

        const expenses = await ctx.db
            .query("expenses")
            .withIndex("by_date",(q) => q.gte("date",startOfYear)).collect()
        
        const userExpenses = expenses.filter(
            (expense) => 
                expense.paidByUserId === user._id ||
                expense.splits.some((split) => split.userId === user._id)
        )
        let totalSpent = 0
        userExpenses.forEach((expense) => {
            const userSplit = expense.splits.find(
               (split) => split.userId === user._id
            )

            if(userSplit){
                totalSpent += userSplit.amount
            }
        })
        return totalSpent
    }
})

export const getMonthlySpending = query({
    handler: async (ctx) => {
        const user = await ctx.runQuery(internal.users.getCurrentUser)

        const currentYear = new Date().getFullYear()
        const startOfYear = new Date(currentYear,0,1).getTime()

        const allExpenses = await ctx.db
            .query("expenses")
            .withIndex("by_date" , (q)=> q.gte("date" , startOfYear))
            .collect()

        const userExpenses = allExpenses.filter(
            (expense) => 
                expense.paidByUserId === user._id ||
                expense.splits.some((split) => split.userId === user._id)
        )

        const monthlyTotals = {}

        for(let i = 0; i < 12; i++){
            const monthDate = new Date(currentYear,i,1)
            monthlyTotals[monthDate.getTime()] = 0
        }

        userExpenses.forEach((expense) => {
            const date = new Date(expense.date)

            const monthStart = new Date(
                date.getFullYear(),
                date.getMonth(),
                1
            ).getTime()

            const userSplit = expense.splits.find(
                (split) => split.userId === user._id
            )

            if(userSplit){
                monthlyTotals[monthStart] = (monthlyTotals[monthStart] || 0) + userSplit.amount
            }
        })
        const result = Object.entries(monthlyTotals).map(([monthStart,total]) => ({
                month: parseInt(monthStart),
                total,
            }))

            result.sort((a,b) => a.month - b.month)

            return result
    }
})


export const getUserGroups = query({
  handler: async (ctx) => {
    const user = await ctx.runQuery(internal.users.getCurrentUser);

   
    const allGroups = await ctx.db.query("groups").collect();

    
    const groups = allGroups.filter((group) =>
      group.members.some((member) => member.userId === user._id)
    );

    
    const enhancedGroups = await Promise.all(
      groups.map(async (group) => {
        
        const expenses = await ctx.db
          .query("expenses")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();

        let balance = 0;

        expenses.forEach((expense) => {
          if (expense.paidByUserId === user._id) {
            
            expense.splits.forEach((split) => {
              if (split.userId !== user._id && !split.paid) {
                balance += split.amount;
              }
            });
          } else {
          
            const userSplit = expense.splits.find(
              (split) => split.userId === user._id
            );
            if (userSplit && !userSplit.paid) {
              balance -= userSplit.amount;
            }
          }
        });

        
        const settlements = await ctx.db
          .query("settlements")
          .filter((q) =>
            q.and(
              q.eq(q.field("groupId"), group._id),
              q.or(
                q.eq(q.field("paidByUserId"), user._id),
                q.eq(q.field("receivedByUserId"), user._id)
              )
            )
          )
          .collect();

        settlements.forEach((settlement) => {
          if (settlement.paidByUserId === user._id) {
          
            balance += settlement.amount;
          } else {
           
            balance -= settlement.amount;
          }
        });

        return {
          ...group,
          id: group._id,
          balance,
        };
      })
    );

    return enhancedGroups;
    }
})

// export const getUserGroup = query({
//     handler: async (ctx) => {
//         const user = await ctx.runQuery(internal.users.getCurrentUser)

//         const allGroups = await ctx.db.query("groups").collect()

//         const groups = allGroups.filter((group) => group.members.some((member) => member.userId === user._id))

//         const enhancedGroups = await Promise.all(
//             groups.map(async (group) => {
                
//                 const expenses = await ctx.db
//                     .query("expenses")
//                     .withIndex("by_group", (q) => q.eq("groupId", group._id))
//                     .collect();

                
//                 const balances = {};

//                 group.members.forEach((member) => {
//                     balances[member.userId] = 0;
//                 });

               
//                 expenses.forEach((expense) => {
//                     expense.splits.forEach((split) => {
//                         if (split.userId === expense.paidByUserId || split.paid) return;

//                         balances[expense.paidByUserId] += split.amount;
//                         balances[split.userId] -= split.amount;
//                     });
//                 });

                
//                 const settlements = await ctx.db
//                     .query("settlements")
//                     .withIndex("by_group", (q) => q.eq("groupId", group._id))
//                     .collect();

//                 settlements.forEach((settlement) => {
//                     balances[settlement.paidByUserId] += settlement.amount;
//                     balances[settlement.receivedByUserId] -= settlement.amount;
//                 });

                
//                 const creditors = [];
//                 const debtors = [];

//                 for (const [userId, balance] of Object.entries(balances)) {
//                     if (balance > 0) {
//                         creditors.push({ userId, amount: balance });
//                     } else if (balance < 0) {
//                         debtors.push({ userId, amount: -balance });
//                     }
//                 }

                
//                 const users= {};

//                 await Promise.all(
//                     group.members.map(async (member) => {
//                         users[member.userId] = await ctx.db.get(member.userId);
//                     })
//                 );

                
//                 const settlementList = [];

//                 let i = 0;
//                 let j = 0;

//                 while (i < debtors.length && j < creditors.length) {
//                     const amount = Math.min(
//                         debtors[i].amount,
//                         creditors[j].amount
//                     );

//                     settlementList.push({
//                         from: {
//                             id: debtors[i].userId,
//                             name: users[debtors[i].userId]?.name ?? "Unknown",
//                             imageUrl: users[debtors[i].userId]?.imageUrl,
//                         },
//                         to: {
//                             id: creditors[j].userId,
//                             name: users[creditors[j].userId]?.name ?? "Unknown",
//                             imageUrl: users[creditors[j].userId]?.imageUrl,
//                         },
//                         amount,
//                     });

//                     debtors[i].amount -= amount;
//                     creditors[j].amount -= amount;

//                     if (debtors[i].amount === 0) i++;
//                     if (creditors[j].amount === 0) j++;
//                 }

               
//                 const balance = balances[user._id] ?? 0;

//                 return {
//                     ...group,
//                     id: group._id,
//                     balance,
//                     balances,
//                     settlements: settlementList,
//                 };
//             })
//         );

//         return enhancedGroups;
//     }
// })