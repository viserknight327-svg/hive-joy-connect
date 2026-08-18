import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Upload,
  MessageCircle,
  Shield,
  User,
  Clapperboard,
  Compass,
  Trophy,
  Settings as SettingsIcon,
} from "lucide-react";
import { useIsStaff, useMyProfile, karmaTier } from "@/lib/hive";
import { cn } from "@/lib/utils";

const items = [
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/upload", label: "Post", icon: Upload },
  { to: "/challenges", label: "Quests", icon: Trophy },
  { to: "/studio", label: "Studio", icon: Clapperboard },
  { to: "/chat", label: "Chat", icon: MessageCircle },
] as const;

const mobileItems = [
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/upload", label: "Post", icon: Upload },
  { to: "/challenges", label: "Quests", icon: Trophy },
  { to: "/chat", label: "Chat", icon: MessageCircle },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: profile } = useMyProfile();
  const { data: isStaff } = useIsStaff();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tier = karmaTier(profile?.karma ?? 0);

  return (
    <div className="scene-3d min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/feed" className="group flex items-center gap-2">
            <span className="raised grid size-9 place-items-center rounded-2xl bg-primary/15 text-xl transition group-hover:-translate-y-0.5">
              🐝
            </span>
            <span className="text-lg font-black tracking-tight">Hive</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {items.map((i) => (
              <Link
                key={i.to}
                to={i.to}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:-translate-y-0.5 hover:bg-secondary hover:text-foreground",
                  path.startsWith(i.to) && "raised bg-secondary text-foreground",
                )}
              >
                {i.label}
              </Link>
            ))}
            {isStaff && (
              <Link
                to="/moderation"
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:-translate-y-0.5 hover:bg-secondary hover:text-foreground",
                  path.startsWith("/moderation") && "raised bg-secondary text-foreground",
                )}
              >
                Moderation
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <span className="glow-primary hidden rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:inline-block">
              {tier.emoji} {profile?.karma ?? 0} karma
            </span>
            <Link
              to="/settings"
              className={cn(
                "grid size-9 place-items-center rounded-full bg-secondary text-muted-foreground transition hover:-translate-y-0.5 hover:text-foreground",
                path.startsWith("/settings") && "text-primary",
              )}
              aria-label="Profile settings"
            >
              <SettingsIcon className="size-4" />
            </Link>
            {profile && (
              <Link
                to="/u/$username"
                params={{ username: profile.username }}
                className="raised rounded-full bg-secondary px-3 py-1.5 text-sm font-medium transition hover:-translate-y-0.5"
              >
                @{profile.username}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around py-2">
          {mobileItems.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] text-muted-foreground transition",
                path.startsWith(i.to) && "raised bg-secondary/70 text-primary",
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
                "flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] text-muted-foreground transition",
                path.startsWith("/moderation") && "raised bg-secondary/70 text-primary",
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
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] text-muted-foreground transition",
                  path.startsWith("/u/") && "raised bg-secondary/70 text-primary",
                )}
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
