import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, HeartHandshake, LockKeyhole, Sparkles, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
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
          "Hive is a private, AI-moderated short-video community where good energy gets rewarded.",
      },
      { property: "og:title", content: "Hive — short videos, better energy" },
      {
        property: "og:description",
        content: "A private, AI-moderated community built for creators who want to keep it kind.",
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
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
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
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/feed`,
            ...(username.trim() ? { data: { username: username.trim() } } : {}),
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your Hive account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    if (!email) {
      toast.error("Enter your email first, then tap reset.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent — check your inbox.");
  }

  return (
    <main className="honeycomb min-h-screen overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 py-6 md:px-8 md:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={hiveLogo}
              alt="Hive logo"
              width={1024}
              height={1024}
              className="raised size-10 rounded-2xl bg-primary/10 p-1"
            />
            <div>
              <div className="text-lg font-black tracking-tight">Hive</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Good energy only
              </div>
            </div>
          </div>
          <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary sm:inline-flex">
            Private beta · built for creators
          </span>
        </header>

        <section className="grid gap-12 pb-14 pt-14 md:grid-cols-[1.08fr_0.92fr] md:items-center md:pb-24 md:pt-20">
          <div className="relative">
            <div className="absolute -left-20 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" />
            <p className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary">
              <Sparkles className="size-4" /> The kinder short-video network
            </p>
            <h1 className="relative mt-5 max-w-2xl text-5xl font-black leading-[0.98] tracking-[-0.05em] md:text-7xl">
              Create your corner of the internet.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Hive is where uplifting clips find their people. Share your work, build real
              connections, and earn karma for making the feed better.
            </p>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {(
                [
                  [HeartHandshake, "Kind by design"],
                  [LockKeyhole, "Private by default"],
                  [UsersRound, "Community first"],
                ] as const
              ).map(([Icon, label]) => (
                <div
                  key={label}
                  className="card-3d rounded-2xl border border-border/60 bg-card/70 p-4"
                >
                  <Icon className="size-5 text-primary" />
                  <div className="mt-3 text-sm font-bold">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-3d relative rounded-[2rem] border border-primary/25 bg-card/95 p-6 shadow-2xl md:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  {mode === "signin" ? "Welcome back" : "Your next chapter"}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {mode === "signin" ? "Enter the Hive" : "Join the Hive"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {mode === "signin"
                    ? "Pick up where your good energy left off."
                    : "Create a handle people will remember."}
                </p>
              </div>
              <div className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                ✦
              </div>
            </div>
            <div className="space-y-4">
              {mode === "signup" && (
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    autoComplete="username"
                    placeholder="honeybee"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && email && password && !busy) void withEmail();
                  }}
                />
              </div>
              <Button
                className="group h-12 w-full rounded-2xl text-base font-bold"
                disabled={busy || !email || !password}
                onClick={withEmail}
              >
                {mode === "signin" ? "Sign in to Hive" : "Create my account"}
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Button>
              {mode === "signin" && (
                <button
                  className="w-full text-center text-xs text-muted-foreground underline underline-offset-4"
                  disabled={busy}
                  onClick={forgotPassword}
                >
                  Forgot your password?
                </button>
              )}
              <button
                className="w-full text-center text-xs font-semibold text-primary underline underline-offset-4"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin" ? "New here? Create an account" : "Already a bee? Sign in"}
              </button>
            </div>
            <div className="mt-6 border-t border-border/60 pt-5">
              <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
                <Check className="size-4 shrink-0 text-accent" /> Email confirmation links now
                return safely to the app.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
