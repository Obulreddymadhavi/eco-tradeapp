import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PickupStatus } from "@/components/PickupStatusBadge";

export const getPickups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    const role = roleRow?.role ?? "customer";

    let query = supabase.from("pickups").select("*");
    if (role === "customer") {
      query = query.eq("customer_id", userId).order("created_at", { ascending: false });
    } else {
      query = query.order("scheduled_date", { ascending: true });
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Pre-resolve signed URLs for waste photo paths on the server
    const pickups = await Promise.all(
      (data ?? []).map(async (p) => {
        if (p.photo_urls && p.photo_urls.length > 0) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: signedData } = await supabaseAdmin.storage
            .from("waste-photos")
            .createSignedUrls(p.photo_urls, 3600);
          const signedUrls = (signedData ?? [])
            .map((d) => d.signedUrl)
            .filter((url): url is string => !!url);
          return { ...p, signedPhotoUrls: signedUrls };
        }
        return { ...p, signedPhotoUrls: [] };
      })
    );

    return pickups;
  });

export const createPickup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .input(
    z.object({
      category: z.string(),
      description: z.string().nullable(),
      estimatedWeightKg: z.number(),
      photoUrls: z.array(z.string()),
      scheduledDate: z.string(),
      scheduledTime: z.string(),
      address: z.string(),
      latitude: z.number().nullable(),
      longitude: z.number().nullable(),
      customerSnapshot: z.object({
        fullName: z.string(),
        phone: z.string().nullable(),
        address: z.string().nullable(),
      }),
    })
  )
  .handler(async ({ input, context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("pickups")
      .insert({
        customer_id: userId,
        category: input.category as any,
        description: input.description,
        estimated_weight_kg: input.estimatedWeightKg,
        photo_urls: input.photoUrls,
        scheduled_date: input.scheduledDate,
        scheduled_time: input.scheduledTime,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
        customer_snapshot: input.customerSnapshot as any,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const acceptPickup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .input(
    z.object({
      pickupId: z.string().uuid(),
      vendorSnapshot: z.object({
        fullName: z.string(),
        phone: z.string().nullable(),
        companyName: z.string().nullable(),
        vehicleInfo: z.string().nullable(),
      }),
    })
  )
  .handler(async ({ input, context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("pickups")
      .update({
        vendor_id: userId,
        status: "accepted",
        vendor_snapshot: input.vendorSnapshot as any,
      })
      .eq("id", input.pickupId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const updatePickupStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .input(
    z.object({
      pickupId: z.string().uuid(),
      status: z.string(), // PickupStatus
    })
  )
  .handler(async ({ input, context }) => {
    const { supabase } = context;

    const { data, error } = await supabase
      .from("pickups")
      .update({ status: input.status as PickupStatus })
      .eq("id", input.pickupId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const completePickup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .input(
    z.object({
      pickupId: z.string().uuid(),
      finalWeightKg: z.number(),
      finalAmount: z.number(),
    })
  )
  .handler(async ({ input, context }) => {
    const { supabase } = context;

    // Fetch the pickup to get customer id and waste category
    const { data: p, error: getErr } = await supabase
      .from("pickups")
      .select("*")
      .eq("id", input.pickupId)
      .single();

    if (getErr || !p) throw new Error(getErr?.message ?? "Pickup not found");

    const points = Math.max(10, Math.round(input.finalWeightKg * 10));

    // Update pickup status to completed and record details
    const { data: updatedPickup, error: updateErr } = await supabase
      .from("pickups")
      .update({
        status: "completed",
        payment_status: "cash_paid",
        final_weight_kg: input.finalWeightKg,
        final_amount: input.finalAmount,
      })
      .eq("id", input.pickupId)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    // Insert point transaction for customer
    const { error: pointsErr } = await supabase.from("eco_points").insert({
      user_id: p.customer_id,
      points,
      reason: `Pickup of ${input.finalWeightKg}kg ${p.category}`,
      pickup_id: p.id,
    });

    if (pointsErr) throw new Error(pointsErr.message);

    return { pickup: updatedPickup, pointsAwarded: points };
  });
