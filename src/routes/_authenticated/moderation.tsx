import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsStaff, type VideoRow } from "@/lib/hive";
import { staffModerate, decideAppeal } from "@/lib/hive.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/moderation")({
  head: () => ({
    meta: [
      { title: "Moderation · Hive" },
      { name: "description", content: "Review reports, held clips and appeals to keep the Hive positive." },
      { property: "og:title", content: "Moderation · Hive" },
      { property: "og:description", content: "Review reports, held clips and appeals on Hive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Moderation,
});

function Moderation() {
  const { data: isStaff, isLoading } = useIsStaff();
  const qc = useQueryClient();

  const { data: held } = useQuery({
    queryKey: ["held-videos"],
    enabled: !!isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .neq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VideoRow[];
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["reports"],
    enabled: !!isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: appeals } = useQuery({
    queryKey: ["appeals"],
    enabled: !!isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appeals")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const moderate = useMutation({
    mutationFn: (v: { videoId: string; decision: "approved" | "rejected" }) =>
      staffModerate({ data: { videoId: v.videoId, decision: v.decision, reason: "Reviewed by a human moderator" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["held-videos"] });
      toast.success("Decision saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolveAppeal = useMutation({
    mutationFn: (v: { appealId: string; status: "upheld" | "denied" }) =>
      decideAppeal({ data: { appealId: v.appealId, status: v.status, note: "Reviewed by the hive council" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appeals"] });
      qc.invalidateQueries({ queryKey: ["held-videos"] });
      toast.success("Appeal resolved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reports").update({ status: "dismissed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Checking your badge…</p>;
  if (!isStaff) return <p className="text-sm text-muted-foreground">Moderators only 🐝</p>;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Held clips</h2>
        {(held ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting.</p>}
        {(held ?? []).map((v) => (
          <div key={v.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4">
            <div>
              <p className="text-sm font-semibold">{v.caption || "Untitled"}</p>
              <p className="text-xs text-muted-foreground">{v.moderation_reason}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => moderate.mutate({ videoId: v.id, decision: "approved" })}>
                Approve
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => moderate.mutate({ videoId: v.id, decision: "rejected" })}
              >
                Keep held
              </Button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Reports</h2>
        {(reports ?? []).length === 0 && <p className="text-sm text-muted-foreground">No open reports.</p>}
        {(reports ?? []).map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4">
            <div>
              <p className="text-sm font-semibold">{r.reason}</p>
              <p className="text-xs text-muted-foreground">{r.details}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => closeReport.mutate(r.id)}>
              Resolve
            </Button>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Appeals</h2>
        {(appeals ?? []).length === 0 && <p className="text-sm text-muted-foreground">No pending appeals.</p>}
        {(appeals ?? []).map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-sm">{a.message}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => resolveAppeal.mutate({ appealId: a.id, status: "upheld" })}>
                Restore
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => resolveAppeal.mutate({ appealId: a.id, status: "denied" })}
              >
                Deny
              </Button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
