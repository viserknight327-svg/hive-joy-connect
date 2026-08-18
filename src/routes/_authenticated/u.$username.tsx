import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Pin, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hydrateVideos } from "@/lib/feed";
import { ACCENT_RING, karmaTier, useSessionUser, useSignedUrl, type Profile, type VideoRow } from "@/lib/hive";
import { BADGES } from "@/lib/badges";
import { VideoCard } from "@/components/hive/video-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/u/$username")({
  head: () => ({
    meta: [
      { title: "Creator profile · Hive" },
      { name: "description", content: "See a Hive creator's karma tier, clips, badges, followers and follow them." },
      { property: "og:title", content: "Creator profile · Hive" },
      { property: "og:description", content: "Karma tier, badges, clips and followers on Hive." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="card-3d rounded-2xl border border-border/60 bg-secondary/40 px-4 py-2 text-center">
      <p className="text-lg font-black leading-tight">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function ProfilePage() {
  const { username } = Route.useParams();
  const { userId } = useSessionUser();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-by-name", username],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const avatar = useSignedUrl("avatars", profile?.avatar_url);
  const banner = useSignedUrl("avatars", profile?.banner_url);

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

  const { data: badges } = useQuery({
    queryKey: ["achievements", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase.from("user_achievements").select("code").eq("user_id", profile!.id);
      return new Set((data ?? []).map((r) => r.code));
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

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading the hive…</p>;
  if (!profile) return <p className="text-sm text-muted-foreground">No such bee.</p>;

  const tier = karmaTier(profile.karma);
  const isMe = userId === profile.id;
  const clips = videos ?? [];
  const pinned = clips.find((v) => v.id === profile.pinned_video_id);
  const rest = clips.filter((v) => v.id !== profile.pinned_video_id);
  const totalViews = clips.reduce((sum, v) => sum + (v.view_count ?? 0), 0);
  const accent = ACCENT_RING[profile.accent] ?? ACCENT_RING["honey"];

  return (
    <div className="scene-3d space-y-6">
      <section className="card-3d overflow-hidden rounded-3xl border border-border/60 bg-card">
        <div className={cn("relative h-36 bg-gradient-to-br sm:h-44", accent)}>
          {banner && <img src={banner} alt={`${profile.username} banner`} className="size-full object-cover" />}
          <div className="honeycomb pointer-events-none absolute inset-0 opacity-40" />
        </div>

        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="raised grid size-24 shrink-0 place-items-center overflow-hidden rounded-3xl border border-border/60 bg-secondary text-4xl">
                {avatar ? (
                  <img src={avatar} alt={`${profile.username} avatar`} className="size-full object-cover" />
                ) : (
                  "🐝"
                )}
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-black tracking-tight">{profile.display_name || `@${profile.username}`}</h1>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isMe ? (
                <>
                  <Button variant="secondary" asChild>
                    <Link to="/settings">
                      <SettingsIcon className="mr-1 size-4" /> Edit profile
                    </Link>
                  </Button>
                  <Button variant="ghost" onClick={signOut}>
                    Sign out
                  </Button>
                </>
              ) : (
                <Button variant={isFollowing ? "secondary" : "default"} onClick={() => toggleFollow.mutate()}>
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="glow-primary rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {tier.emoji} {tier.label}
            </span>
            {profile.link_url && (
              <a
                href={profile.link_url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium hover:underline"
              >
                <ExternalLink className="size-3" />
                {profile.link_url.replace(/^https?:\/\//, "").slice(0, 40)}
              </a>
            )}
            <span className="text-xs text-muted-foreground">
              Joined {new Date(profile.created_at).toLocaleDateString()}
            </span>
          </div>

          {profile.bio && <p className="mt-3 max-w-xl text-sm">{profile.bio}</p>}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Stat value={profile.karma} label="Karma" />
            <Stat value={counts?.followers ?? 0} label="Followers" />
            <Stat value={counts?.following ?? 0} label="Following" />
            <Stat value={clips.length} label="Clips" />
            <Stat value={totalViews} label="Views" />
          </div>
        </div>
      </section>

      {profile.about && (
        <section className="card-3d rounded-3xl border border-border/60 bg-card p-6">
          <h2 className="text-sm font-black uppercase tracking-wide text-muted-foreground">About me</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{profile.about}</p>
        </section>
      )}

      <section className="card-3d rounded-3xl border border-border/60 bg-card p-6">
        <h2 className="text-sm font-black uppercase tracking-wide text-muted-foreground">Badges</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {BADGES.map((b) => {
            const earned = badges?.has(b.code);
            return (
              <span
                key={b.code}
                title={b.description}
                className={cn(
                  "rounded-2xl border border-border/60 px-3 py-1.5 text-xs font-semibold transition",
                  earned ? "raised bg-primary/10 text-primary" : "bg-secondary/40 text-muted-foreground opacity-50",
                )}
              >
                {b.emoji} {b.label}
              </span>
            );
          })}
        </div>
      </section>

      {pinned && (
        <section className="space-y-2">
          <p className="flex items-center gap-1 text-xs font-black uppercase tracking-wide text-primary">
            <Pin className="size-3" /> Pinned clip
          </p>
          <VideoCard item={pinned} />
        </section>
      )}

      <div className="grid gap-6">
        {rest.map((v) => (
          <VideoCard key={v.id} item={v} />
        ))}
        {clips.length === 0 && <p className="text-sm text-muted-foreground">No public clips yet.</p>}
      </div>
    </div>
  );
}
