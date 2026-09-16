import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSession } from "@/hooks/useSession";
import { STORAGE_TYPES } from "@/lib/donations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/post")({
  head: () => ({
    meta: [
      { title: "Post a donation — Canopy" },
      {
        name: "description",
        content:
          "List surplus food with a photo, quantity, pickup window and location so nearby NGOs can claim it.",
      },
      { property: "og:title", content: "Post a donation — Canopy" },
      {
        property: "og:description",
        content: "List surplus food in about two minutes and publish it to the network.",
      },
    ],
  }),
  component: PostPage,
});

function defaultExpiry() {
  const date = new Date(Date.now() + 1000 * 60 * 60 * 5);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function PostPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { coords, status, request } = useGeolocation();

  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState("12");
  const [unit, setUnit] = useState("units");
  const [storageType, setStorageType] = useState<string>("ambient");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState(defaultExpiry);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      let photoPath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("donation-photos")
          .upload(path, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        photoPath = path;
      }

      const { data, error } = await supabase
        .from("donations")
        .insert({
          donor_id: user.id,
          title,
          description: description || null,
          quantity: Number(quantity),
          unit,
          storage_type: storageType,
          address,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          expires_at: new Date(expiresAt).toISOString(),
          photo_url: photoPath,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Published to the network");
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      navigate({ to: "/donations/$donationId", params: { donationId: id } });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not publish"),
  });

  return (
    <div className="mt-6 grid grid-cols-12 gap-5">
      <section className="col-span-12 lg:col-span-4">
        <div className="panel p-5">
          <p className="label-mono">New crate</p>
          <h1 className="mt-3 text-3xl leading-tight font-semibold text-balance">
            Post surplus in about two minutes.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Add a photo, the pickup window and your location. Nearby NGOs and volunteers see
            it instantly, sorted by how soon it expires.
          </p>
          <div className="mt-5 rounded-lg bg-secondary/70 p-3 text-xs text-muted-foreground">
            {status === "granted"
              ? "Location attached — your crate will show a distance to everyone nearby."
              : "Without your location, the crate still appears but shows no distance."}
            {status !== "granted" && (
              <button
                onClick={request}
                className="mt-2 block font-medium text-brand-deep"
                type="button"
              >
                Attach my location
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="col-span-12 lg:col-span-8">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit.mutate();
          }}
          className="panel space-y-4 p-5"
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_100px_120px]">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Item</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sourdough loaves"
                className="mt-1.5 w-full rounded-lg bg-card/70 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Quantity</label>
              <input
                required
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-card/70 px-3 py-2 text-center font-mono text-sm tabular ring-1 ring-border outline-none focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-card/70 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-ring"
              >
                <option value="units">units</option>
                <option value="meals">meals</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Photo</label>
            <label className="mt-1.5 flex aspect-[3/1] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-secondary/70 ring-1 ring-border">
              {preview ? (
                <img src={preview} alt="Selected food" className="h-full w-full object-cover" />
              ) : (
                <span className="label-mono">Upload image</span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  setFile(selected);
                  setPreview(selected ? URL.createObjectURL(selected) : null);
                }}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Pickup by</label>
              <input
                required
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-card/70 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Storage</label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {STORAGE_TYPES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStorageType(option)}
                    className={cn(
                      "rounded-lg px-2 py-2 text-sm font-medium ring-1 transition-colors",
                      storageType === option
                        ? "bg-brand text-primary-foreground ring-transparent"
                        : "bg-card/70 text-muted-foreground ring-border",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Pickup address</label>
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Cedar & Rye Bakery, 14 Mill Lane"
              className="mt-1.5 w-full rounded-lg bg-card/70 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-lg bg-card/70 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={submit.isPending}
            className="w-full rounded-lg bg-brand-deep py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {submit.isPending ? "Publishing…" : "Publish to network"}
          </button>
        </form>
      </section>
    </div>
  );
}
