import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — CareerConnect" }] }),
  component: Notifications,
});

function Notifications() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  async function markAll() {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["unread"] });
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-semibold">Notifications</h1>
        <Button variant="outline" size="sm" onClick={markAll}>Mark all read</Button>
      </div>
      <ul className="mt-6 divide-y rounded-lg border bg-card shadow-card">
        {data.length === 0 && <li className="p-8 text-center text-muted-foreground">You're all caught up.</li>}
        {data.map((n) => (
          <li key={n.id} className={`flex items-start gap-3 p-4 ${n.read ? "" : "bg-secondary/50"}`}>
            {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
            <div className="flex-1">
              {n.link ? <Link to={n.link} className="font-medium hover:text-accent">{n.message}</Link> : <p className="font-medium">{n.message}</p>}
              <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
