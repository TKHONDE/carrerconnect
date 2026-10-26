import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/employer/vacancies/$id")({
  head: () => ({ meta: [{ title: "Applicants — CareerConnect" }] }),
  component: Applicants,
});

type AppStatus = "submitted" | "shortlisted" | "rejected" | "accepted";

function Applicants() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: v } = useQuery({
    queryKey: ["emp-vacancy", id],
    queryFn: async () => (await supabase.from("vacancies").select("*").eq("id", id).maybeSingle()).data,
  });
  const { data: apps = [] } = useQuery({
    queryKey: ["emp-apps", id],
    queryFn: async () => {
      const { data: a } = await supabase.from("applications").select("*").eq("vacancy_id", id).order("created_at");
      const ids = (a ?? []).map((x) => x.student_id);
      const { data: profiles } = ids.length ? await supabase.from("profiles").select("*").in("id", ids) : { data: [] };
      return (a ?? []).map((x) => ({ ...x, profile: profiles?.find((p) => p.id === x.student_id) }));
    },
  });

  async function setStatus(appId: string, status: AppStatus) {
    const { error } = await supabase.from("applications").update({ status }).eq("id", appId);
    if (error) return toast.error(error.message);
    toast.success(`Marked as ${status}`);
    qc.invalidateQueries({ queryKey: ["emp-apps", id] });
  }
  async function toggleClosed() {
    if (!v) return;
    const { error } = await supabase.from("vacancies").update({ status: v.status === "closed" ? "pending" : "closed" }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["emp-vacancy", id] });
  }
  async function openCv(path: string | null) {
    if (!path) return toast.error("No CV attached");
    const { data, error } = await supabase.storage.from("cvs").createSignedUrl(path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }

  if (!v) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/employer" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold">{v.title}</h1>
          <StatusBadge status={v.status} />
        </div>
        <Button variant="outline" onClick={toggleClosed}>{v.status === "closed" ? "Reopen (needs approval)" : "Close vacancy"}</Button>
      </div>
      <h2 className="mt-8 text-xl font-semibold">Applicants ({apps.length})</h2>
      <div className="mt-4 space-y-3">
        {apps.length === 0 && <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No applications yet.</p>}
        {apps.map((a) => (
          <div key={a.id} className="rounded-lg border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{a.profile?.full_name || "Student"}</p>
                <p className="text-sm text-muted-foreground">
                  {[a.profile?.programme, a.profile?.year_of_study].filter(Boolean).join(" · ")}
                </p>
                {a.profile?.skills && <p className="mt-1 text-sm">Skills: {a.profile.skills}</p>}
              </div>
              <StatusBadge status={a.status} />
            </div>
            {a.cover_letter && <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{a.cover_letter}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => openCv(a.cv_path)}>View CV</Button>
              {a.profile?.email && (
                <Button size="sm" variant="outline" asChild>
                  <a href={`mailto:${a.profile.email}?subject=${encodeURIComponent(v.title)}`}><Mail /> Contact</a>
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setStatus(a.id, "shortlisted")}>Shortlist</Button>
              <Button size="sm" onClick={() => setStatus(a.id, "accepted")}>Accept</Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus(a.id, "rejected")}>Reject</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
