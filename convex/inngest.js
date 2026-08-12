import { query } from "./_generated/server";

export const getUsersWithOutstandingDebts = query({
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect()
        const result = []

        const expenses = await ctx.db
            .query("expenses")
            .filter((q) => q.eq(q.field("groupId") , undefined))
            .collect()

        const settlements = await ctx.db
            .query("settlements")
            .filter((q) => q.eq(q.field("groupId"), undefined))
            .collect()
        
        const userCache = new Map();

        const getUser = async(id) => {
            if(!userCache.has(id)) userCache.set(id , await ctx.db.get(id))
            return userCache.get(id)
        }

        for(const user of users) {
            const ledger = new Map() //Map<counterpartyid,{amaount: number, since:amount}>

            for(const exp of expenses){
                //case 1 : somebody else paid 
                if(exp.paidByUserId != user._id){
                    const split = exp.splits.find(
                        (s) => s.userId === user._id && !s.paid 
                    )
                    if(!split) continue

                    const entry = ledger.get(exp.paidByUserId) ?? {
                        amount: 0,
                        since: exp.date,
                    }
                    entry.amount += split.amount
                    entry.since = Math.min(entry.since,exp.date)
                    ledger.set(exp.paidByUserId,entry)
                }

                // case 2 : user paid
                else{
                    for(const s of exp.splits){
                        if(s.userId == user._id || s.paid) continue

                        const entry = ledger.get(s.userId) ?? {
                            amount: 0,
                            since: exp.date,
                        }
                        entry.amount -= s.amount
                        ledger.set(s.userId,entry)
                    }
                }
            }

            for(const st of settlements){
                //user paid someone
                if(st.paidByUserId === user._id){
                    const entry = ledger.get(st.receivedByUserId)
                    if(entry){
                        entry.amount -= st.amount
                        if(entry.amount == 0) ledger.delete(st.receivedByUserId)
                        else ledger.set(st.receivedByUserId,entry)
                    }
                }
                
                //someone paid to user
                else if(st.receivedByUserId === user._id){
                    const entry = ledger.get(st.paidByUserId)
                    if(entry){
                        entry.amount += st.amount
                        if(entry.amount === 0) ledger.delete(st.paidByUserId)
                        else ledger.set(st.paidByUserId,entry)
                    }
                }

            }

            const debts= []

            for(const [counterId , {amount , since}] of ledger) {
                if(amount > 0){
                    const counter = await getUser(counterId)
                    debts.push({
                        userId:counterId,
                        name:counter?.name ?? "Unknown",
                        amount,
                        since,
                    })
                }
            }

            if(debts.length){
                result.push({
                    _id : user._id,
                    name:user.name,
                    email: user.email,
                    debts,
                })
            }
        }
        return result
    }

})