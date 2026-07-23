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
  .inputValidator(
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
        full_name: z.string(),
        phone: z.string().nullable(),
        address: z.string().nullable(),
      }),
    })
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let createdPickup: any = null;
    let error: any = null;

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // Use admin client to bypass RLS if service role key is available
      const { data: adminData, error: adminErr } = await supabaseAdmin
        .from("pickups")
        .insert({
          customer_id: userId,
          category: data.category as any,
          description: data.description,
          estimated_weight_kg: data.estimatedWeightKg,
          photo_urls: data.photoUrls,
          scheduled_date: data.scheduledDate,
          scheduled_time: data.scheduledTime,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          customer_snapshot: data.customerSnapshot as any,
          status: "pending",
        })
        .select()
        .single();
      
      createdPickup = adminData;
      error = adminErr;
    } catch (adminEx) {
      console.warn("[Pickups] Admin insert attempt skipped/failed, falling back to user client:", adminEx);
      error = adminEx;
    }

    // Fallback if admin insert was not successful or failed
    if (error || !createdPickup) {
      const { data: userPickup, error: userErr } = await supabase
        .from("pickups")
        .insert({
          customer_id: userId,
          category: data.category as any,
          description: data.description,
          estimated_weight_kg: data.estimatedWeightKg,
          photo_urls: data.photoUrls,
          scheduled_date: data.scheduledDate,
          scheduled_time: data.scheduledTime,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          customer_snapshot: data.customerSnapshot as any,
          status: "pending",
        })
        .select()
        .single();
      
      if (userErr) throw new Error(userErr.message);
      return userPickup;
    }

    return createdPickup;
  });

export const acceptPickup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      pickupId: z.string().uuid(),
      vendorSnapshot: z.object({
        full_name: z.string(),
        phone: z.string().nullable(),
        company_name: z.string().nullable(),
        vehicle_info: z.string().nullable(),
      }),
    })
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: acceptedPickup, error } = await supabase
      .from("pickups")
      .update({
        vendor_id: userId,
        status: "accepted",
        vendor_snapshot: data.vendorSnapshot as any,
      })
      .eq("id", data.pickupId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return acceptedPickup;
  });

export const updatePickupStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      pickupId: z.string().uuid(),
      status: z.string(), // PickupStatus
    })
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: updatedPickup, error } = await supabase
      .from("pickups")
      .update({ status: data.status as PickupStatus })
      .eq("id", data.pickupId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updatedPickup;
  });

export const completePickup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      pickupId: z.string().uuid(),
      finalWeightKg: z.number(),
      finalAmount: z.number(),
    })
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Fetch the pickup to get customer id and waste category
    const { data: p, error: getErr } = await supabase
      .from("pickups")
      .select("*")
      .eq("id", data.pickupId)
      .single();

    if (getErr || !p) throw new Error(getErr?.message ?? "Pickup not found");

    const points = Math.max(10, Math.round(data.finalWeightKg * 10));

    // Update pickup status to completed and record details
    const { data: updatedPickup, error: updateErr } = await supabase
      .from("pickups")
      .update({
        status: "completed",
        payment_status: "cash_paid",
        final_weight_kg: data.finalWeightKg,
        final_amount: data.finalAmount,
      })
      .eq("id", data.pickupId)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    // Insert point transaction for customer
    const { error: pointsErr } = await supabase.from("eco_points").insert({
      user_id: p.customer_id,
      points,
      reason: `Pickup of ${data.finalWeightKg}kg ${p.category}`,
      pickup_id: p.id,
    });

    if (pointsErr) throw new Error(pointsErr.message);

    return { pickup: updatedPickup, pointsAwarded: points };
  });

export const initBuckets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { ensureBucketsExist } = await import("@/integrations/supabase/client.server");
    await ensureBucketsExist();
    return { success: true };
  });

