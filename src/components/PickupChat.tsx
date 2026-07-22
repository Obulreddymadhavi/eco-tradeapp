import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPickupMessages, sendPickupMessage } from "@/lib/api/chats";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageCircle, Send } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface PickupMessage {
  id: string;
  pickup_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function PickupChat({
  pickupId,
  peerName,
  disabled,
}: {
  pickupId: string;
  peerName: string;
  disabled?: boolean;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<PickupMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;

    // Mark this pickup as the actively-viewed chat so global notifications skip it
    if (typeof window !== "undefined") {
      (window as unknown as { __activeChatPickupId?: string }).__activeChatPickupId = pickupId;
    }

    getPickupMessages({ data: { pickupId } })
      .then((data) => {
        if (!cancelled) setMessages((data as unknown as PickupMessage[]) ?? []);
      })
      .catch((err) => {
        console.error("Failed to load chat messages:", err);
      });

    const channel = supabase
      .channel(`pickup-chat-${pickupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pickup_messages", filter: `pickup_id=eq.${pickupId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as PickupMessage])
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      if (typeof window !== "undefined") {
        const w = window as unknown as { __activeChatPickupId?: string };
        if (w.__activeChatPickupId === pickupId) delete w.__activeChatPickupId;
      }
    };
  }, [open, pickupId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !user) return;
    setSending(true);
    const body = input.trim();
    setInput("");
    try {
      await sendPickupMessage({ data: { pickupId, body } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
      setInput(body);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <MessageCircle className="h-3.5 w-3.5 mr-1" /> Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md flex flex-col h-[80vh] p-0">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="text-base">Chat with {peerName}</DialogTitle>
          <p className="text-xs text-muted-foreground">Cash only · paid at pickup</p>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-muted/30">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No messages yet. Say hi 👋
            </p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    mine ? "bg-eco-gradient text-leaf-foreground" : "bg-background border border-border"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${mine ? "text-leaf-foreground/70" : "text-muted-foreground"}`}>
                    {format(new Date(m.created_at), "HH:mm")}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="border-t border-border p-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            disabled={sending}
            autoFocus
          />
          <Button type="submit" size="icon" disabled={sending || !input.trim()} className="bg-eco-gradient shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
