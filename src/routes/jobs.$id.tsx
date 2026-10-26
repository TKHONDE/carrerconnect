import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, CalendarDays, GraduationCap, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { typeLabel } from "@/lib/vacancies";

export const Route = createFileRoute("/jobs/$id")({
  head: () => ({
    meta: [
      { title: "Opportunity details — CareerConnect" },
      { name: "description", content: "View the role, requirements and apply online through CareerConnect." },
      { property: "og:title", content: "Opportunity details — CareerConnect" },
      { property: "og:description", content: "View the role and apply online." },
    ],
  }),
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const { session, primaryRole } = useAuth();
  const qc = useQueryClient();
  const [cover, setCover] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: v, isLoading } = useQuery({
    queryKey: ["vacancy", id, session?.user.id],
    queryFn: async () => {
      const { data } = await supabase.from("vacancies").select("*, companies(*)").eq("id", id).maybeSingle();
      return data;
    },
  });
  const { data: existing } = useQuery({
    queryKey: ["my-application", id, session?.user.id],
    enabled: primaryRole === "student",
    queryFn: async () => {
      const { data } = await supabase.from("applications").select("id,status").eq("vacancy_id", id).maybeSingle();
      return data;
    },
  });

  async function apply() {
    if (!session) return;
    setBusy(true);
    const { data: profile } = await supabase.from("profiles").select("cv_path").eq("id", session.user.id).single();
    if (!profile?.cv_path) {
      setBusy(false);
      return toast.error("Please upload your CV in your profile before applying.");
    }
    const { error } = await supabase.from("applications").insert({
      vacancy_id: id,
      student_id: session.user.id,
      cover_letter: cover,
      cv_path: profile.cv_path,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Application submitted!");
    qc.invalidateQueries({ queryKey: ["my-application", id] });
  }

  if (isLoading) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  if (!v) return <p className="p-10 text-center text-muted-foreground">This opportunity is not available.</p>;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
      <article className="md:col-span-2">
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{typeLabel(v.type)}</span>
        <h1 className="mt-3 text-4xl font-semibold">{v.title}</h1>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{v.companies?.name}</span>
          <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{v.location}</span>
          {v.qualification && <span className="flex items-center gap-1"><GraduationCap className="h-4 w-4" />{v.qualification}</span>}
          {v.deadline && <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />Closes {new Date(v.deadline).toLocaleDateString()}</span>}
        </div>
        <h2 className="mt-8 text-xl font-semibold">About the role</h2>
        <p className="mt-2 whitespace-pre-wrap leading-relaxed">{v.description}</p>
        {v.requirements && (
          <>
            <h2 className="mt-8 text-xl font-semibold">Requirements</h2>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed">{v.requirements}</p>
          </>
        )}
        {v.companies?.description && (
          <>
            <h2 className="mt-8 text-xl font-semibold">About {v.companies.name}</h2>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{v.companies.description}</p>
          </>
        )}
      </article>
      <aside className="h-fit rounded-lg border bg-card p-5 shadow-card">
        <h3 className="text-lg font-semibold">Apply</h3>
        {!session ? (
          <div className="mt-3 space-y-3 text-sm">
            <p className="text-muted-foreground">Sign in with your student account to apply.</p>
            <Button asChild className="w-full"><Link to="/auth">Sign in to apply</Link></Button>
          </div>
        ) : primaryRole !== "student" ? (
          <p className="mt-3 text-sm text-muted-foreground">Only student accounts can apply.</p>
        ) : existing ? (
          <p className="mt-3 text-sm">
            You applied — status: <b className="capitalize">{existing.status}</b>.{" "}
            <Link to="/student/applications" className="text-accent underline">Track it</Link>
          </p>
        ) : v.status !== "approved" ? (
          <p className="mt-3 text-sm text-muted-foreground">This vacancy is not open for applications.</p>
        ) : (
          <div className="mt-3 space-y-3">
            <Textarea rows={6} placeholder="Short cover letter (optional)" value={cover} onChange={(e) => setCover(e.target.value)} />
            <p className="text-xs text-muted-foreground">Your profile CV will be attached.</p>
            <Button className="w-full" onClick={apply} disabled={busy}>{busy ? "Submitting…" : "Submit application"}</Button>
          </div>
        )}
      </aside>
    </div>
  );
}
