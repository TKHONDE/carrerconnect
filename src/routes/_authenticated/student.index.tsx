import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/student/")({
  head: () => ({ meta: [{ title: "My profile — CareerConnect" }] }),
  component: StudentProfile,
});

const fields = [
  ["full_name", "Full name"],
  ["phone", "Phone"],
  ["student_number", "Student number"],
  ["programme", "Programme / degree"],
  ["year_of_study", "Year of study / graduation year"],
] as const;

function StudentProfile() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const { data: p } = useQuery({
    queryKey: ["profile", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", uid!).single()).data,
  });
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (p) setForm(Object.fromEntries(Object.entries(p).map(([k, v]) => [k, (v as string) ?? ""])));
  }, [p]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { full_name, phone, student_number, programme, year_of_study, bio, skills } = form;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name, phone, student_number, programme, year_of_study, bio, skills, updated_at: new Date().toISOString() })
      .eq("id", uid!);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["profile", uid] });
  }

  async function uploadCv(file: File) {
    if (file.size > 10 * 1024 * 1024) return toast.error("CV must be under 10MB");
    const path = `${uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await supabase.storage.from("cvs").upload(path, file);
    if (error) return toast.error(error.message);
    await supabase.from("profiles").update({ cv_path: path }).eq("id", uid!);
    toast.success("CV uploaded");
    qc.invalidateQueries({ queryKey: ["profile", uid] });
  }

  async function viewCv() {
    if (!p?.cv_path) return;
    const { data } = await supabase.storage.from("cvs").createSignedUrl(p.cv_path, 300);
    if (data) window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-semibold">My profile</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/student/applications">My applications</Link></Button>
          <Button asChild><Link to="/jobs">Find opportunities</Link></Button>
        </div>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <form onSubmit={save} className="space-y-4 rounded-lg border bg-card p-6 shadow-card md:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(([k, l]) => (
              <div key={k} className="space-y-1.5">
                <Label>{l}</Label>
                <Input value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>Skills (comma separated)</Label>
            <Input value={form.skills ?? ""} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>About me</Label>
            <Textarea rows={4} value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <Button type="submit">Save profile</Button>
        </form>
        <div className="h-fit space-y-4 rounded-lg border bg-card p-6 shadow-card">
          <h2 className="text-xl font-semibold">CV</h2>
          {p?.cv_path ? (
            <button onClick={viewCv} className="flex items-center gap-2 text-sm text-accent hover:underline">
              <FileText className="h-4 w-4" /> {p.cv_path.split("/").pop()?.replace(/^\d+-/, "")}
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">No CV yet. You need one to apply.</p>
          )}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm hover:bg-muted">
            <Upload className="h-4 w-4" /> {p?.cv_path ? "Replace CV" : "Upload CV"} (PDF/DOC)
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCv(e.target.files[0])} />
          </label>
        </div>
      </div>
    </div>
  );
}
