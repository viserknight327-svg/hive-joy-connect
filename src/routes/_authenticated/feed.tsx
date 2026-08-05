import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFeed } from "@/lib/feed";
import { useSessionUser } from "@/lib/hive";
import { VideoCard } from "@/components/hive/video-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Feed · Hive" },
      { name: "description", content: "Your positive-only For You and Following feeds on Hive." },
      { property: "og:title", content: "Feed · Hive" },
      { property: "og:description", content: "Your positive-only For You and Following feeds on Hive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Feed,
});

function Feed() {
  const { userId } = useSessionUser();
  const [mode, setMode] = useState<"foryou" | "following">("foryou");
  const { data, isLoading } = useQuery({
    queryKey: ["feed", mode, userId],
    queryFn: () => fetchFeed({ userId, mode }),
  });

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <Button variant={mode === "foryou" ? "default" : "secondary"} onClick={() => setMode("foryou")}>
          For You
        </Button>
        <Button variant={mode === "following" ? "default" : "secondary"} onClick={() => setMode("following")}>
          Following
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Warming up the hive…</p>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="rounded-3xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          Nothing here yet. Post the first uplifting clip 🐝
        </div>
      )}
      <div className="grid gap-6">
        {(data ?? []).map((item) => (
          <VideoCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
