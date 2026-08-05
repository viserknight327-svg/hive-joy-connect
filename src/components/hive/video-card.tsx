import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageSquare, Flag, Repeat2, Scissors, Eye, UserPlus, UserMinus, Ban } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl, useSessionUser, type VideoRow, type Profile } from "@/lib/hive";
import { postComment } from "@/lib/hive.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type FeedItem = VideoRow & { author: Profile | null; parent_caption?: string | null };

export function VideoCard({ item }: { item: FeedItem }) {
  const qc = useQueryClient();
  const { userId } = useSessionUser();
  const url = useSignedUrl("videos", item.video_url);
  const [commentText, setCommentText] = useState("");
  const [reportReason, setReportReason] = useState("Negativity or bullying");
  const [reportDetails, setReportDetails] = useState("");

  const { data: likes } = useQuery({
    queryKey: ["likes", item.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("video_likes").select("user_id").eq("video_id", item.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", item.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, body, created_at, user_id, profiles:user_id(username)")
        .eq("video_id", item.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; body: string; user_id: string; profiles: { username: string } | null }>;
    },
  });

  const { data: following } = useQuery({
    queryKey: ["following", userId, item.user_id],
    enabled: !!userId && userId !== item.user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId!)
        .eq("following_id", item.user_id)
        .maybeSingle();
      return !!data;
    },
  });

  const liked = !!likes?.some((l) => l.user_id === userId);

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in first");
      if (liked) {
        const { error } = await supabase.from("video_likes").delete().eq("video_id", item.id).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("video_likes").insert({ video_id: item.id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["likes", item.id] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in first");
      if (following) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", userId)
          .eq("following_id", item.user_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: userId, following_id: item.user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success(following ? "Unfollowed" : "Following — their clips will show in Following");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const res = await postComment({ data: { videoId: item.id, body: commentText } });
      if (!res.ok) throw new Error(res.reason || "That comment isn't positive enough for the hive.");
    },
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["comments", item.id] });
      toast.success("Comment posted 🐝");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const block = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in first");
      const { error } = await supabase.from("blocks").insert({ blocker_id: userId, blocked_id: item.user_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Blocked. You won't see them again.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const report = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in first");
      const { error } = await supabase.from("reports").insert({
        reporter_id: userId,
        video_id: item.id,
        reported_user_id: item.user_id,
        reason: reportReason,
        details: reportDetails,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReportDetails("");
      toast.success("Reported. Moderators will review it.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <article className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-lg">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full bg-primary/15 text-lg">🐝</div>
          <div>
            <Link
              to="/u/$username"
              params={{ username: item.author?.username ?? "" }}
              className="text-sm font-bold hover:underline"
            >
              @{item.author?.username ?? "unknown"}
            </Link>
            <p className="text-xs text-muted-foreground">
              {item.author?.karma ?? 0} karma
              {item.kind !== "original" && (
                <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  {item.kind === "duet" ? "Duet" : "Stitch"}
                </span>
              )}
            </p>
          </div>
        </div>
        {userId !== item.user_id && (
          <Button size="sm" variant={following ? "secondary" : "default"} onClick={() => toggleFollow.mutate()}>
            {following ? <UserMinus className="mr-1 size-4" /> : <UserPlus className="mr-1 size-4" />}
            {following ? "Following" : "Follow"}
          </Button>
        )}
      </div>

      <div className="relative bg-black">
        {url ? (
          <video
            src={url}
            controls
            playsInline
            loop
            className="max-h-[70vh] w-full object-contain"
            onPlay={() => supabase.rpc("increment_views", { _video_id: item.id })}
          />
        ) : (
          <div className="grid h-64 place-items-center text-sm text-muted-foreground">Loading clip…</div>
        )}
      </div>

      <div className="space-y-3 px-4 py-3">
        <p className="text-sm">{item.caption}</p>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={liked ? "default" : "secondary"} onClick={() => toggleLike.mutate()}>
            <Heart className={liked ? "mr-1 size-4 fill-current" : "mr-1 size-4"} /> {likes?.length ?? 0}
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <Link to="/upload" search={{ parent: item.id, kind: "duet" }}>
              <Repeat2 className="mr-1 size-4" /> Duet
            </Link>
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <Link to="/upload" search={{ parent: item.id, kind: "stitch" }}>
              <Scissors className="mr-1 size-4" /> Stitch
            </Link>
          </Button>
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="size-4" /> {item.view_count}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost">
                <MessageSquare className="mr-1 size-4" /> {comments?.length ?? 0} comments
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Kind words only 🐝</DialogTitle>
              </DialogHeader>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {(comments ?? []).map((c) => (
                  <div key={c.id} className="rounded-xl bg-secondary/60 px-3 py-2 text-sm">
                    <span className="font-semibold">@{c.profiles?.username ?? "bee"}</span> {c.body}
                  </div>
                ))}
                {comments?.length === 0 && <p className="text-sm text-muted-foreground">Be the first to cheer.</p>}
              </div>
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={400}
                placeholder="Say something uplifting…"
              />
              <Button disabled={!commentText.trim() || addComment.isPending} onClick={() => addComment.mutate()}>
                {addComment.isPending ? "Checking positivity…" : "Post comment"}
              </Button>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost">
                <Flag className="mr-1 size-4" /> Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report this clip</DialogTitle>
              </DialogHeader>
              <Input value={reportReason} onChange={(e) => setReportReason(e.target.value)} maxLength={100} />
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                maxLength={500}
                placeholder="What happened?"
              />
              <Button onClick={() => report.mutate()} disabled={report.isPending}>
                Send report
              </Button>
            </DialogContent>
          </Dialog>

          {userId !== item.user_id && (
            <Button size="sm" variant="ghost" onClick={() => block.mutate()}>
              <Ban className="mr-1 size-4" /> Block
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
