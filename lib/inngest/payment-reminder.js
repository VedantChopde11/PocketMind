import { api } from "@/convex/_generated/api";
import { inngest } from "./client";
import { ConvexHttpClient } from "convex/browser";


const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)

export const paymentReminder = inngest.createFunction(
  {
    id: "send-payment-reminders",
    triggers: {
      cron: "0 10 * * *",
    },
  },
  async({step}) => {
    const users = await step.run("fetch-debts" , () => 
      convex.query(api.inngest.getUsersWithOutstandingDebts)  
    )

    const results = await step.run("send-emails" , async () =>{
      return Promise.all(
        users.map(async (u) => {
          
          const rows = u.debts 
            .map(
              (d) => `
                <tr>
                  <td style="padding:4px 8px;" >${d.name} </td>
                  <td style="padding:4px 8px;" >${d.amount.toFixed(2)}</td>
                </tr>
              `
            ).join("")

            if(!rows) return {userId: u._id, skipped: true}

            const html = `
              <h2>PocketMind - Payment Reminder</h2>
              <p>Hi ${u.name}, you have the following outstanding balances:</p>
              <table cellspacing="0" cellpadding="0" border="1" style="border-collapse:collapse;">
                <thead>
                  <tr><th>To</th><th>Amount</th></tr>
                <thead>
                <tbody>${rows}</tbody>
              </table>
              <p>Please settle up soon. Thanks!</p>
            `;

            
            const result = await convex.action(
              api.email.sentEmail,
              {
                to: u.email,
                subject: "You have pending payments on PocketMind",
                html,
                apiKey: process.env.RESEND_API_KEY,
              }
            );

            console.log("EMAIL RESULT:", u.email, result);

            return {
              userId: u._id,
              email: u.email,
              ...result,
            };
            
        })
      )
    })
    return {
      processed: results.length,
      successes: results.filter((r) => r.success).length,
      failures: results.filter((r) => r.success === false).length, 
    }

  }
)