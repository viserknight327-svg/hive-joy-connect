import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string;
  about: string;
  link_url: string | null;
  accent: string;
  pinned_video_id: string | null;
  karma: number;
  created_at: string;
};

export const ACCENT_RING: Record<string, string> = {
  honey: "from-amber-400/40 to-amber-200/5",
  meadow: "from-emerald-400/40 to-emerald-200/5",
  berry: "from-fuchsia-400/40 to-fuchsia-200/5",
  sky: "from-sky-400/40 to-sky-200/5",
};


export type VideoRow = {
  id: string;
  user_id: string;
  video_url: string;
  caption: string;
  tags: string[];
  status: "pending" | "approved" | "rejected";
  moderation_reason: string | null;
  positivity_score: number;
  kind: "original" | "duet" | "stitch";
  parent_video_id: string | null;
  view_count: number;
  created_at: string;
};

export function karmaTier(karma: number) {
  if (karma >= 2000) return { label: "Queen Bee", emoji: "👑" };
  if (karma >= 800) return { label: "Honey Maker", emoji: "🍯" };
  if (karma >= 250) return { label: "Forager", emoji: "🌻" };
  if (karma >= 60) return { label: "Worker Bee", emoji: "🐝" };
  return { label: "Larva", emoji: "🥚" };
}

export function useSessionUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
      setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { userId, ready };
}

export function useMyProfile() {
  const { userId, ready } = useSessionUser();
  const query = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
  return { ...query, userId, ready };
}

export function useIsStaff() {
  const { userId } = useSessionUser();
  return useQuery({
    queryKey: ["roles", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).some((r) => r.role === "admin" || r.role === "moderator");
    },
  });
}

const signedCache = new Map<string, string>();

export async function signedMediaUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;
  const key = `${bucket}/${path}`;
  const cached = signedCache.get(key);
  if (cached) return cached;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error || !data) return null;
  signedCache.set(key, data.signedUrl);
  return data.signedUrl;
}

export function useSignedUrl(bucket: string, path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    signedMediaUrl(bucket, path).then((u) => active && setUrl(u));
    return () => {
      active = false;
    };
  }, [bucket, path]);
  return url;
}
