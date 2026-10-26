import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { VacancyCard } from "@/components/VacancyCard";
import { INDUSTRIES, TYPES, matchesFilters, type VacancyFilters } from "@/lib/vacancies";

export const Route = createFileRoute("/jobs/")({
  head: () => ({
    meta: [
      { title: "Browse internships & jobs — CareerConnect" },
      { name: "description", content: "Search and filter internships, graduate programmes and jobs by industry, location and qualification." },
      { property: "og:title", content: "Browse internships & jobs — CareerConnect" },
      { property: "og:description", content: "Search opportunities from verified employers." },
    ],
  }),
  component: Jobs,
});

const selectCls = "h-9 rounded-md border border-input bg-card px-3 text-sm";

function Jobs() {
  const [f, setF] = useState<VacancyFilters>({});
  const { data = [], isLoading } = useQuery({
    queryKey: ["vacancies-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vacancies")
        .select("id,title,type,industry,location,deadline,description,qualification,companies(name,verified)")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const list = data.filter((v) => matchesFilters(v, f));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-semibold">Opportunities</h1>
      <div className="mt-6 grid gap-3 rounded-lg border bg-card p-4 shadow-card md:grid-cols-5">
        <Input placeholder="Search title, company…" value={f.q ?? ""} onChange={(e) => setF({ ...f, q: e.target.value })} className="md:col-span-2" />
        <select className={selectCls} value={f.industry ?? ""} onChange={(e) => setF({ ...f, industry: e.target.value || undefined })}>
          <option value="">All industries</option>
          {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
        </select>
        <select className={selectCls} value={f.type ?? ""} onChange={(e) => setF({ ...f, type: e.target.value || undefined })}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <Input placeholder="Location" value={f.location ?? ""} onChange={(e) => setF({ ...f, location: e.target.value })} />
        <Input placeholder="Qualification (e.g. BSc, Diploma)" value={f.qualification ?? ""} onChange={(e) => setF({ ...f, qualification: e.target.value })} className="md:col-span-2" />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">{isLoading ? "Loading…" : `${list.length} result${list.length === 1 ? "" : "s"}`}</p>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {list.map((v) => <VacancyCard key={v.id} v={v} />)}
      </div>
    </div>
  );
}
