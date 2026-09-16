import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { ROLE_LABEL, type AppRole } from "@/lib/donations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Canopy food rescue" },
      {
        name: "description",
        content:
          "Sign in or create a Canopy account as a donor, NGO or volunteer to rescue surplus food nearby.",
      },
      { property: "og:title", content: "Sign in — Canopy food rescue" },
      {
        property: "og:description",
        content: "Join Canopy as a donor, NGO or volunteer and start moving surplus food.",
      },
    ],
  }),
  component: AuthPage,
});

const ROLES: AppRole[] = ["donor", "ngo", "volunteer"];

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [role, setRole] = useState<AppRole>("donor");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate({ to: "/discover", replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/discover", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, org_name: orgName || null, role },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Try email instead.");
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-paper">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-24 h-96 w-96 rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <Link to="/" className="mb-6 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-brand font-semibold text-primary-foreground">
            C
          </span>
          <span className="text-sm font-semibold">Canopy</span>
        </Link>

        <div className="panel p-6">
          {checkEmail ? (
            <div>
              <p className="label-mono">Check your inbox</p>
              <h1 className="mt-3 text-2xl font-semibold">Confirm your email</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                We sent a confirmation link to {email}. Open it to activate your Canopy
                account, then come back and sign in.
              </p>
              <button
                onClick={() => {
                  setCheckEmail(false);
                  setMode("signin");
                }}
                className="mt-5 w-full rounded-lg bg-brand-deep py-2.5 text-sm font-medium text-primary-foreground"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <p className="label-mono">{mode === "signin" ? "Welcome back" : "Join the network"}</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-balance">
                {mode === "signin" ? "Sign in to Canopy" : "Create your Canopy account"}
              </h1>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {mode === "signup" && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Your role</label>
                      <div className="mt-1.5 grid grid-cols-3 gap-2">
                        {ROLES.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setRole(option)}
                            className={cn(
                              "rounded-lg px-2 py-2 text-sm font-medium ring-1 transition-colors",
                              role === option
                                ? "bg-brand text-primary-foreground ring-transparent"
                                : "bg-card/70 text-muted-foreground ring-border",
                            )}
                          >
                            {ROLE_LABEL[option]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Full name</label>
                      <input
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="mt-1.5 w-full rounded-lg bg-card/70 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Organisation {role === "volunteer" ? "(optional)" : ""}
                      </label>
                      <input
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="mt-1.5 w-full rounded-lg bg-card/70 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-ring"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-lg bg-card/70 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Password</label>
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-lg bg-card/70 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-ring"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-brand-deep py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              <button
                onClick={handleGoogle}
                className="mt-3 w-full rounded-lg bg-card/70 py-2.5 text-sm font-medium ring-1 ring-border transition-transform hover:-translate-y-0.5"
              >
                Continue with Google
              </button>

              <button
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="mt-4 w-full text-center text-sm text-muted-foreground"
              >
                {mode === "signin"
                  ? "New here? Create an account"
                  : "Already have an account? Sign in"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
