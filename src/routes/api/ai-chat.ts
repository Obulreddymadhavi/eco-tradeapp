import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/ai-chat")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { supabase, userId } = await requireApiAuth(request);

          const { data, error } = await supabase
            .from("ai_chats")
            .select("messages")
            .eq("user_id", userId)
            .maybeSingle();

          if (error) return new Response(error.message, { status: 400 });
          return Response.json((data?.messages as any[]) ?? []);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Internal Server Error";
          const status = msg.includes("Unauthorized") ? 401 : 500;
          return new Response(msg, { status });
        }
      },
      POST: async ({ request }) => {
        try {
          const { supabase, userId } = await requireApiAuth(request);
          const body = await request.json();
          const { messages } = body;

          if (!Array.isArray(messages)) {
            return new Response("messages array is required", { status: 400 });
          }

          const { data, error } = await supabase
            .from("ai_chats")
            .upsert({
              user_id: userId,
              messages,
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) return new Response(error.message, { status: 400 });
          return Response.json(data);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Internal Server Error";
          const status = msg.includes("Unauthorized") ? 401 : 500;
          return new Response(msg, { status });
        }
      },
    },
  },
});
