
-- Pickup messages (customer <-> vendor chat per pickup)
CREATE TABLE public.pickup_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_id uuid NOT NULL REFERENCES public.pickups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pickup_messages TO authenticated;
GRANT ALL ON public.pickup_messages TO service_role;

ALTER TABLE public.pickup_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read pickup messages"
  ON public.pickup_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pickups p
      WHERE p.id = pickup_messages.pickup_id
        AND (p.customer_id = auth.uid() OR p.vendor_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send pickup messages"
  ON public.pickup_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.pickups p
      WHERE p.id = pickup_messages.pickup_id
        AND p.vendor_id IS NOT NULL
        AND (p.customer_id = auth.uid() OR p.vendor_id = auth.uid())
    )
  );

CREATE INDEX pickup_messages_pickup_idx ON public.pickup_messages(pickup_id, created_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_messages;

-- AI chat: one conversation per user
CREATE TABLE public.ai_chats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chats TO authenticated;
GRANT ALL ON public.ai_chats TO service_role;

ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their AI chat"
  ON public.ai_chats FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER touch_ai_chats_updated_at
  BEFORE UPDATE ON public.ai_chats
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
