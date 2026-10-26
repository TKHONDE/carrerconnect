import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { dashboardPath, useAuth } from "@/lib/auth";

type Search = { mode?: "signin" | "signup"; type?: "student" | "employer" };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "signup" ? "signup" : undefined,
    type: s.type === "employer" ? "employer" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in or join — CareerConnect" },
      { name: "description", content: "Create a student or employer account on CareerConnect." },
      { property: "og:title", content: "Sign in or join — CareerConnect" },
      { property: "og:description", content: "Create a student or employer account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, primaryRole, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(search.mode ?? "signin");
  const [type, setType] = useState<"student" | "employer">(search.type ?? "student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && session && primaryRole) navigate({ to: dashboardPath(primaryRole), replace: true });
  }, [loading, session, primaryRole, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth", data: { full_name: name, account_type: type } },
        });
        if (error) throw error;
        setSent(true);
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error;
        toast.success("Check your email for a reset link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(String(r.error.message ?? r.error));
  }

  if (sent)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-3xl font-semibold">Check your email</h1>
        <p className="mt-3 text-muted-foreground">We sent a confirmation link to {email}. Click it to activate your account.</p>
      </div>
    );

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-xl border bg-card p-8 shadow-card">
        <h1 className="text-3xl font-semibold">
          {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset password" : "Welcome back"}
        </h1>
        {mode === "signup" && (
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {(["student", "employer"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-md py-2 text-sm font-medium capitalize ${type === t ? "bg-card shadow-card" : "text-muted-foreground"}`}
              >
                {t === "student" ? "Student / Graduate" : "Employer"}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label>{type === "employer" ? "Your name (recruiter)" : "Full name"}</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{type === "student" && mode === "signup" ? "University email" : "Email"}</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
          </Button>
        </form>
        {mode !== "forgot" && (
          <>
            <div className="my-4 text-center text-xs text-muted-foreground">or</div>
            <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
            {mode === "signup" && <p className="mt-2 text-xs text-muted-foreground">Google sign-up creates a student account.</p>}
          </>
        )}
        <div className="mt-6 flex justify-between text-sm">
          {mode === "signin" ? (
            <>
              <button className="text-accent hover:underline" onClick={() => setMode("signup")}>Create an account</button>
              <button className="text-muted-foreground hover:underline" onClick={() => setMode("forgot")}>Forgot password?</button>
            </>
          ) : (
            <button className="text-accent hover:underline" onClick={() => setMode("signin")}>Already have an account? Sign in</button>
          )}
        </div>
      </div>
    </div>
  );
}
