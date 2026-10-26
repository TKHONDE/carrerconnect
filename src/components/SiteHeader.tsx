import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { dashboardPath, useAuth } from "@/lib/auth";

export function SiteHeader() {
  const { session, primaryRole } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: unread = 0 } = useQuery({
    queryKey: ["unread", session?.user.id],
    enabled: !!session,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false);
      return count ?? 0;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold text-primary">
          <GraduationCap className="h-6 w-6 text-accent" /> CareerConnect
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link to="/jobs" className="hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>
            Opportunities
          </Link>
          {session && (
            <Link to={dashboardPath(primaryRole)} className="hover:text-foreground">
              Dashboard
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {session ? (
            <>
              <Link to="/notifications" className="relative rounded-md p-2 hover:bg-muted" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                    {unread}
                  </span>
                )}
              </Link>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>Join</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
