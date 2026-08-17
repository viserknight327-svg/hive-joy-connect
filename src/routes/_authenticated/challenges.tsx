import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trophy, Flame, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hydrateVideos } from "@/lib/feed";
import { useSessionUser, type VideoRow } from "@/lib/hive";
import { BADGES, syncAchievements } from "@/lib/badges";
import { VideoCard } from "@/components/hive/video-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/challenges")({
  head: () => ({
    meta: [
      { title: "Challenges & badges · Hive" },
      {
        name: "description",
        content: "Take on daily kindness challenges, earn Hive badges and revisit the clips you saved.",
      },
      { property: "og:title", content: "Challenges & badges · Hive" },
      { property: "og:description", content: "Daily kindness challenges, achievement badges and saved clips." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Challenges,
});

function Challenges() {
  const { userId } = useSessionUser();
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const { data: challenge } = useQuery({
    queryKey: ["challenge", today],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_challenges")
        .select("*")
        .lte("day", today)
        .order("day", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: entry } = useQuery({
    queryKey: ["challenge-entry", userId, challenge?.id],
    enabled: !!userId && !!challenge,
    queryFn: async () => {
      const { data } = await supabase
        .from("challenge_entries")
        .select("*")
        .eq("user_id", userId!)
        .eq("challenge_id", challenge!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: earned } = useQuery({
    queryKey: ["achievements", userId],
    enabled: !!userId,
    queryFn: async () => Array.from(await syncAchievements(userId!)),
  });

  const { data: saved } = useQuery({
    queryKey: ["saves", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("saves")
        .select("video_id, folder")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      const ids = (data ?? []).map((s) => s.video_id);
      if (ids.length === 0) return [];
      const { data: vids } = await supabase.from("videos").select("*").in("id", ids);
      return hydrateVideos((vids ?? []) as VideoRow[]);
    },
  });

  useEffect(() => {
    if (userId) void syncAchievements(userId);
  }, [userId]);

  const join = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("challenge_entries")
        .insert({ user_id: userId!, challenge_id: challenge!.id, note });
      if (error) throw error;
    },
    onSuccess: () => {
      setNote("");
      qc.invalidateQueries({ queryKey: ["challenge-entry"] });
      qc.invalidateQueries({ queryKey: ["achievements"] });
      toast.success("You're in today's challenge 🏅");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const earnedSet = new Set(earned ?? []);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-primary/30 bg-primary/10 p-6">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
          <Flame className="size-6 text-primary" /> Daily kindness challenge
        </h1>
        {challenge ? (
          <>
            <p className="mt-2 text-base font-semibold">{challenge.prompt}</p>
            <p className="text-xs text-muted-foreground">Tag your clip #{challenge.tag}</p>
            {entry ? (
              <p className="mt-4 rounded-2xl bg-background/60 px-4 py-3 text-sm">
                Joined ✅ {entry.note && <span className="text-muted-foreground">“{entry.note}”</span>}
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                <Textarea
                  value={note}
                  maxLength={280}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="How will you take this on today?"
                />
                <div className="flex gap-2">
                  <Button disabled={join.isPending} onClick={() => join.mutate()}>
                    Join challenge
                  </Button>
                  <Button variant="secondary" asChild>
                    <Link to="/upload">Post a clip</Link>
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No challenge today — check back tomorrow.</p>
        )}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Trophy className="size-5 text-primary" /> Achievements
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {BADGES.map((b) => {
            const got = earnedSet.has(b.code);
            return (
              <div
                key={b.code}
                className={cn(
                  "rounded-2xl border px-4 py-3",
                  got ? "border-primary/50 bg-primary/10" : "border-border/60 opacity-60",
                )}
              >
                <p className="text-sm font-semibold">
                  {b.emoji} {b.label} {got && <span className="text-xs text-primary">earned</span>}
                </p>
                <p className="text-xs text-muted-foreground">{b.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Bookmark className="size-5" /> Saved collection
        </h2>
        {(saved ?? []).length === 0 && <p className="text-sm text-muted-foreground">Save clips from the feed to build your collection.</p>}
        <div className="grid gap-6">
          {(saved ?? []).map((v) => (
            <VideoCard key={v.id} item={v} />
          ))}
        </div>
      </section>
    </div>
  );
}
