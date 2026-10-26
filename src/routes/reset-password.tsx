import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — CareerConnect" },
      { name: "description", content: "Choose a new password for your CareerConnect account." },
      { property: "og:title", content: "Set a new password — CareerConnect" },
      { property: "og:description", content: "Choose a new password." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/auth" });
  }
  return (
    <form onSubmit={save} className="mx-auto mt-16 max-w-md space-y-4 rounded-xl border bg-card p-8 shadow-card">
      <h1 className="text-3xl font-semibold">New password</h1>
      <Input type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} />
      <Button type="submit" className="w-full">Save password</Button>
    </form>
  );
}
