import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { INDUSTRIES, TYPES } from "@/lib/vacancies";

export const Route = createFileRoute("/_authenticated/employer/")({
  head: () => ({ meta: [{ title: "Employer dashboard — CareerConnect" }] }),
  component: EmployerDash,
});

const selectCls = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm";

function EmployerDash() {
  const { session, primaryRole } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const { data: company, isLoading } = useQuery({
    queryKey: ["my-company", uid],
    queryFn: async () => (await supabase.from("companies").select("*").eq("owner_id", uid!).maybeSingle()).data,
  });
  const { data: vacancies = [] } = useQuery({
    queryKey: ["my-vacancies", uid],
    enabled: !!company,
    queryFn: async () =>
      (await supabase.from("vacancies").select("*, applications(count)").eq("employer_id", uid!).order("created_at", { ascending: false })).data ?? [],
  });

  if (primaryRole && primaryRole !== "employer" && primaryRole !== "admin")
    return <p className="p-10 text-center text-muted-foreground">This area is for employer accounts.</p>;
  if (isLoading) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">{company?.name ?? "Set up your company"}</h1>
          {company && (
            <p className="mt-1 text-sm text-muted-foreground">
              {company.verified ? "✓ Verified by Career Services" : "Awaiting verification by Career Services"}
            </p>
          )}
        </div>
        {company && <NewVacancy companyId={company.id} onDone={() => qc.invalidateQueries({ queryKey: ["my-vacancies"] })} />}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <CompanyForm company={company} onSaved={() => qc.invalidateQueries({ queryKey: ["my-company"] })} />
        <div className="md:col-span-2">
          <h2 className="text-2xl font-semibold">Your vacancies</h2>
          <div className="mt-4 space-y-3">
            {!company && <p className="text-muted-foreground">Save your company details to start posting.</p>}
            {company && vacancies.length === 0 && <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No vacancies yet.</p>}
            {vacancies.map((v) => (
              <Link key={v.id} to="/employer/vacancies/$id" params={{ id: v.id }} className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-card hover:border-accent">
                <div>
                  <p className="font-semibold">{v.title}</p>
                  <p className="text-sm text-muted-foreground">{v.location} · {(v.applications as unknown as { count: number }[])[0]?.count ?? 0} applicants</p>
                </div>
                <StatusBadge status={v.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type Company = { id: string; name: string; industry: string | null; location: string | null; website: string | null; description: string | null } | null | undefined;

function CompanyForm({ company, onSaved }: { company: Company; onSaved: () => void }) {
  const { session } = useAuth();
  const [f, setF] = useState({ name: "", industry: "", location: "", website: "", description: "" });
  useEffect(() => {
    if (company) setF({ name: company.name, industry: company.industry ?? "", location: company.location ?? "", website: company.website ?? "", description: company.description ?? "" });
  }, [company]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = company
      ? await supabase.from("companies").update(f).eq("id", company.id)
      : await supabase.from("companies").insert({ ...f, owner_id: session!.user.id });
    if (error) return toast.error(error.message);
    toast.success("Company saved");
    onSaved();
  }
  return (
    <form onSubmit={save} className="h-fit space-y-3 rounded-lg border bg-card p-5 shadow-card">
      <h2 className="text-xl font-semibold">Company details</h2>
      <div className="space-y-1.5"><Label>Company name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Industry</Label>
        <select className={selectCls} value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })}>
          <option value="">Select…</option>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
        </select>
      </div>
      <div className="space-y-1.5"><Label>Location</Label><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Website</Label><Input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>About</Label><Textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <Button type="submit" className="w-full">Save</Button>
    </form>
  );
}

function NewVacancy({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const empty = { title: "", type: "internship", industry: INDUSTRIES[0] ?? "Other", location: "", qualification: "", description: "", requirements: "", deadline: "" };
  const [f, setF] = useState(empty);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("vacancies").insert({
      ...f,
      type: f.type as "internship" | "job" | "graduate",
      deadline: f.deadline || null,
      company_id: companyId,
      employer_id: session!.user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Submitted for approval by Career Services");
    setF(empty);
    setOpen(false);
    onDone();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Post a vacancy</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>New vacancy</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Type</Label>
              <select className={selectCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Industry</Label>
              <select className={selectCls} value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })}>
                {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Location</Label><Input required value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Closing date</Label><Input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Qualification required</Label><Input placeholder="e.g. BSc Computer Science, 3rd year+" value={f.qualification} onChange={(e) => setF({ ...f, qualification: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea required rows={5} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Requirements</Label><Textarea rows={3} value={f.requirements} onChange={(e) => setF({ ...f, requirements: e.target.value })} /></div>
          <Button type="submit" className="w-full">Submit for approval</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
