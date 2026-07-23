import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Profile, AppRole } from "@/lib/auth";

export const getUserProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Ensure buckets exist on the first few loads
    const { ensureBucketsExist } = await import("@/integrations/supabase/client.server");
    await ensureBucketsExist().catch(err => console.error("Bucket init failed:", err));

    let [{ data: roleRows }, { data: profileRow }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);

    const roles = roleRows?.map((r) => r.role as AppRole) || [];
    let role = roles.includes("admin") ? "admin" : roles.includes("vendor") ? "vendor" : roles.includes("customer") ? "customer" : undefined;

    if (!role) {
      let metadataRole: string | undefined;
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        metadataRole = authUser?.user_metadata?.role;
      } catch (err) {
        console.warn("[Auth] Failed to fetch auth user metadata for role check:", err);
      }

      const isVendor = metadataRole === "vendor" || !!(profileRow?.company_name || profileRow?.vehicle_info);
      role = isVendor ? "vendor" : "customer";
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: insertErr } = await supabaseAdmin.from("user_roles").insert({
          user_id: userId,
          role: role
        });
        if (insertErr) {
          console.warn("[Auth] Failed to auto-insert user role: ", insertErr.message);
        }
      } catch (err) {
        console.error("[Auth] Exception during user role fallback assignment:", err);
      }
    }

    return {
      role,
      profile: profileRow as Profile | null,
    };
  });

export const updateUserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      fullName: z.string().min(1),
      phone: z.string().nullable(),
      address: z.string().nullable(),
      companyName: z.string().nullable(),
      vehicleInfo: z.string().nullable(),
    })
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { fullName, phone, address, companyName, vehicleInfo } = data;

    // Fetch the role to double check if vendor information is appropriate
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    const role = (roleRow?.role as AppRole) ?? "customer";

    const { data: updatedProfile, error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        address,
        company_name: role === "vendor" ? companyName : null,
        vehicle_info: role === "vendor" ? vehicleInfo : null,
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return updatedProfile as Profile;
  });

export const switchUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      role: z.enum(["customer", "vendor"]),
    })
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { role } = data;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Delete existing roles
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    // Insert the new role
    const { data: roleRow, error } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: role,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return roleRow;
  });
