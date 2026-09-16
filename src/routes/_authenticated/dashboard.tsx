import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { DonationPhoto } from "@/components/DonationPhoto";
import { useMe, useSession } from "@/hooks/useSession";
import {
  ROLE_LABEL,
  STATUS_LABEL,
  countdown,
  type DonationRow,
} from "@/lib/donations";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — Canopy" },
      {
        name: "description",
        content:
          "Track the crates you posted and the pickups you claimed, with live status for every handoff.",
      },
      { property: "og:title", content: "Your dashboard — Canopy" },
      {
        property: "og:description",
        content: "Your posted crates and claimed pickups in one place.",
      },
    ],
  }),
  component: DashboardPage,
});

function DonationRowCard({ donation }: { donation: DonationRow }) {
  return (
    <Link
      to="/donations/$donationId"
      params={{ donationId: donation.id }}
      className="panel flex items-center gap-4 p-3 transition-transform hover:-translate-y-0.5"
    >
      <DonationPhoto
        path={donation.photo_url}
        alt={donation.title}
        className="size-14 shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {donation.title}, {Number(donation.quantity)} {donation.unit}
        </p>
        <p className="text-xs text-muted-foreground">
          {STATUS_LABEL[donation.status]} · {countdown(donation.expires_at, Date.now())}
        </p>
      </div>
      <span className="font-mono text-[11px] text-brand-deep">track</span>
    </Link>
  );
}

function DashboardPage() {
  const { user } = useSession();
  const { data: me } = useMe(user?.id);

  const { data: posted = [] } = useQuery({
    queryKey: ["donations", "mine", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("donor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DonationRow[];
    },
  });

  const { data: claimed = [] } = useQuery({
    queryKey: ["donations", "claimed", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("claimed_by", user!.id)
        .order("claimed_at", { ascending: false });
      if (error) throw error;
      return data as DonationRow[];
    },
  });

  const delivered = [...posted, ...claimed].filter((d) => d.status === "delivered").length;
  const inFlight = [...posted, ...claimed].filter(
    (d) => d.status === "claimed" || d.status === "picked_up",
  ).length;

  return (
    <div className="mt-6 grid grid-cols-12 gap-5">
      <section className="col-span-12 lg:col-span-4">
        <div className="panel p-5">
          <p className="label-mono">{me?.role ? ROLE_LABEL[me.role] : "Member"} dashboard</p>
          <h1 className="mt-3 text-3xl leading-tight font-semibold text-balance">
            {me?.fullName ? `Hello, ${me.fullName.split(" ")[0]}.` : "Your handoffs."}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Everything you posted or claimed, with the crates still moving at the top.
          </p>
          <Link
            to="/post"
            className="mt-5 block rounded-lg bg-brand-deep py-2.5 text-center text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Post a donation
          </Link>
          <Link to="/discover" className="mt-2 block text-center text-sm text-muted-foreground">
            Find crates nearby
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="panel-tight p-4">
            <p className="font-mono text-2xl font-semibold tabular">{posted.length}</p>
            <p className="text-xs text-muted-foreground">posted</p>
          </div>
          <div className="panel-tight p-4">
            <p className="font-mono text-2xl font-semibold tabular">{inFlight}</p>
            <p className="text-xs text-muted-foreground">in flight</p>
          </div>
          <div className="panel-tight p-4">
            <p className="font-mono text-2xl font-semibold tabular">{delivered}</p>
            <p className="text-xs text-muted-foreground">delivered</p>
          </div>
        </div>
      </section>

      <section className="col-span-12 space-y-6 lg:col-span-8">
        <div>
          <div className="flex items-center justify-between pb-3">
            <p className="text-sm font-medium">Crates you posted</p>
            <p className="label-mono tracking-normal normal-case">{posted.length} total</p>
          </div>
          <div className="space-y-3">
            {posted.length === 0 && (
              <div className="panel p-5 text-sm text-muted-foreground">
                Nothing posted yet — your surplus listings will appear here.
              </div>
            )}
            {posted.map((donation) => (
              <DonationRowCard key={donation.id} donation={donation} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between pb-3">
            <p className="text-sm font-medium">Pickups you claimed</p>
            <p className="label-mono tracking-normal normal-case">{claimed.length} total</p>
          </div>
          <div className="space-y-3">
            {claimed.length === 0 && (
              <div className="panel p-5 text-sm text-muted-foreground">
                No claims yet — open Explore to claim the nearest crate.
              </div>
            )}
            {claimed.map((donation) => (
              <DonationRowCard key={donation.id} donation={donation} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
