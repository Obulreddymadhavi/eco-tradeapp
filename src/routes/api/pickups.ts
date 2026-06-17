import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";
import type { PickupStatus } from "@/components/PickupStatusBadge";

export const Route = createFileRoute("/api/pickups")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { supabase, userId } = await requireApiAuth(request);

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
          if (error) return new Response(error.message, { status: 400 });

          // Pre-resolve signed URLs for waste photo paths
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

          return Response.json(pickups);
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
          const {
            category,
            description,
            estimatedWeightKg,
            photoUrls,
            scheduledDate,
            scheduledTime,
            address,
            latitude,
            longitude,
            customerSnapshot,
          } = body;

          if (!category || !estimatedWeightKg || !scheduledDate || !scheduledTime || !address) {
            return new Response("Missing required fields", { status: 400 });
          }

          const { data, error } = await supabase
            .from("pickups")
            .insert({
              customer_id: userId,
              category,
              description,
              estimated_weight_kg: estimatedWeightKg,
              photo_urls: photoUrls ?? [],
              scheduled_date: scheduledDate,
              scheduled_time: scheduledTime,
              address,
              latitude: latitude ?? null,
              longitude: longitude ?? null,
              customer_snapshot: customerSnapshot ?? null,
              status: "pending",
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
      PUT: async ({ request }) => {
        try {
          const { supabase, userId } = await requireApiAuth(request);
          const body = await request.json();
          const { action, pickupId } = body;

          if (!pickupId) return new Response("pickupId is required", { status: 400 });

          if (action === "accept") {
            const { vendorSnapshot } = body;
            const { data, error } = await supabase
              .from("pickups")
              .update({
                vendor_id: userId,
                status: "accepted",
                vendor_snapshot: vendorSnapshot,
              })
              .eq("id", pickupId)
              .select()
              .single();

            if (error) return new Response(error.message, { status: 400 });
            return Response.json(data);
          } else if (action === "update-status") {
            const { status } = body;
            if (!status) return new Response("status is required", { status: 400 });

            const { data, error } = await supabase
              .from("pickups")
              .update({ status: status as PickupStatus })
              .eq("id", pickupId)
              .select()
              .single();

            if (error) return new Response(error.message, { status: 400 });
            return Response.json(data);
          } else if (action === "complete") {
            const { finalWeightKg, finalAmount } = body;
            if (finalWeightKg === undefined || finalAmount === undefined) {
              return new Response("finalWeightKg and finalAmount are required", { status: 400 });
            }

            const { data: p, error: getErr } = await supabase
              .from("pickups")
              .select("*")
              .eq("id", pickupId)
              .single();

            if (getErr || !p) return new Response(getErr?.message ?? "Pickup not found", { status: 404 });

            const points = Math.max(10, Math.round(finalWeightKg * 10));

            const { data: updatedPickup, error: updateErr } = await supabase
              .from("pickups")
              .update({
                status: "completed",
                payment_status: "cash_paid",
                final_weight_kg: finalWeightKg,
                final_amount: finalAmount,
              })
              .eq("id", pickupId)
              .select()
              .single();

            if (updateErr) return new Response(updateErr.message, { status: 400 });

            const { error: pointsErr } = await supabase.from("eco_points").insert({
              user_id: p.customer_id,
              points,
              reason: `Pickup of ${finalWeightKg}kg ${p.category}`,
              pickup_id: p.id,
            });

            if (pointsErr) return new Response(pointsErr.message, { status: 400 });

            return Response.json({ pickup: updatedPickup, pointsAwarded: points });
          } else {
            return new Response("Invalid action", { status: 400 });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Internal Server Error";
          const status = msg.includes("Unauthorized") ? 401 : 500;
          return new Response(msg, { status });
        }
      },
    },
  },
});
