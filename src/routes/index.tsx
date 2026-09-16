import { createFileRoute, Link } from "@tanstack/react-router";

import crate from "@/assets/crate.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Canopy — community food rescue network" },
      {
        name: "description",
        content:
          "Canopy connects donors, NGOs and volunteers so surplus food gets claimed, picked up and delivered before it spoils.",
      },
      { property: "og:title", content: "Canopy — community food rescue network" },
      {
        property: "og:description",
        content:
          "Post surplus food, claim nearby crates and track every handoff from posted to delivered.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    role: "Donors",
    copy: "Post surplus with a photo, quantity and pickup window. It goes live instantly.",
  },
  {
    role: "NGOs",
    copy: "See crates nearby sorted by distance and expiry, then claim what you can use.",
  },
  {
    role: "Volunteers",
    copy: "Take a pickup, mark it collected, and confirm delivery at the pantry door.",
  },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-paper">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-24 h-96 w-96 rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-chart-4/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <header className="panel-tight flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-brand font-semibold text-primary-foreground">
              C
            </span>
            <span>
              <span className="block text-sm font-semibold leading-none">Canopy</span>
              <span className="label-mono block tracking-normal normal-case">
                food-rescue ops
              </span>
            </span>
          </div>
          <Link
            to="/auth"
            className="rounded-lg bg-brand-deep px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Sign in
          </Link>
        </header>

        <div className="mt-6 grid grid-cols-12 gap-5">
          <section className="col-span-12 lg:col-span-5">
            <div className="panel p-5">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-accent" />
                <p className="label-mono">Community food connect</p>
              </div>
              <h1 className="mt-3 text-4xl leading-none font-semibold text-balance">
                Warm food, moved before it cools.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground">
                Canopy routes surplus from cafés and kitchens to neighbourhood pantries in
                minutes, not days. Donors post, NGOs claim, volunteers deliver — and every
                handoff is tracked.
              </p>
              <Link
                to="/auth"
                className="mt-5 block rounded-lg bg-brand-deep py-2.5 text-center text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Join the network
              </Link>
              <Link to="/auth" className="mt-2 block text-center text-sm text-muted-foreground">
                Post a donation
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="panel-tight p-4">
                <p className="font-mono text-2xl font-semibold tabular">4</p>
                <p className="text-xs text-muted-foreground">tracked stages</p>
              </div>
              <div className="panel-tight p-4">
                <p className="font-mono text-2xl font-semibold tabular">3</p>
                <p className="text-xs text-muted-foreground">roles</p>
              </div>
              <div className="panel-tight p-4">
                <p className="font-mono text-2xl font-semibold tabular">0</p>
                <p className="text-xs text-muted-foreground">wasted crates</p>
              </div>
            </div>
          </section>

          <section className="col-span-12 lg:col-span-7">
            <div className="panel overflow-hidden p-4">
              <img
                src={crate}
                alt="Rescued bread, greens and fruit packed in a wooden crate"
                width={1024}
                height={768}
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
            </div>

            <div className="mt-5 space-y-3">
              {STEPS.map((step) => (
                <div key={step.role} className="panel flex items-start gap-4 p-4">
                  <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-deep">
                    {step.role}
                  </span>
                  <p className="text-sm text-muted-foreground">{step.copy}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
