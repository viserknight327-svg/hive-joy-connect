import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hive — the positive-only video community" },
      {
        name: "description",
        content:
          "Hive is a private, AI-moderated short-video community. Post clips, earn karma, duet and stitch — negativity never makes it in.",
      },
      { property: "og:title", content: "Hive — the positive-only video community" },
      {
        property: "og:description",
        content: "Private, AI-moderated short video. Earn karma, duet, stitch and keep it kind.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/feed" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/feed" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function withEmail() {
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your hive account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function withGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Try email instead.");
      return;
    }
  }

  return (
    <div className="honeycomb min-h-screen">
      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            🐝 Private · AI-moderated · Positive only
          </span>
          <h1 className="mt-5 text-5xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Welcome to the <span className="text-primary">Hive</span>
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Short videos without the sting. Every clip, comment and DM passes an AI positivity check before it lands.
            Earn karma, climb from Larva to Queen Bee, duet and stitch your friends — and appeal anything you think we
            got wrong.
          </p>
          <ul className="mt-6 grid gap-2 text-sm text-muted-foreground">
            <li>🍯 Karma points and hive tiers for uplifting creators</li>
            <li>🎬 Positive-only duets and stitches</li>
            <li>🛡️ Reporting, blocking and an AI appeal flow</li>
            <li>💬 Moderated direct messages and a Following feed</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-2xl backdrop-blur">
          <h2 className="text-lg font-bold">{mode === "signin" ? "Enter the hive" : "Join the hive"}</h2>
          <Button className="mt-4 w-full" variant="secondary" onClick={withGoogle}>
            Continue with Google
          </Button>
          <div className="my-4 text-center text-xs text-muted-foreground">or use email</div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button className="w-full" disabled={busy || !email || !password} onClick={withEmail}>
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
            <button
              className="w-full text-center text-xs text-muted-foreground underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "New here? Create an account" : "Already a bee? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
