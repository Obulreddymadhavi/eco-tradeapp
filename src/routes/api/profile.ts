import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { supabase, userId } = await requireApiAuth(request);

          const [{ data: roleRow }, { data: profileRow }] = await Promise.all([
            supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
            supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          ]);

          return Response.json({
            role: roleRow?.role ?? "customer",
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

          const { data: roleRow } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .maybeSingle();
          const role = roleRow?.role ?? "customer";

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
