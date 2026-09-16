import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useMe, useSession } from "@/hooks/useSession";
import { ROLE_LABEL } from "@/lib/donations";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/discover", label: "Explore" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/impact", label: "Impact" },
] as const;

function initials(name: string, email: string) {
  const source = name.trim() || email;
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const { data: me } = useMe(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-paper">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-24 h-96 w-96 rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-chart-4/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <header className="panel-tight flex items-center justify-between px-5 py-3">
          <Link to="/discover" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-brand font-semibold text-primary-foreground">
              C
            </span>
            <span>
              <span className="block text-sm font-semibold leading-none">Canopy</span>
              <span className="label-mono block tracking-normal normal-case">
                food-rescue ops
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-lg bg-secondary/70 p-1 text-sm sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors"
                activeProps={{
                  className: cn("bg-card font-medium text-foreground shadow-sm"),
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {me?.role && (
              <span className="hidden rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-deep md:inline">
                {ROLE_LABEL[me.role]} · {me.fullName || user?.email}
              </span>
            )}
            <button
              onClick={signOut}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign out
            </button>
            <span className="grid size-9 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">
              {initials(me?.fullName ?? "", user?.email ?? "")}
            </span>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
