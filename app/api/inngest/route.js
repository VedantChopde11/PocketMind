import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { paymentReminder} from "@/lib/inngest/payment-reminder";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [paymentReminder,],
});