import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/donations";

/** Current auth session, kept in sync with auth state changes. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, ready };
}

export type MemberProfile = {
  id: string;
  fullName: string;
  orgName: string | null;
  role: AppRole | null;
};

/** Profile row + role for the signed-in user. */
export function useMe(userId: string | undefined) {
  return useQuery({
    queryKey: ["me", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MemberProfile | null> => {
      if (!userId) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, org_name").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      return {
        id: userId,
        fullName: profile?.full_name ?? "",
        orgName: profile?.org_name ?? null,
        role: (roles?.[0]?.role as AppRole | undefined) ?? null,
      };
    },
  });
}
