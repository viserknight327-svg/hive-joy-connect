import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, TrendingUp, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hydrateVideos } from "@/lib/feed";
import { karmaTier, useSessionUser, type Profile, type VideoRow } from "@/lib/hive";
import { VideoCard } from "@/components/hive/video-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/explore")({
  head: () => ({
    meta: [
      { title: "Explore · Hive" },
      {
        name: "description",
        content: "Search kind creators, trending hashtags and uplifting clips across the Hive community.",
      },
      { property: "og:title", content: "Explore · Hive" },
      { property: "og:description", content: "Trending hashtags, recommended bees and positive clips." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Explore,
});

function Explore() {
  const { userId } = useSessionUser();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  const { data: clips } = useQuery({
    queryKey: ["explore-clips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return hydrateVideos((data ?? []) as VideoRow[]);
    },
  });

  const { data: people } = useQuery({
    queryKey: ["explore-people", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("karma", { ascending: false }).limit(50);
      const { data: follows } = userId
        ? await supabase.from("follows").select("following_id").eq("follower_id", userId)
        : { data: [] as Array<{ following_id: string }> };
      const followed = new Set((follows ?? []).map((f) => f.following_id));
      return ((data ?? []) as Profile[]).map((p) => ({ ...p, followed: followed.has(p.id) }));
    },
  });

  const trending = useMemo(() => {
    const counts = new Map<string, number>();
    (clips ?? []).forEach((c) => c.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [clips]);

  const term = q.trim().toLowerCase().replace(/^#/, "");
  const activeTag = tag ?? (term && (clips ?? []).some((c) => c.tags.includes(term)) ? term : null);

  const matchedClips = (clips ?? []).filter((c) => {
    if (activeTag) return c.tags.includes(activeTag);
    if (!term) return false;
    return c.caption.toLowerCase().includes(term) || c.tags.some((t) => t.includes(term));
  });

  const matchedPeople = (people ?? []).filter(
    (p) =>
      term &&
      (p.username.toLowerCase().includes(term) ||
        (p.display_name ?? "").toLowerCase().includes(term) ||
        (p.bio ?? "").toLowerCase().includes(term)),
  );

  const recommended = (people ?? []).filter((p) => !p.followed && p.id !== userId).slice(0, 6);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/60 bg-card p-6">
        <h1 className="text-2xl font-black tracking-tight">Explore the hive</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search bees, captions and hashtags — all positivity-checked.</p>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            maxLength={80}
            onChange={(e) => {
              setQ(e.target.value);
              setTag(null);
            }}
            placeholder="Search @bees, clips or #hashtags"
            className="pl-9"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="size-4" /> Trending hashtags
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {trending.length === 0 && <p className="text-sm text-muted-foreground">Nothing trending yet — go post.</p>}
          {trending.map(([t, n]) => (
            <button
              key={t}
              onClick={() => {
                setTag(activeTag === t ? null : t);
                setQ(`#${t}`);
              }}
              className={cn(
                "rounded-full border border-border/60 px-3 py-1 text-xs font-semibold transition hover:bg-secondary",
                activeTag === t && "border-primary bg-primary/15 text-primary",
              )}
            >
              #{t} · {n}
            </button>
          ))}
        </div>
      </section>

      {!term && (
        <section className="rounded-3xl border border-border/60 bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-4" /> Bees you might like
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {recommended.map((p) => {
              const tier = karmaTier(p.karma);
              return (
                <div key={p.id} className="flex items-center justify-between rounded-2xl bg-secondary/50 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold">@{p.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {tier.emoji} {tier.label} · {p.karma} karma
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" asChild>
                    <Link to="/u/$username" params={{ username: p.username }}>
                      View
                    </Link>
                  </Button>
                </div>
              );
            })}
            {recommended.length === 0 && <p className="text-sm text-muted-foreground">You follow everyone already 🐝</p>}
          </div>
        </section>
      )}

      {matchedPeople.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">Bees</h2>
          {matchedPeople.map((p) => (
            <Link
              key={p.id}
              to="/u/$username"
              params={{ username: p.username }}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3 hover:bg-secondary/40"
            >
              <span className="text-sm font-semibold">@{p.username}</span>
              <span className="text-xs text-muted-foreground">{p.karma} karma</span>
            </Link>
          ))}
        </section>
      )}

      {(term || activeTag) && (
        <section className="grid gap-6">
          <h2 className="text-lg font-bold">{activeTag ? `#${activeTag}` : "Clips"}</h2>
          {matchedClips.length === 0 && <p className="text-sm text-muted-foreground">No clips match that yet.</p>}
          {matchedClips.map((v) => (
            <VideoCard key={v.id} item={v} />
          ))}
        </section>
      )}
    </div>
  );
}
