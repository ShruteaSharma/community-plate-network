import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { DonationPhoto } from "@/components/DonationPhoto";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useMe, useSession } from "@/hooks/useSession";
import {
  countdown,
  distanceKm,
  formatDistance,
  isUrgent,
  timeOnly,
  type DonationRow,
} from "@/lib/donations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({
    meta: [
      { title: "Nearby donations — Canopy" },
      {
        name: "description",
        content:
          "Browse surplus food donations near you, sorted by expiry, and claim a crate for pickup.",
      },
      { property: "og:title", content: "Nearby donations — Canopy" },
      {
        property: "og:description",
        content: "Live surplus food near you, sorted by expiry and distance.",
      },
    ],
  }),
  component: DiscoverPage,
});

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function DiscoverPage() {
  const { user } = useSession();
  const { data: me } = useMe(user?.id);
  const { coords, status, request } = useGeolocation();
  const now = useNow();
  const queryClient = useQueryClient();

  const { data: donations = [], isLoading } = useQuery({
    queryKey: ["donations", "open"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("status", "posted")
        .order("expires_at", { ascending: true });
      if (error) throw error;
      return data as DonationRow[];
    },
  });

  const { data: totals } = useQuery({
    queryKey: ["totals"],
    queryFn: async () => {
      const [delivered, ngos] = await Promise.all([
        supabase.from("donations").select("quantity, unit, status"),
        supabase.from("user_roles").select("role").eq("role", "ngo"),
      ]);
      const rows = delivered.data ?? [];
      const meals = rows
        .filter((r) => r.status === "delivered")
        .reduce((sum, r) => sum + Number(r.quantity ?? 0), 0);
      const kg = rows
        .filter((r) => r.status === "delivered" && r.unit === "kg")
        .reduce((sum, r) => sum + Number(r.quantity ?? 0), 0);
      return { meals, kg, ngos: ngos.data?.length ?? 0 };
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("donations-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "donations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["donations"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const claim = useMutation({
    mutationFn: async (donation: DonationRow) => {
      const { error } = await supabase
        .from("donations")
        .update({
          status: "claimed",
          claimed_by: user?.id ?? null,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", donation.id)
        .eq("status", "posted");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Crate claimed — track it from your dashboard");
      queryClient.invalidateQueries({ queryKey: ["donations"] });
    },
    onError: () => toast.error("That crate was just claimed by someone else"),
  });

  const sorted = coords
    ? [...donations].sort((a, b) => {
        const da = distanceKm(coords, a) ?? Infinity;
        const db = distanceKm(coords, b) ?? Infinity;
        return da - db;
      })
    : donations;

  return (
    <>
      <div className="mt-6 grid grid-cols-12 gap-5">
        <section className="col-span-12 lg:col-span-4">
          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-accent" />
              <p className="label-mono">Live handoffs</p>
            </div>
            <h1 className="mt-3 text-4xl leading-none font-semibold text-balance">
              Warm food, moved before it cools.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground">
              Canopy routes surplus from cafés and kitchens to neighbourhood pantries in
              minutes, not days. Every claim is a handoff you can track.
            </p>
            {status === "granted" ? (
              <p className="mt-5 rounded-lg bg-brand/10 px-3 py-2 text-xs font-medium text-brand-deep">
                Sorted by distance from your location
              </p>
            ) : (
              <button
                onClick={request}
                className="mt-5 w-full rounded-lg bg-brand-deep py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                {status === "locating" ? "Finding you…" : "Use my location"}
              </button>
            )}
            <Link
              to="/post"
              className="mt-2 block text-center text-sm text-muted-foreground"
            >
              Post a donation
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="panel-tight p-4">
              <p className="font-mono text-2xl font-semibold text-foreground tabular">
                {totals?.meals ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">meals rescued</p>
            </div>
            <div className="panel-tight p-4">
              <p className="font-mono text-2xl font-semibold text-foreground tabular">
                {Math.round(totals?.kg ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">kg diverted</p>
            </div>
            <div className="panel-tight p-4">
              <p className="font-mono text-2xl font-semibold text-foreground tabular">
                {totals?.ngos ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">active NGOs</p>
            </div>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-8">
          <div className="flex items-center justify-between pb-3">
            <p className="text-sm font-medium">Nearby donations</p>
            <p className="label-mono tracking-normal normal-case">
              {coords ? "sorted by distance" : "sorted by expiry"}
            </p>
          </div>

          <div className="space-y-4">
            {isLoading && (
              <div className="panel p-6 text-sm text-muted-foreground">Loading crates…</div>
            )}

            {!isLoading && sorted.length === 0 && (
              <div className="panel p-6">
                <p className="text-sm font-medium">No open donations right now</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {me?.role === "donor"
                    ? "Post your surplus and it will appear here for NGOs and volunteers."
                    : "Check back shortly — new crates appear the moment a donor posts them."}
                </p>
              </div>
            )}

            {sorted.map((donation) => {
              const km = coords ? distanceKm(coords, donation) : null;
              const urgent = isUrgent(donation.expires_at, now);
              const mine = donation.donor_id === user?.id;
              return (
                <article
                  key={donation.id}
                  className="panel grid grid-cols-[150px_1fr] gap-4 p-4 transition-transform hover:-translate-y-0.5"
                >
                  <DonationPhoto
                    path={donation.photo_url}
                    alt={donation.title}
                    className="size-[150px] rounded-xl"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          to="/donations/$donationId"
                          params={{ donationId: donation.id }}
                          className="text-base font-semibold text-card-foreground"
                        >
                          {donation.title}, {Number(donation.quantity)} {donation.unit}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {donation.address || "Pickup address on claim"} ·{" "}
                          {formatDistance(km)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-3 py-1 font-mono text-xs font-medium tabular ring-1",
                          urgent
                            ? "bg-accent/15 text-accent-ink ring-accent/30"
                            : "bg-success-soft text-success ring-success/30",
                        )}
                      >
                        {countdown(donation.expires_at, now)}
                      </span>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <span className="text-xs text-muted-foreground">
                        Pick by {timeOnly(donation.expires_at)} · {donation.storage_type}
                      </span>
                      {mine ? (
                        <Link
                          to="/donations/$donationId"
                          params={{ donationId: donation.id }}
                          className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground ring-1 ring-border"
                        >
                          Your crate
                        </Link>
                      ) : (
                        <button
                          onClick={() => claim.mutate(donation)}
                          disabled={claim.isPending}
                          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                        >
                          Claim crate
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
