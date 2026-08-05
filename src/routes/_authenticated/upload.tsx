import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/lib/hive";
import { publishVideo } from "@/lib/hive.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type UploadSearch = { parent?: string | undefined; kind?: "original" | "duet" | "stitch" | undefined };

export const Route = createFileRoute("/_authenticated/upload")({
  validateSearch: (search: Record<string, unknown>): UploadSearch => {
    const rawKind = search["kind"];
    const rawParent = search["parent"];
    return {
      parent: typeof rawParent === "string" ? rawParent : undefined,
      kind: rawKind === "duet" || rawKind === "stitch" || rawKind === "original" ? rawKind : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Post a clip · Hive" },
      { name: "description", content: "Upload a short video to Hive. AI checks it for positivity before it goes live." },
      { property: "og:title", content: "Post a clip · Hive" },
      { property: "og:description", content: "Upload a short video to Hive — AI-moderated for positivity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const { parent, kind } = Route.useSearch();
  const { userId } = useSessionUser();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file || !userId) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("videos").upload(path, file, {
        contentType: file.type || "video/mp4",
      });
      if (upErr) throw upErr;

      const res = await publishVideo({
        data: {
          videoPath: path,
          caption,
          tags: tags
            .split(/[\s,#]+/)
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 8),
          kind: kind ?? "original",
          parentVideoId: parent ?? null,
        },
      });

      if (res.status === "approved") {
        toast.success("Approved and live 🐝 +karma");
        navigate({ to: "/feed" });
      } else {
        toast.error(`On hold: ${res.moderation_reason}`);
        navigate({ to: "/studio" });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight">
          {kind === "duet" ? "Duet a clip" : kind === "stitch" ? "Stitch a clip" : "Post a clip"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Every upload passes an AI positivity check. Kind, funny, creative and neutral all welcome.
        </p>
      </div>

      <div className="space-y-4 rounded-3xl border border-border/60 bg-card p-5">
        <div>
          <Label htmlFor="file">Video file</Label>
          <Input id="file" type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <Label htmlFor="caption">Caption</Label>
          <Textarea
            id="caption"
            maxLength={500}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's the good news?"
          />
        </div>
        <div>
          <Label htmlFor="tags">Tags</Label>
          <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="kindness wins dance" />
        </div>
        <Button className="w-full" disabled={!file || busy} onClick={submit}>
          {busy ? "Uploading & checking positivity…" : "Publish to the hive"}
        </Button>
      </div>
    </div>
  );
}
