import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { hydrateVideos } from "@/lib/feed";
import { karmaTier, useSessionUser, type Profile, type VideoRow } from "@/lib/hive";
import { VideoCard } from "@/components/hive/video-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/u/$username")({
  head: () => ({
    meta: [
      { title: "Creator profile · Hive" },
      { name: "description", content: "See a Hive creator's karma tier, clips, followers and follow them back." },
      { property: "og:title", content: "Creator profile · Hive" },
      { property: "og:description", content: "Karma tier, clips and followers on Hive." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { userId } = useSessionUser();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile-by-name", username],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const { data: videos } = useQuery({
    queryKey: ["profile-videos", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("user_id", profile!.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return hydrateVideos((data ?? []) as VideoRow[]);
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["profile-counts", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const followers = await supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", profile!.id);
      const following = await supabase
        .from("follows")
        .select("following_id", { count: "exact", head: true })
        .eq("follower_id", profile!.id);
      return { followers: followers.count ?? 0, following: following.count ?? 0 };
    },
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["following", userId, profile?.id],
    enabled: !!userId && !!profile && userId !== profile.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId!)
        .eq("following_id", profile!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", userId!)
          .eq("following_id", profile!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: userId!, following_id: profile!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["profile-counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!profile) return <p className="text-sm text-muted-foreground">No such bee.</p>;
  const tier = karmaTier(profile.karma);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/60 bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight">@{profile.username}</h1>
            <p className="text-sm text-muted-foreground">
              {tier.emoji} {tier.label} · {profile.karma} karma · {counts?.followers ?? 0} followers ·{" "}
              {counts?.following ?? 0} following
            </p>
            {profile.bio && <p className="mt-2 max-w-lg text-sm">{profile.bio}</p>}
          </div>
          {userId === profile.id ? (
            <Button variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          ) : (
            <Button variant={isFollowing ? "secondary" : "default"} onClick={() => toggleFollow.mutate()}>
              {isFollowing ? "Following" : "Follow"}
            </Button>
          )}
        </div>
      </section>

      <div className="grid gap-6">
        {(videos ?? []).map((v) => (
          <VideoCard key={v.id} item={v} />
        ))}
        {(videos ?? []).length === 0 && <p className="text-sm text-muted-foreground">No public clips yet.</p>}
      </div>
    </div>
  );
}
