import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";

interface PickupMessageRow {
  id: string;
  pickup_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

/**
 * Listens for new pickup chat messages addressed to the signed-in user
 * and shows an in-app toast + browser notification (when permitted).
 */
export function ChatNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const seen = useRef<Set<string>>(new Set());
  const permissionAsked = useRef(false);

  useEffect(() => {
    if (!user) return;

    // Request browser notification permission once per session
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default" &&
      !permissionAsked.current
    ) {
      permissionAsked.current = true;
      Notification.requestPermission().catch(() => {});
    }

    const channel = supabase
      .channel(`chat-notify-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pickup_messages" },
        (payload) => {
          const msg = payload.new as PickupMessageRow;
          if (!msg || msg.sender_id === user.id) return;
          if (seen.current.has(msg.id)) return;
          seen.current.add(msg.id);

          // Skip if the user is currently viewing this pickup's chat modal
          const activePickup =
            typeof window !== "undefined"
              ? (window as unknown as { __activeChatPickupId?: string }).__activeChatPickupId
              : undefined;
          if (activePickup === msg.pickup_id) return;

          const preview = msg.body.length > 80 ? `${msg.body.slice(0, 80)}…` : msg.body;

          toast("New message", {
            description: preview,
            icon: <MessageCircle className="h-4 w-4" />,
            action: {
              label: "Open",
              onClick: () => {
                router.navigate({ to: "/customer" });
              },
            },
          });

          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted" &&
            document.visibilityState !== "visible"
          ) {
            try {
              new Notification("EcoTrade — new message", {
                body: preview,
                tag: `pickup-${msg.pickup_id}`,
              });
            } catch {
              // Ignore notification failures (unsupported context)
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, router]);

  return null;
}
