import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPickupMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ pickupId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: messages, error } = await supabase
      .from("pickup_messages")
      .select("*")
      .eq("pickup_id", data.pickupId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return messages;
  });

export const sendPickupMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      pickupId: z.string().uuid(),
      body: z.string().min(1),
    })
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: message, error } = await supabase
      .from("pickup_messages")
      .insert({
        pickup_id: data.pickupId,
        sender_id: userId,
        body: data.body,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return message;
  });

export const getAiChat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("ai_chats")
      .select("messages")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data?.messages as any[]) ?? [];
  });

export const saveAiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ messages: z.array(z.any()) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: saved, error } = await supabase
      .from("ai_chats")
      .upsert({
        user_id: userId,
        messages: data.messages,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return saved;
  });
