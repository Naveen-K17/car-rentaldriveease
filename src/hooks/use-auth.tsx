// Auth context: tracks current user, profile, and role.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "customer";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null, session: null, role: null, loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener first, then getSession (per Supabase best-practice)
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) setRole(null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    // Defer DB call to avoid auth-state deadlock
    setTimeout(async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const roles = (data ?? []).map((r) => r.role as AppRole);
      setRole(roles.includes("admin") ? "admin" : "customer");
    }, 0);
  }, [session?.user?.id]);

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    role,
    loading,
    signOut: async () => { await supabase.auth.signOut(); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
