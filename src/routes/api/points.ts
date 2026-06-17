import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/points")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { supabase, userId } = await requireApiAuth(request);

          const { data, error } = await supabase
            .from("eco_points")
            .select("points")
            .eq("user_id", userId);

          if (error) return new Response(error.message, { status: 400 });

          const balance = (data ?? []).reduce((sum, row) => sum + row.points, 0);
          return Response.json({ balance });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Internal Server Error";
          const status = msg.includes("Unauthorized") ? 401 : 500;
          return new Response(msg, { status });
        }
      },
    },
  },
});
