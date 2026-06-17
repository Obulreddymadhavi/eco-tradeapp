import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/messages")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { supabase } = await requireApiAuth(request);
          const url = new URL(request.url);
          const pickupId = url.searchParams.get("pickupId");

          if (!pickupId) {
            return new Response("pickupId parameter is required", { status: 400 });
          }

          const { data, error } = await supabase
            .from("pickup_messages")
            .select("*")
            .eq("pickup_id", pickupId)
            .order("created_at", { ascending: true });

          if (error) return new Response(error.message, { status: 400 });
          return Response.json(data);
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
          const { pickupId, body: messageBody } = body;

          if (!pickupId || !messageBody) {
            return new Response("pickupId and body are required", { status: 400 });
          }

          const { data, error } = await supabase
            .from("pickup_messages")
            .insert({
              pickup_id: pickupId,
              sender_id: userId,
              body: messageBody,
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
