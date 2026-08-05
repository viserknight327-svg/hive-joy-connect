import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser, useMyProfile, karmaTier, type VideoRow } from "@/lib/hive";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Studio · Hive" },
      { name: "description", content: "Track your Hive clips, karma and moderation appeals in one place." },
      { property: "og:title", content: "Studio · Hive" },
      { property: "og:description", content: "Track your Hive clips, karma and moderation appeals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

function Studio() {
  const { userId } = useSessionUser();
  const { data: profile } = useMyProfile();
  const qc = useQueryClient();
  const [appealText, setAppealText] = useState("");

  const { data: videos } = useQuery({
    queryKey: ["my-videos", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VideoRow[];
    },
  });

  const { data: appeals } = useQuery({
    queryKey: ["my-appeals", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appeals")
        .select("id, video_id, status, reason, decision_note")
        .eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const appeal = useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase
        .from("appeals")
        .insert({ user_id: userId!, video_id: videoId, reason: appealText });
      if (error) throw error;
    },
    onSuccess: () => {
      setAppealText("");
      qc.invalidateQueries({ queryKey: ["my-appeals"] });
      toast.success("Appeal sent to the hive council.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tier = karmaTier(profile?.karma ?? 0);
  const nextGoal = [60, 250, 800, 2000].find((t) => (profile?.karma ?? 0) < t);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/60 bg-card p-6">
        <h1 className="text-2xl font-black tracking-tight">Creator studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You're a {tier.emoji} <strong>{tier.label}</strong> with {profile?.karma ?? 0} karma
          {nextGoal ? ` — ${nextGoal - (profile?.karma ?? 0)} to the next tier.` : " — top of the hive!"}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Your clips</h2>
        {(videos ?? []).length === 0 && <p className="text-sm text-muted-foreground">No clips yet.</p>}
        {(videos ?? []).map((v) => {
          const existing = (appeals ?? []).find((a) => a.video_id === v.id);
          return (
            <div key={v.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{v.caption || "Untitled clip"}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.status} · positivity {v.positivity_score} · {v.view_count} views
                  </p>
                  {v.moderation_reason && (
                    <p className="mt-1 text-xs text-muted-foreground">“{v.moderation_reason}”</p>
                  )}
                </div>
                {v.status === "rejected" && !existing && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="secondary">
                        Appeal
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Contest this hold</DialogTitle>
                      </DialogHeader>
                      <Textarea
                        value={appealText}
                        maxLength={500}
                        onChange={(e) => setAppealText(e.target.value)}
                        placeholder="Explain why this clip belongs in the hive."
                      />
                      <Button disabled={!appealText.trim()} onClick={() => appeal.mutate(v.id)}>
                        Submit appeal
                      </Button>
                    </DialogContent>
                  </Dialog>
                )}
                {existing && (
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs">Appeal {existing.status}</span>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
