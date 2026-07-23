import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { supabase, userId } = await requireApiAuth(request);

          const [{ data: roleRows }, { data: profileRow }] = await Promise.all([
            supabase.from("user_roles").select("role").eq("user_id", userId),
            supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          ]);

          const roles = roleRows?.map((r) => r.role) || [];
          let role = roles.includes("admin") ? "admin" : roles.includes("vendor") ? "vendor" : roles.includes("customer") ? "customer" : undefined;

          if (!role) {
            let metadataRole: string | undefined;
            try {
              const { data: { user: authUser } } = await supabase.auth.getUser();
              metadataRole = authUser?.user_metadata?.role;
            } catch (err) {
              console.warn("[API Auth] Failed to fetch auth user metadata for role check:", err);
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
                console.warn("[API Auth] Failed to auto-insert user role: ", insertErr.message);
              }
            } catch (err) {
              console.error("[API Auth] Exception during user role fallback assignment:", err);
            }
          }

          return Response.json({
            role,
            profile: profileRow,
          });
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
          const { fullName, phone, address, companyName, vehicleInfo } = body;

          if (!fullName) {
            return new Response("fullName is required", { status: 400 });
          }

          const { data: roleRows } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);
          const roles = roleRows?.map((r) => r.role) || [];
          const role = roles.includes("admin") ? "admin" : roles.includes("vendor") ? "vendor" : "customer";

          const { data, error } = await supabase
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
            return new Response(error.message, { status: 400 });
          }

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
