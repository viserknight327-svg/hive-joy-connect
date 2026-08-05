import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Upload, MessageCircle, Shield, User, Clapperboard } from "lucide-react";
import { useIsStaff, useMyProfile, karmaTier } from "@/lib/hive";
import { cn } from "@/lib/utils";

const items = [
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/upload", label: "Post", icon: Upload },
  { to: "/studio", label: "Studio", icon: Clapperboard },
  { to: "/chat", label: "Chat", icon: MessageCircle },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: profile } = useMyProfile();
  const { data: isStaff } = useIsStaff();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tier = karmaTier(profile?.karma ?? 0);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/feed" className="flex items-center gap-2">
            <span className="text-2xl leading-none">🐝</span>
            <span className="text-lg font-black tracking-tight">Hive</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((i) => (
              <Link
                key={i.to}
                to={i.to}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground",
                  path.startsWith(i.to) && "bg-secondary text-foreground",
                )}
              >
                {i.label}
              </Link>
            ))}
            {isStaff && (
              <Link
                to="/moderation"
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground",
                  path.startsWith("/moderation") && "bg-secondary text-foreground",
                )}
              >
                Moderation
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {tier.emoji} {profile?.karma ?? 0} karma
            </span>
            {profile && (
              <Link
                to="/u/$username"
                params={{ username: profile.username }}
                className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium"
              >
                @{profile.username}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-around py-2">
          {items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] text-muted-foreground",
                path.startsWith(i.to) && "text-primary",
              )}
            >
              <i.icon className="size-5" />
              {i.label}
            </Link>
          ))}
          {isStaff ? (
            <Link
              to="/moderation"
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] text-muted-foreground",
                path.startsWith("/moderation") && "text-primary",
              )}
            >
              <Shield className="size-5" />
              Mod
            </Link>
          ) : (
            profile && (
              <Link
                to="/u/$username"
                params={{ username: profile.username }}
                className="flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] text-muted-foreground"
              >
                <User className="size-5" />
                Me
              </Link>
            )
          )}
        </div>
      </nav>
    </div>
  );
}
