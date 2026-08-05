import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser, type Profile } from "@/lib/hive";
import { sendMessage } from "@/lib/hive.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat · Hive" },
      { name: "description", content: "Send AI-moderated direct messages to the creators you follow on Hive." },
      { property: "og:title", content: "Chat · Hive" },
      { property: "og:description", content: "AI-moderated direct messages on Hive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Chat,
});

function Chat() {
  const { userId } = useSessionUser();
  const qc = useQueryClient();
  const [peer, setPeer] = useState<Profile | null>(null);
  const [text, setText] = useState("");

  const { data: people } = useQuery({
    queryKey: ["chat-people", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", userId!);
      const { data: msgs } = await supabase
        .from("messages")
        .select("sender_id, recipient_id")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
      const ids = new Set<string>();
      (follows ?? []).forEach((f) => ids.add(f.following_id));
      (msgs ?? []).forEach((m) => {
        ids.add(m.sender_id === userId ? m.recipient_id : m.sender_id);
      });
      ids.delete(userId!);
      if (ids.size === 0) return [] as Profile[];
      const { data } = await supabase.from("profiles").select("*").in("id", Array.from(ids));
      return (data ?? []) as Profile[];
    },
  });

  const { data: thread } = useQuery({
    queryKey: ["thread", userId, peer?.id],
    enabled: !!userId && !!peer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${peer!.id}),and(sender_id.eq.${peer!.id},recipient_id.eq.${userId})`,
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("dm")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["thread"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const send = useMutation({
    mutationFn: async () => {
      const res = await sendMessage({ data: { recipientId: peer!.id, body: text } });
      if (!res.ok) throw new Error(res.reason || "Let's keep messages kind.");
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["thread"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <aside className="space-y-1 rounded-3xl border border-border/60 bg-card p-3">
        <p className="px-2 pb-2 text-xs font-semibold uppercase text-muted-foreground">Bees</p>
        {(people ?? []).length === 0 && <p className="px-2 text-xs text-muted-foreground">Follow someone to chat.</p>}
        {(people ?? []).map((p) => (
          <button
            key={p.id}
            onClick={() => setPeer(p)}
            className={cn(
              "w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-secondary",
              peer?.id === p.id && "bg-secondary",
            )}
          >
            @{p.username}
          </button>
        ))}
      </aside>

      <section className="flex min-h-[60vh] flex-col rounded-3xl border border-border/60 bg-card p-4">
        {!peer && <p className="m-auto text-sm text-muted-foreground">Pick a bee to start chatting 🐝</p>}
        {peer && (
          <>
            <h2 className="pb-3 text-sm font-bold">@{peer.username}</h2>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {(thread ?? []).map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                    m.sender_id === userId ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary",
                  )}
                >
                  {m.body}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                placeholder="Say something kind…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && text.trim()) send.mutate();
                }}
              />
              <Button disabled={!text.trim() || send.isPending} onClick={() => send.mutate()}>
                Send
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
