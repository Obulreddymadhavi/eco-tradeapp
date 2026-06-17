import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAiChat, saveAiChat } from "@/lib/api/chats";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bot, Send, Trash2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/assistant")({
  head: () => ({ meta: [{ title: "EcoBot Assistant · EcoTrade" }] }),
  component: AssistantPage,
});

function AssistantPage() {
  const { user } = useAuth();
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    if (!user) return;
    getAiChat()
      .then((messages) => {
        setInitial((messages as UIMessage[]) ?? []);
      })
      .catch((err) => {
        console.error("Failed to load chat history:", err);
        setInitial([]);
      });
  }, [user]);

  return (
    <AppShell requireAuth>
      <div className="max-w-2xl mx-auto px-4 py-6 h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-eco-gradient grid place-items-center shadow-leaf shrink-0">
              <Bot className="h-5 w-5 text-leaf-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black truncate">EcoBot</h1>
              <p className="text-xs text-muted-foreground">Ask anything about pickups, points & rewards</p>
            </div>
          </div>
        </div>
        {initial === null ? (
          <div className="flex-1 grid place-items-center text-muted-foreground">Loading…</div>
        ) : (
          <ChatWindow userId={user!.id} initialMessages={initial} />
        )}
      </div>
    </AppShell>
  );
}

function ChatWindow({ userId, initialMessages }: { userId: string; initialMessages: UIMessage[] }) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const transport = useRef(new DefaultChatTransport({ api: "/api/chat" })).current;

  const { messages, sendMessage, status, setMessages } = useChat({
    id: userId,
    messages: initialMessages,
    transport,
    onError: (e) => toast.error(e.message),
  });

  // Persist after each settled response
  useEffect(() => {
    if (status !== "ready" || messages.length === 0) return;
    saveAiChat({ data: { messages } })
      .catch((err) => {
        console.error("Failed to save chat:", err);
      });
  }, [status, messages, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, status]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [status]);

  const busy = status === "submitted" || status === "streaming";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    await sendMessage({ text });
  }

  async function clearChat() {
    setMessages([]);
    try {
      await saveAiChat({ data: { messages: [] } });
      toast.success("Conversation cleared");
    } catch (err) {
      console.error("Failed to clear chat:", err);
      toast.error("Failed to clear chat");
    }
  }

  return (
    <Card className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/20">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            <Bot className="h-10 w-10 mx-auto mb-2 text-leaf" />
            <p className="font-semibold text-foreground">Hi! I'm EcoBot 🌿</p>
            <p className="mt-1">Ask me how pickups work, eco points, or anything else.</p>
            <p className="mt-3 text-xs">Reminder: EcoTrade is <b>cash only</b> — paid at pickup.</p>
          </div>
        )}
        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          const mine = m.role === "user";
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && (
                <div className="h-7 w-7 rounded-full bg-eco-gradient grid place-items-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-leaf-foreground" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm whitespace-pre-wrap break-words ${
                  mine ? "bg-eco-gradient text-leaf-foreground" : "bg-background border border-border"
                }`}
              >
                {text || (status === "streaming" ? "…" : "")}
              </div>
              {mine && (
                <div className="h-7 w-7 rounded-full bg-accent grid place-items-center shrink-0">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}
        {status === "submitted" && (
          <div className="flex gap-2">
            <div className="h-7 w-7 rounded-full bg-eco-gradient grid place-items-center">
              <Bot className="h-3.5 w-3.5 text-leaf-foreground" />
            </div>
            <div className="rounded-2xl px-3 py-2 text-sm bg-background border border-border text-muted-foreground">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t border-border p-3 flex gap-2 items-center">
        {messages.length > 0 && (
          <Button type="button" variant="ghost" size="icon" onClick={clearChat} aria-label="Clear chat">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask EcoBot…"
          disabled={busy}
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()} className="bg-eco-gradient shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}
