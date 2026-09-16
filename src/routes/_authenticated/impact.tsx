import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { DonationRow } from "@/lib/donations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/impact")({
  head: () => ({
    meta: [
      { title: "Impact analytics — Canopy" },
      {
        name: "description",
        content:
          "Weekly rescue analytics: meals rescued, kilograms diverted, average pickup time and crates moved.",
      },
      { property: "og:title", content: "Impact analytics — Canopy" },
      {
        property: "og:description",
        content: "Meals rescued, kg diverted and pickup speed across the network.",
      },
    ],
  }),
  component: ImpactPage,
});

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function ImpactPage() {
  const { data } = useQuery({
    queryKey: ["impact"],
    queryFn: async () => {
      const [donationsRes, rolesRes] = await Promise.all([
        supabase.from("donations").select("*"),
        supabase.from("user_roles").select("role"),
      ]);
      const donations = (donationsRes.data ?? []) as DonationRow[];
      const roles = rolesRes.data ?? [];

      const delivered = donations.filter((d) => d.status === "delivered");
      const meals = delivered.reduce((sum, d) => sum + Number(d.quantity ?? 0), 0);
      const kg = delivered
        .filter((d) => d.unit === "kg")
        .reduce((sum, d) => sum + Number(d.quantity ?? 0), 0);

      const pickupMinutes = delivered
        .filter((d) => d.claimed_at && d.picked_up_at)
        .map(
          (d) =>
            (new Date(d.picked_up_at!).getTime() - new Date(d.claimed_at!).getTime()) / 60000,
        );
      const avgPickup = pickupMinutes.length
        ? Math.round(pickupMinutes.reduce((a, b) => a + b, 0) / pickupMinutes.length)
        : 0;

      // Crates moved per weekday over the last 7 days (Mon-first).
      const week = new Array(7).fill(0) as number[];
      const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 7;
      donations
        .filter((d) => new Date(d.created_at).getTime() >= cutoff)
        .forEach((d) => {
          const day = (new Date(d.created_at).getDay() + 6) % 7;
          week[day] = (week[day] ?? 0) + 1;
        });

      return {
        meals,
        kg,
        avgPickup,
        crates: donations.length,
        deliveredCount: delivered.length,
        open: donations.filter((d) => d.status === "posted").length,
        inFlight: donations.filter((d) => d.status === "claimed" || d.status === "picked_up")
          .length,
        ngos: roles.filter((r) => r.role === "ngo").length,
        volunteers: roles.filter((r) => r.role === "volunteer").length,
        donors: roles.filter((r) => r.role === "donor").length,
        week,
      };
    },
  });

  const week = data?.week ?? new Array(7).fill(0);
  const peak = Math.max(1, ...week);

  return (
    <div className="mt-6 grid grid-cols-12 gap-5">
      <section className="col-span-12 lg:col-span-8">
        <div className="panel p-5">
          <p className="label-mono">Network impact</p>
          <h1 className="mt-3 text-3xl leading-tight font-semibold text-balance">
            Every crate counted, every hour saved.
          </h1>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "meals rescued", value: data?.meals ?? 0 },
              { label: "kg diverted", value: Math.round(data?.kg ?? 0) },
              { label: "crates moved", value: data?.crates ?? 0 },
              { label: "delivered", value: data?.deliveredCount ?? 0 },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-secondary/70 p-4">
                <p className="font-mono text-2xl font-semibold tabular">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: "donors", value: data?.donors ?? 0 },
              { label: "NGOs", value: data?.ngos ?? 0 },
              { label: "volunteers", value: data?.volunteers ?? 0 },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between rounded-xl bg-secondary/70 px-4 py-3 font-mono text-xs"
              >
                <span className="text-muted-foreground">{stat.label}</span>
                <span className="tabular text-foreground">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="col-span-12 lg:col-span-4">
        <div className="panel flex h-full flex-col p-5">
          <p className="label-mono">Weekly rescue</p>
          <div className="mt-4 flex items-end gap-2">
            {week.map((count: number, index: number) => (
              <div key={index} className="flex-1">
                <span
                  className={cn("block rounded-t-md", count > 0 ? "bg-brand" : "bg-border")}
                  style={{ height: `${Math.max(8, (count / peak) * 96)}px` }}
                />
                <span className="mt-1 block text-center text-[10px] text-muted-foreground">
                  {DAYS[index]}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2 border-t border-border pt-4 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">open now</span>
              <span className="tabular">{data?.open ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">in flight</span>
              <span className="tabular">{data?.inFlight ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">avg pickup</span>
              <span className="tabular">{data?.avgPickup ?? 0} min</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
