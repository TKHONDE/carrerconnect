import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Career Services admin — CareerConnect" }] }),
  component: Admin,
});

function Admin() {
  const { primaryRole, loading } = useAuth();
  if (loading) return null;
  if (primaryRole !== "admin") return <p className="p-10 text-center text-muted-foreground">Admins only.</p>;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-semibold">Career Services</h1>
      <Tabs defaultValue="reports" className="mt-6">
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="vacancies">Vacancies</TabsTrigger>
          <TabsTrigger value="employers">Employers</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        <TabsContent value="reports"><Reports /></TabsContent>
        <TabsContent value="vacancies"><Vacancies /></TabsContent>
        <TabsContent value="employers"><Employers /></TabsContent>
        <TabsContent value="users"><Users /></TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Reports() {
  const { data } = useQuery({
    queryKey: ["admin-report"],
    queryFn: async () => {
      const [{ data: roles }, { data: vac }, { data: apps }] = await Promise.all([
        supabase.from("user_roles").select("role"),
        supabase.from("vacancies").select("id,title,status,industry,type,companies(name)"),
        supabase.from("applications").select("status,vacancy_id"),
      ]);
      return { roles: roles ?? [], vac: vac ?? [], apps: apps ?? [] };
    },
  });
  if (!data) return <p className="p-6 text-muted-foreground">Loading…</p>;
  const count = <T,>(arr: T[], fn: (x: T) => boolean) => arr.filter(fn).length;
  const placed = count(data.apps, (a) => a.status === "accepted");
  const byIndustry = Object.entries(
    data.vac.reduce<Record<string, number>>((m, v) => ((m[v.industry] = (m[v.industry] ?? 0) + 1), m), {}),
  ).sort((a, b) => b[1] - a[1]);

  function exportCsv() {
    const rows = [["Vacancy", "Company", "Industry", "Type", "Status", "Applications", "Accepted"]];
    data!.vac.forEach((v) => {
      const a = data!.apps.filter((x) => x.vacancy_id === v.id);
      rows.push([v.title, v.companies?.name ?? "", v.industry, v.type, v.status, String(a.length), String(a.filter((x) => x.status === "accepted").length)]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const el = document.createElement("a");
    el.href = url;
    el.download = `careerconnect-report-${new Date().toISOString().slice(0, 10)}.csv`;
    el.click();
  }

  return (
    <div className="mt-4 space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Students" value={count(data.roles, (r) => r.role === "student")} />
        <Stat label="Employers" value={count(data.roles, (r) => r.role === "employer")} />
        <Stat label="Live vacancies" value={count(data.vac, (v) => v.status === "approved")} />
        <Stat label="Pending approval" value={count(data.vac, (v) => v.status === "pending")} />
        <Stat label="Applications" value={data.apps.length} />
        <Stat label="Shortlisted" value={count(data.apps, (a) => a.status === "shortlisted")} />
        <Stat label="Placements (accepted)" value={placed} />
        <Stat label="Placement rate" value={data.apps.length ? `${Math.round((placed / data.apps.length) * 100)}%` : "—"} />
      </div>
      <div className="rounded-lg border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Vacancies by industry</h3>
          <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV report</Button>
        </div>
        <div className="mt-4 space-y-2">
          {byIndustry.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
          {byIndustry.map(([k, n]) => (
            <div key={k} className="flex items-center gap-3 text-sm">
              <span className="w-48 shrink-0">{k}</span>
              <div className="h-2 rounded-full bg-accent" style={{ width: `${(n / (byIndustry[0]?.[1] ?? 1)) * 60}%` }} />
              <span className="text-muted-foreground">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Vacancies() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-vacancies"],
    queryFn: async () => (await supabase.from("vacancies").select("*, companies(name,verified)").order("created_at", { ascending: false })).data ?? [],
  });
  async function set(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("vacancies").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-vacancies"] });
  }
  return (
    <div className="mt-4 space-y-3">
      {data.length === 0 && <p className="text-muted-foreground">No vacancies yet.</p>}
      {data.map((v) => (
        <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 shadow-card">
          <div>
            <p className="font-semibold">{v.title} <span className="font-normal text-muted-foreground">· {v.companies?.name}{v.companies?.verified ? " ✓" : " (unverified)"}</span></p>
            <p className="line-clamp-2 max-w-2xl text-sm text-muted-foreground">{v.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={v.status} />
            {v.status !== "approved" && <Button size="sm" onClick={() => set(v.id, "approved")}>Approve</Button>}
            {v.status !== "rejected" && <Button size="sm" variant="ghost" onClick={() => set(v.id, "rejected")}>Reject</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Employers() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => (await supabase.from("companies").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  async function toggle(id: string, verified: boolean) {
    const { error } = await supabase.from("companies").update({ verified }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-companies"] });
  }
  return (
    <div className="mt-4 space-y-3">
      {data.length === 0 && <p className="text-muted-foreground">No employers yet.</p>}
      {data.map((c) => (
        <div key={c.id} className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-card">
          <div>
            <p className="font-semibold">{c.name}</p>
            <p className="text-sm text-muted-foreground">{[c.industry, c.location, c.website].filter(Boolean).join(" · ")}</p>
          </div>
          <Button size="sm" variant={c.verified ? "outline" : "default"} onClick={() => toggle(c.id, !c.verified)}>
            {c.verified ? "Revoke verification" : "Verify"}
          </Button>
        </div>
      ))}
    </div>
  );
}

function Users() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,programme,created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      return (p ?? []).map((x) => ({ ...x, roles: (r ?? []).filter((y) => y.user_id === x.id).map((y) => y.role) }));
    },
  });
  async function makeAdmin(user_id: string) {
    if (!confirm("Give this user admin access?")) return;
    const { error } = await supabase.from("user_roles").insert({ user_id, role: "admin" });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }
  return (
    <div className="mt-4 overflow-hidden rounded-lg border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-muted-foreground">
          <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Joined</th><th /></tr>
        </thead>
        <tbody>
          {data.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-3 font-medium">{u.full_name || "—"}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3 capitalize">{u.roles.join(", ")}</td>
              <td className="p-3">{new Date(u.created_at).toLocaleDateString()}</td>
              <td className="p-3 text-right">{!u.roles.includes("admin") && <Button size="sm" variant="ghost" onClick={() => makeAdmin(u.id)}>Make admin</Button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="p-3 text-xs text-muted-foreground">Need help? <Link to="/jobs" className="underline">View public board</Link></p>
    </div>
  );
}
