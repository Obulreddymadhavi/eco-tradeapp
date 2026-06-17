import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getRewards = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("rewards")
      .select("*")
      .eq("active", true)
      .order("cost_points");

    if (error) throw new Error(error.message);
    return data;
  });

export const getPointsBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("eco_points")
      .select("points")
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    const balance = (data ?? []).reduce((sum, row) => sum + row.points, 0);
    return { balance };
  });

export const redeemReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .input(z.object({ rewardId: z.string().uuid() }))
  .handler(async ({ input, context }) => {
    const { supabase, userId } = context;

    // Fetch the reward to get cost and title
    const { data: reward, error: rewardErr } = await supabase
      .from("rewards")
      .select("*")
      .eq("id", input.rewardId)
      .single();

    if (rewardErr || !reward) {
      throw new Error(rewardErr?.message ?? "Reward not found");
    }

    // Check user points balance
    const { data: pointsData, error: pointsErr } = await supabase
      .from("eco_points")
      .select("points")
      .eq("user_id", userId);

    if (pointsErr) throw new Error(pointsErr.message);

    const currentBalance = (pointsData ?? []).reduce((sum, row) => sum + row.points, 0);

    if (currentBalance < reward.cost_points) {
      throw new Error("Not enough Eco Points");
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

    if (redeemErr) throw new Error(redeemErr.message);

    return {
      success: true,
      redeemedReward: reward,
      transaction: inserted,
      newBalance: currentBalance - reward.cost_points,
    };
  });
