import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

type ChatRequestBody = { messages?: unknown };

const SYSTEM_PROMPT = `You are EcoBot, the friendly support assistant for EcoTrade — a waste collection and recycling platform.

About EcoTrade:
- Customers schedule waste pickups (paper, plastic, metal, e-waste, mixed) and choose a date, time and address.
- Vendors see open requests in real time, accept them, contact the customer, navigate to the address and collect the waste.
- Payment is **cash only**, paid by the vendor to the customer at the time of collection. EcoTrade does NOT process online payments, UPI, cards or wallets.
- Customers earn Eco Points (about 10 points per kg) which can be redeemed for rewards.

Help users with:
- How to schedule, edit, or cancel pickups
- Sorting / preparing waste
- Understanding pickup statuses (pending, accepted, on the way, arrived, collected, completed)
- Eco Points and rewards
- Vendor onboarding questions

Always remind users that **payment is in cash only at the time of pickup** if money or payment comes up. Keep answers short, warm and practical.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });
        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
