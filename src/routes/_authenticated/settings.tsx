import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile, useSessionUser, useSignedUrl, type VideoRow } from "@/lib/hive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Edit profile · Hive" },
      {
        name: "description",
        content: "Customise your Hive profile: avatar, banner, about me, link, theme colour and pinned clip.",
      },
      { property: "og:title", content: "Edit profile · Hive" },
      { property: "og:description", content: "Avatar, banner, about me, theme and pinned clip." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});

const ACCENTS = [
  { key: "honey", label: "Honey", swatch: "bg-amber-400" },
  { key: "meadow", label: "Meadow", swatch: "bg-emerald-400" },
  { key: "berry", label: "Berry", swatch: "bg-fuchsia-400" },
  { key: "sky", label: "Sky", swatch: "bg-sky-400" },
];

function ImageField({
  label,
  bucket,
  path,
  onUpload,
  aspect,
}: {
  label: string;
  bucket: string;
  path: string | null;
  onUpload: (p: string) => void;
  aspect: string;
}) {
  const url = useSignedUrl(bucket, path);
  const { userId } = useSessionUser();
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <div className={cn("overflow-hidden rounded-2xl border border-border/60 bg-secondary/40", aspect)}>
        {url && <img src={url} alt={`${label} preview`} className="size-full object-cover" />}
      </div>
      <Input
        type="file"
        accept="image/*"
        className="mt-2"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !userId) return;
          if (file.size > 8 * 1024 * 1024) {
            toast.error("Keep images under 8MB.");
            return;
          }
          setBusy(true);
          const key = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "")}`;
          const { error } = await supabase.storage.from(bucket).upload(key, file, { upsert: true });
          setBusy(false);
          if (error) {
            toast.error(error.message);
            return;
          }
          onUpload(key);
        }}
      />
    </div>
  );
}

function Settings() {
  const { userId } = useSessionUser();
  const { data: profile } = useMyProfile();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    about: "",
    link_url: "",
    accent: "honey",
    avatar_url: null as string | null,
    banner_url: null as string | null,
    pinned_video_id: null as string | null,
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      display_name: profile.display_name ?? "",
      bio: profile.bio ?? "",
      about: (profile as { about?: string }).about ?? "",
      link_url: (profile as { link_url?: string | null }).link_url ?? "",
      accent: (profile as { accent?: string }).accent ?? "honey",
      avatar_url: profile.avatar_url ?? null,
      banner_url: (profile as { banner_url?: string | null }).banner_url ?? null,
      pinned_video_id: (profile as { pinned_video_id?: string | null }).pinned_video_id ?? null,
    });
  }, [profile]);

  const { data: myClips } = useQuery({
    queryKey: ["my-approved-clips", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("videos")
        .select("*")
        .eq("user_id", userId!)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      return (data ?? []) as VideoRow[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (form.link_url && !/^https?:\/\/\S+$/.test(form.link_url)) throw new Error("Link must start with http(s)://");
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: form.display_name.trim().slice(0, 60),
          bio: form.bio.trim().slice(0, 200),
          about: form.about.trim().slice(0, 1000),
          link_url: form.link_url.trim() || null,
          accent: form.accent,
          avatar_url: form.avatar_url,
          banner_url: form.banner_url,
          pinned_video_id: form.pinned_video_id,
        })
        .eq("id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["profile-by-name"] });
      toast.success("Profile updated 🐝");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/60 bg-card p-6">
        <h1 className="text-2xl font-black tracking-tight">Edit your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Make your corner of the hive yours.</p>
      </section>

      <section className="grid gap-4 rounded-3xl border border-border/60 bg-card p-6 sm:grid-cols-2">
        <ImageField
          label="Avatar"
          bucket="avatars"
          path={form.avatar_url}
          aspect="aspect-square max-w-40"
          onUpload={(p) => setForm((f) => ({ ...f, avatar_url: p }))}
        />
        <ImageField
          label="Banner"
          bucket="avatars"
          path={form.banner_url}
          aspect="aspect-[3/1]"
          onUpload={(p) => setForm((f) => ({ ...f, banner_url: p }))}
        />
      </section>

      <section className="space-y-4 rounded-3xl border border-border/60 bg-card p-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Display name</p>
          <Input
            value={form.display_name}
            maxLength={60}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Bio</p>
          <Input value={form.bio} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">About me</p>
          <Textarea
            value={form.about}
            maxLength={1000}
            rows={4}
            onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
            placeholder="What do you post? What lifts you up?"
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Link</p>
          <Input
            value={form.link_url}
            maxLength={200}
            placeholder="https://…"
            onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Profile theme</p>
          <div className="flex gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.key}
                onClick={() => setForm((f) => ({ ...f, accent: a.key }))}
                className={cn(
                  "flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs font-semibold",
                  form.accent === a.key && "border-primary bg-primary/10 text-primary",
                )}
              >
                <span className={cn("size-3 rounded-full", a.swatch)} /> {a.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Pinned clip</p>
          <div className="space-y-2">
            <button
              onClick={() => setForm((f) => ({ ...f, pinned_video_id: null }))}
              className={cn(
                "w-full rounded-xl border border-border/60 px-3 py-2 text-left text-sm",
                !form.pinned_video_id && "border-primary bg-primary/10",
              )}
            >
              No pinned clip
            </button>
            {(myClips ?? []).map((v) => (
              <button
                key={v.id}
                onClick={() => setForm((f) => ({ ...f, pinned_video_id: v.id }))}
                className={cn(
                  "w-full rounded-xl border border-border/60 px-3 py-2 text-left text-sm",
                  form.pinned_video_id === v.id && "border-primary bg-primary/10",
                )}
              >
                {v.caption || "Untitled clip"}
              </button>
            ))}
          </div>
        </div>
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save profile"}
        </Button>
      </section>
    </div>
  );
}
