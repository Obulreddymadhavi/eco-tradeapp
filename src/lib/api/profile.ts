import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Profile, AppRole } from "@/lib/auth";

export const getUserProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: roleRow }, { data: profileRow }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);

    return {
      role: (roleRow?.role as AppRole) ?? "customer",
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
