import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { paymentReminder} from "@/lib/inngest/payment-reminder";
import { spendingInsights } from "@/lib/inngest/spending-insights";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [paymentReminder,spendingInsights],
});