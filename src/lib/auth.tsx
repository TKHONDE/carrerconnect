import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "employer" | "student";

type AuthCtx = {
  session: Session | null;
  roles: Role[];
  loading: boolean;
  primaryRole: Role | null;
  refreshRoles: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  roles: [],
  loading: true,
  primaryRole: null,
  refreshRoles: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRoles(uid: string | undefined) {
    if (!uid) return setRoles([]);
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r) => r.role as Role));
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => loadRoles(s?.user.id), 0);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadRoles(data.session?.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const primaryRole: Role | null = roles.includes("admin")
    ? "admin"
    : roles.includes("employer")
      ? "employer"
      : roles.includes("student")
        ? "student"
        : null;

  return (
    <Ctx.Provider
      value={{ session, roles, loading, primaryRole, refreshRoles: () => loadRoles(session?.user.id) }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

export function dashboardPath(role: Role | null) {
  if (role === "admin") return "/admin";
  if (role === "employer") return "/employer";
  return "/student";
}

export const statusTone: Record<string, string> = {
  pending: "bg-warning/20 text-foreground",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
  closed: "bg-muted text-muted-foreground",
  submitted: "bg-secondary text-secondary-foreground",
  shortlisted: "bg-accent/15 text-accent",
  accepted: "bg-success/15 text-success",
};
