import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/rewards")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("rewards")
            .select("*")
            .eq("active", true)
            .order("cost_points");

          if (error) return new Response(error.message, { status: 400 });
          return Response.json(data);
        } catch (err) {
          return new Response(err instanceof Error ? err.message : "Internal Server Error", { status: 500 });
        }
      },
      POST: async ({ request }) => {
        try {
          const { supabase, userId } = await requireApiAuth(request);
          const body = await request.json();
          const { rewardId } = body;

          if (!rewardId) {
            return new Response("rewardId is required", { status: 400 });
          }

          // Fetch the reward to get cost and title
          const { data: reward, error: rewardErr } = await supabase
            .from("rewards")
            .select("*")
            .eq("id", rewardId)
            .single();

          if (rewardErr || !reward) {
            return new Response(rewardErr?.message ?? "Reward not found", { status: 404 });
          }

          // Check user points balance
          const { data: pointsData, error: pointsErr } = await supabase
            .from("eco_points")
            .select("points")
            .eq("user_id", userId);

          if (pointsErr) return new Response(pointsErr.message, { status: 400 });

          const currentBalance = (pointsData ?? []).reduce((sum, row) => sum + row.points, 0);

          if (currentBalance < reward.cost_points) {
            return new Response("Not enough Eco Points", { status: 400 });
          }

          // Redeem reward by inserting negative point transaction
          const { data: inserted, error: redeemErr } = await supabase
            .from("eco_points")
            .insert({
              user_id: userId,
              points: -reward.cost_points,
              reason: `Redeemed: ${reward.title}`,
            })
            .select()
            .single();

          if (redeemErr) return new Response(redeemErr.message, { status: 400 });

          return Response.json({
            success: true,
            redeemedReward: reward,
            transaction: inserted,
            newBalance: currentBalance - reward.cost_points,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Internal Server Error";
          const status = msg.includes("Unauthorized") ? 401 : 500;
          return new Response(msg, { status });
        }
      },
    },
  },
});
