import { Link } from "@tanstack/react-router";
import { Building2, CalendarDays, MapPin } from "lucide-react";
import { typeLabel } from "@/lib/vacancies";

export type VacancyListItem = {
  id: string;
  title: string;
  type: string;
  industry: string;
  location: string;
  deadline: string | null;
  companies: { name: string; verified: boolean } | null;
};

export function VacancyCard({ v }: { v: VacancyListItem }) {
  return (
    <Link
      to="/jobs/$id"
      params={{ id: v.id }}
      className="group block rounded-lg border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-accent"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground">
          {typeLabel(v.type)}
        </span>
        <span className="text-muted-foreground">{v.industry}</span>
      </div>
      <h3 className="mt-3 text-lg font-semibold group-hover:text-accent">{v.title}</h3>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <Building2 className="h-4 w-4" /> {v.companies?.name}
          {v.companies?.verified && <span className="text-xs text-success">✓ verified</span>}
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4" /> {v.location}
        </p>
        {v.deadline && (
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Closes {new Date(v.deadline).toLocaleDateString()}
          </p>
        )}
      </div>
    </Link>
  );
}
