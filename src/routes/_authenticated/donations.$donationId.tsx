import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { DonationPhoto } from "@/components/DonationPhoto";
import { StatusTimeline } from "@/components/StatusTimeline";
import { useSession } from "@/hooks/useSession";
import {
  STATUS_LABEL,
  countdown,
  timeOnly,
  type DonationRow,
  type DonationStatus,
} from "@/lib/donations";

export const Route = createFileRoute("/_authenticated/donations/$donationId")({
  head: () => ({
    meta: [
      { title: "Crate tracking — Canopy" },
      {
        name: "description",
        content:
          "Follow a food donation from posted to delivered, with pickup details and handoff history.",
      },
      { property: "og:title", content: "Crate tracking — Canopy" },
      {
        property: "og:description",
        content: "Live status of a single food rescue handoff.",
      },
    ],
  }),
  component: DonationDetail,
});

const NEXT_STATUS: Partial<Record<DonationStatus, DonationStatus>> = {
  claimed: "picked_up",
  picked_up: "delivered",
};

function DonationDetail() {
  const { donationId } = Route.useParams();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const { data: donation, isLoading } = useQuery({
    queryKey: ["donation", donationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("id", donationId)
        .maybeSingle();
      if (error) throw error;
      return data as DonationRow | null;
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["donation-events", donationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_events")
        .select("id, status, created_at")
        .eq("donation_id", donationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const advance = useMutation({
    mutationFn: async (next: DonationStatus) => {
      const stamp = new Date().toISOString();
      const patch = {
        status: next,
        ...(next === "picked_up" ? { picked_up_at: stamp } : {}),
        ...(next === "delivered" ? { delivered_at: stamp } : {}),
      };
      const { error } = await supabase.from("donations").update(patch).eq("id", donationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["donation", donationId] });
      queryClient.invalidateQueries({ queryKey: ["donation-events", donationId] });
      queryClient.invalidateQueries({ queryKey: ["donations"] });
    },
    onError: () => toast.error("Only the donor or the claimer can update this crate"),
  });

  if (isLoading) {
    return <div className="panel mt-6 p-6 text-sm text-muted-foreground">Loading crate…</div>;
  }

  if (!donation) {
    return (
      <div className="panel mt-6 p-6">
        <p className="text-sm font-medium">This crate no longer exists</p>
        <Link to="/discover" className="mt-2 inline-block text-sm text-brand-deep">
          Back to nearby donations
        </Link>
      </div>
    );
  }

  const involved = donation.donor_id === user?.id || donation.claimed_by === user?.id;
  const next = NEXT_STATUS[donation.status];

  return (
    <div className="mt-6 grid grid-cols-12 gap-5">
      <section className="col-span-12 lg:col-span-8">
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-card-foreground">
                Crate #{donation.id.slice(0, 6).toUpperCase()} · {donation.title}
              </p>
              <p className="label-mono tracking-normal normal-case">
                {donation.address || "Address shared with the claimer"}
              </p>
            </div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-deep">
              {STATUS_LABEL[donation.status].toLowerCase()}
            </span>
          </div>

          <StatusTimeline status={donation.status} />

          <div className="mt-6 flex items-center justify-between rounded-xl bg-secondary/70 p-4">
            <p className="text-sm text-muted-foreground">
              {Number(donation.quantity)} {donation.unit} · {donation.storage_type} ·{" "}
              {countdown(donation.expires_at, Date.now())}
            </p>
            {involved && next ? (
              <button
                onClick={() => advance.mutate(next)}
                disabled={advance.isPending}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                Mark {STATUS_LABEL[next].toLowerCase()}
              </button>
            ) : (
              <span className="font-mono text-xs text-brand-deep">
                pick by {timeOnly(donation.expires_at)}
              </span>
            )}
          </div>

          {donation.description && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {donation.description}
            </p>
          )}
        </div>
      </section>

      <section className="col-span-12 lg:col-span-4">
        <div className="panel flex h-full flex-col p-5">
          <DonationPhoto
            path={donation.photo_url}
            alt={donation.title}
            className="aspect-[4/3] w-full rounded-xl"
          />
          <p className="label-mono mt-5">Handoff history</p>
          <ul className="mt-3 space-y-2 border-t border-border pt-3 font-mono text-xs">
            {events.map((event) => (
              <li key={event.id} className="flex justify-between">
                <span className="text-muted-foreground">
                  {STATUS_LABEL[event.status as DonationStatus].toLowerCase()}
                </span>
                <span className="tabular">
                  {new Date(event.created_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
