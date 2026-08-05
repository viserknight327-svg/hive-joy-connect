import { supabase } from "@/integrations/supabase/client";
import type { FeedItem } from "@/components/hive/video-card";
import type { Profile, VideoRow } from "@/lib/hive";

export async function hydrateVideos(rows: VideoRow[]): Promise<FeedItem[]> {
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: authors } = ids.length
    ? await supabase.from("profiles").select("*").in("id", ids)
    : { data: [] as Profile[] };
  const byId = new Map((authors ?? []).map((a) => [a.id, a as Profile]));
  return rows.map((r) => ({ ...r, author: byId.get(r.user_id) ?? null }));
}

export async function fetchFeed(opts: { userId: string | null; mode: "foryou" | "following" }) {
  let followingIds: string[] = [];
  if (opts.userId) {
    const { data } = await supabase.from("follows").select("following_id").eq("follower_id", opts.userId);
    followingIds = (data ?? []).map((f) => f.following_id);
  }

  let query = supabase
    .from("videos")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);

  if (opts.mode === "following") {
    if (followingIds.length === 0) return [];
    query = query.in("user_id", followingIds);
  }

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []) as VideoRow[];

  if (opts.userId) {
    const { data: blocks } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", opts.userId);
    const blocked = new Set((blocks ?? []).map((b) => b.blocked_id));
    rows = rows.filter((r) => !blocked.has(r.user_id));
  }

  return hydrateVideos(rows);
}
