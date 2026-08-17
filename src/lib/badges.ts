import { supabase } from "@/integrations/supabase/client";

export type Badge = {
  code: string;
  label: string;
  emoji: string;
  description: string;
};

export const BADGES: Badge[] = [
  { code: "first_clip", label: "First Buzz", emoji: "🎬", description: "Published your first clip." },
  { code: "kind_commenter", label: "Kind Words", emoji: "💬", description: "Left 5 uplifting comments." },
  { code: "hive_friend", label: "Hive Friend", emoji: "🤝", description: "Followed 3 creators." },
  { code: "collab", label: "Collaborator", emoji: "🔁", description: "Posted a duet or stitch." },
  { code: "karma_60", label: "Worker Bee", emoji: "🐝", description: "Reached 60 karma." },
  { code: "karma_250", label: "Forager", emoji: "🌻", description: "Reached 250 karma." },
  { code: "challenger", label: "Challenger", emoji: "🏅", description: "Completed a daily kindness challenge." },
  { code: "curator", label: "Curator", emoji: "📁", description: "Saved 5 clips to a collection." },
];

/** Recomputes which badges a user has earned and stores any new ones. */
export async function syncAchievements(userId: string) {
  const [videos, comments, follows, saves, entries, profile, earned] = await Promise.all([
    supabase.from("videos").select("id, kind").eq("user_id", userId),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", userId),
    supabase.from("saves").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("challenge_entries").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("profiles").select("karma").eq("id", userId).maybeSingle(),
    supabase.from("user_achievements").select("code").eq("user_id", userId),
  ]);

  const clips = videos.data ?? [];
  const karma = profile.data?.karma ?? 0;
  const has = new Set((earned.data ?? []).map((r) => r.code));

  const shouldHave: string[] = [];
  if (clips.length > 0) shouldHave.push("first_clip");
  if ((comments.count ?? 0) >= 5) shouldHave.push("kind_commenter");
  if ((follows.count ?? 0) >= 3) shouldHave.push("hive_friend");
  if (clips.some((c) => c.kind !== "original")) shouldHave.push("collab");
  if (karma >= 60) shouldHave.push("karma_60");
  if (karma >= 250) shouldHave.push("karma_250");
  if ((entries.count ?? 0) > 0) shouldHave.push("challenger");
  if ((saves.count ?? 0) >= 5) shouldHave.push("curator");

  const missing = shouldHave.filter((c) => !has.has(c));
  if (missing.length > 0) {
    await supabase.from("user_achievements").insert(missing.map((code) => ({ user_id: userId, code })));
  }
  return new Set([...has, ...missing]);
}
