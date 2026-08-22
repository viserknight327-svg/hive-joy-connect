import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type CallbackSearch = {
  next: string | undefined;
  code: string | undefined;
  error_description: string | undefined;
};

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): CallbackSearch => ({
    next: typeof search["next"] === "string" ? search["next"] : undefined,
    code: typeof search["code"] === "string" ? search["code"] : undefined,
    error_description:
      typeof search["error_description"] === "string" ? search["error_description"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Confirming your Hive account" },
      { name: "description", content: "Securely completing your Hive sign-in." },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/callback" });
  const [status, setStatus] = useState("Securing your session…");

  useEffect(() => {
    let active = true;

    async function finishAuth() {
      const next =
        typeof search.next === "string" && search.next.startsWith("/") ? search.next : "/feed";
      const queryError =
        typeof search.error_description === "string" ? search.error_description : null;

      if (queryError) {
        toast.error(queryError.replace(/\+/g, " "));
        if (active) setStatus("That link could not be completed.");
        window.setTimeout(() => navigate({ to: "/" }), 900);
        return;
      }

      const code = typeof search.code === "string" ? search.code : null;
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast.error(error.message);
          if (active) setStatus("That link has expired. Please request a new one.");
          window.setTimeout(() => navigate({ to: "/" }), 1200);
          return;
        }
      } else {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          if (active) setStatus("We could not find an active session for this link.");
          window.setTimeout(() => navigate({ to: "/" }), 1200);
          return;
        }
      }

      if (!active) return;
      setStatus("Your Hive account is ready.");
      toast.success("Welcome back to the Hive.");
      window.setTimeout(() => navigate({ to: next }), 450);
    }

    void finishAuth();
    return () => {
      active = false;
    };
  }, [navigate, search]);

  return (
    <main className="honeycomb flex min-h-screen items-center justify-center px-5 py-16">
      <div className="card-3d w-full max-w-md rounded-[2rem] border border-border/60 bg-card/95 p-8 text-center shadow-2xl">
        <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-primary/15 text-primary">
          {status.includes("ready") ? (
            <CheckCircle2 className="size-8" />
          ) : (
            <Loader2 className="size-8 animate-spin" />
          )}
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          <ShieldCheck className="size-4" /> Secure Hive entry
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight">{status}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We use a short-lived secure handoff so email verification and password recovery work
          reliably on Vercel, previews, and mobile.
        </p>
      </div>
    </main>
  );
}
