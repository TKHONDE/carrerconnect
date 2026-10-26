import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { VacancyCard } from "@/components/VacancyCard";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareerConnect — Internships & Jobs for University Students" },
      { name: "description", content: "One place for students to find internships and jobs, upload CVs and apply — and for employers to hire graduates." },
      { property: "og:title", content: "CareerConnect — Internships & Jobs for University Students" },
      { property: "og:description", content: "Find internships and graduate jobs, apply online and track every application." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: latest = [] } = useQuery({
    queryKey: ["latest-vacancies"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vacancies")
        .select("id,title,type,industry,location,deadline,companies(name,verified)")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  return (
    <div>
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-primary-foreground/70">University Career Services</p>
            <h1 className="mt-4 text-5xl font-semibold leading-tight md:text-6xl">
              Your first role starts on campus.
            </h1>
            <p className="mt-5 max-w-md text-lg text-primary-foreground/80">
              Internships, graduate programmes and jobs from verified employers — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/jobs">Browse opportunities</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/auth" search={{ mode: "signup", type: "employer" }}>I'm hiring</Link>
              </Button>
            </div>
          </div>
          <img src={hero} alt="Students walking on campus" width={1600} height={1008} className="rounded-xl shadow-2xl" />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-3">
        {[
          { icon: FileText, t: "One profile, one CV", d: "Upload your CV once and apply to any opportunity in a click." },
          { icon: Briefcase, t: "Track every application", d: "See when you're shortlisted, accepted or need to follow up." },
          { icon: ShieldCheck, t: "Verified employers", d: "Every vacancy is reviewed by Career Services before it goes live." },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="rounded-lg border bg-card p-6 shadow-card">
            <Icon className="h-6 w-6 text-accent" />
            <h3 className="mt-4 text-xl font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-semibold">Latest opportunities</h2>
          <Link to="/jobs" className="text-sm font-medium text-accent hover:underline">View all →</Link>
        </div>
        {latest.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            No opportunities published yet — check back soon.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {latest.map((v) => <VacancyCard key={v.id} v={v} />)}
          </div>
        )}
      </section>
    </div>
  );
}
