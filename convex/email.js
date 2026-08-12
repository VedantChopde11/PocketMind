import { v } from "convex/values";
import { action } from "./_generated/server";
import { Resend } from "resend";

export const sentEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
    apiKey: v.string(),
  },

  handler: async (ctx, args) => {
    const resend = new Resend(args.apiKey);

    console.log("SENDING EMAIL TO:", args.to);

    const { data, error } = await resend.emails.send({
      from: "PocketMind <onboarding@resend.dev>",
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });

    if (error) {
      console.error("RESEND ERROR:", error);

      return {
        success: false,
        error: error.message,
      };
    }

    console.log("RESEND SUCCESS:", data);

    return {
      success: true,
      id: data?.id,
    };
  },
});




// import { v } from "convex/values";
// import { action } from "./_generated/server";
// import {Resend} from "resend"

// export const sentEmail = action({
//     args: {
//         to:v.string(),
//         subject: v.string(),
//         html:v.string(),
//         text:v.optional(v.string()),
//         apiKey: v.string()
//     },
//     handler: async(ctx,args) => {
//         const resend = new Resend(args.apiKey)

//         try{
//             const result = await resend.emails.send({
//                 from:"PocketMind <onboarding@resend.dev>",
//                 to: args.to,
//                 subject: args.subject,
//                 html: args.html,
//                 text: args.text,
//             })

//             return {success: true, id:result.id}
//         }
//         catch(error){
//             console.error("Failed to send email:",error)
//             return {success:false,error:error.message}
//         }

//     }
// })