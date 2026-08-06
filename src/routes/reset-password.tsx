import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset your Hive password" },
      { name: "description", content: "Choose a new password for your Hive account and get back to the positive-only feed." },
      { property: "og:title", content: "Reset your Hive password" },
      { property: "og:description", content: "Choose a new password for your Hive account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (password.length < 6) {
      toast.error("Use at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated — welcome back to the hive.");
    navigate({ to: "/feed" });
  }

  return (
    <main className="honeycomb flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card/90 p-6 shadow-2xl backdrop-blur">
        <h1 className="text-lg font-bold">Set a new password</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Open this page from the reset link in your email, then choose a new password.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={busy || !password || !confirm} onClick={submit}>
            Update password
          </Button>
        </div>
      </div>
    </main>
  );
}
