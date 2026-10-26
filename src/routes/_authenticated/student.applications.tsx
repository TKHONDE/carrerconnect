import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/student/applications")({
  head: () => ({ meta: [{ title: "My applications — CareerConnect" }] }),
  component: MyApps,
});

function MyApps() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-apps", session?.user.id],
    queryFn: async () =>
      (await supabase
        .from("applications")
        .select("id,status,created_at,updated_at,vacancy_id,vacancies(title,location,companies(name))")
        .eq("student_id", session!.user.id)
        .order("created_at", { ascending: false })).data ?? [],
  });

  async function withdraw(id: string) {
    if (!confirm("Withdraw this application?")) return;
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-apps"] });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-4xl font-semibold">My applications</h1>
      <div className="mt-6 overflow-hidden rounded-lg border bg-card shadow-card">
        {isLoading ? (
          <p className="p-6 text-muted-foreground">Loading…</p>
        ) : data.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">
            No applications yet. <Link to="/jobs" className="text-accent underline">Browse opportunities</Link>
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr><th className="p-3">Role</th><th className="p-3">Company</th><th className="p-3">Applied</th><th className="p-3">Status</th><th /></tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3 font-medium"><Link to="/jobs/$id" params={{ id: a.vacancy_id }} className="hover:text-accent">{a.vacancies?.title}</Link></td>
                  <td className="p-3">{a.vacancies?.companies?.name}</td>
                  <td className="p-3">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="p-3"><StatusBadge status={a.status} /></td>
                  <td className="p-3 text-right">
                    {a.status === "submitted" && <Button size="sm" variant="ghost" onClick={() => withdraw(a.id)}>Withdraw</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
