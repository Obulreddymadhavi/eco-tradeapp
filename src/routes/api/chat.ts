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

        const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;
        const lovableKey = process.env.LOVABLE_API_KEY;

        // 1. Google Gemini Provider
        if (geminiKey) {
          try {
            const { google } = await import("@ai-sdk/google");
            const result = streamText({
              model: google("gemini-1.5-flash"),
              system: SYSTEM_PROMPT,
              messages: await convertToModelMessages(messages as UIMessage[]),
            });
            return result.toUIMessageStreamResponse({
              originalMessages: messages as UIMessage[],
            });
          } catch (err) {
            console.error("Gemini stream error:", err);
          }
        }

        // 2. OpenAI Provider
        if (openaiKey) {
          try {
            const { openai } = await import("@ai-sdk/openai");
            const result = streamText({
              model: openai("gpt-4o-mini"),
              system: SYSTEM_PROMPT,
              messages: await convertToModelMessages(messages as UIMessage[]),
            });
            return result.toUIMessageStreamResponse({
              originalMessages: messages as UIMessage[],
            });
          } catch (err) {
            console.error("OpenAI stream error:", err);
          }
        }

        // 3. Lovable Provider (Default)
        if (lovableKey) {
          try {
            const gateway = createLovableAiGatewayProvider(lovableKey);
            const result = streamText({
              model: gateway("google/gemini-3-flash-preview"),
              system: SYSTEM_PROMPT,
              messages: await convertToModelMessages(messages as UIMessage[]),
            });
            return result.toUIMessageStreamResponse({
              originalMessages: messages as UIMessage[],
            });
          } catch (err) {
            console.error("Lovable gateway stream error:", err);
          }
        }

        // 4. Mock Stream Fallback for Local Testing
        const responseText = getMockResponse(messages as UIMessage[]);
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const chunks = responseText.match(/.{1,4}/g) || [responseText];
            for (const chunk of chunks) {
              controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
              await new Promise((resolve) => setTimeout(resolve, 25));
            }
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "x-vercel-ai-stream-protocol": "v1",
          },
        });
      },
    },
  },
});

function getMockResponse(messages: UIMessage[]): string {
  const lastMessage = messages[messages.length - 1];
  const query = (typeof lastMessage?.content === "string" ? lastMessage.content : "").toLowerCase();

  if (query.includes("point") || query.includes("earn") || query.includes("balance")) {
    return "You earn 10 Eco Points for every kilogram of waste collected by our vendors. These points can be redeemed in the Rewards tab for gift vouchers, saplings, and eco-friendly products!";
  }
  if (query.includes("pay") || query.includes("cash") || query.includes("money") || query.includes("rupee") || query.includes("cost")) {
    return "Payment is strictly **cash only** at the time of pickup, paid directly to you by the vendor. EcoTrade does not process online payments, UPI, or cards. Always make sure to get cash from the vendor before they leave!";
  }
  if (query.includes("schedule") || query.includes("book") || query.includes("request")) {
    return "To schedule a pickup, click the '+' or 'Schedule Pickup' button on your dashboard. Choose the category (Paper, Plastic, E-waste, etc.), estimate the weight, share your location, select a date/time, and submit!";
  }
  if (query.includes("vendor") || query.includes("collect")) {
    return "Vendors are verified collectors who will see your open request, accept it, and arrive at your scheduled time. You can view their details and open a chat with them once they accept your request.";
  }
  if (query.includes("hi") || query.includes("hello") || query.includes("hey")) {
    return "Hello! I am EcoBot, your friendly recycling support assistant. How can I help you with EcoTrade today? (Ask me about points, cash payments, or scheduling!)";
  }
  return "I'm here to help with all questions about EcoTrade. You can ask about our cash-on-pickup policy, how to earn Eco Points, or how to schedule/cancel waste collections. What would you like to know?";
}

