export const INDUSTRIES = [
  "Information Technology",
  "Finance & Banking",
  "Engineering",
  "Healthcare",
  "Agriculture",
  "Mining",
  "Education",
  "Media & Communications",
  "Law",
  "NGO & Development",
  "Manufacturing",
  "Retail & FMCG",
  "Other",
];

export const TYPES = [
  { value: "internship", label: "Internship" },
  { value: "job", label: "Job" },
  { value: "graduate", label: "Graduate programme" },
] as const;

export const typeLabel = (t: string) => TYPES.find((x) => x.value === t)?.label ?? t;

export type VacancyFilters = { q?: string; industry?: string; location?: string; type?: string; qualification?: string };

export function matchesFilters(
  v: { title: string; description: string; industry: string; location: string; type: string; qualification: string | null; companies?: { name: string } | null },
  f: VacancyFilters,
) {
  const q = f.q?.toLowerCase().trim();
  if (q && !`${v.title} ${v.description} ${v.companies?.name ?? ""}`.toLowerCase().includes(q)) return false;
  if (f.industry && v.industry !== f.industry) return false;
  if (f.type && v.type !== f.type) return false;
  if (f.location && !v.location.toLowerCase().includes(f.location.toLowerCase())) return false;
  if (f.qualification && !(v.qualification ?? "").toLowerCase().includes(f.qualification.toLowerCase())) return false;
  return true;
}
