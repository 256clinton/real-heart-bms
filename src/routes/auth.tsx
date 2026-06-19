import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Battery, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Spiro BMS" },
      { name: "description", content: "Operator sign-in for the Spiro Battery Management Console." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/", replace: true });
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm panel p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-primary text-primary-foreground">
            <Battery className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-medium tracking-tight">Spiro BMS</h1>
            <p className="text-mono text-[10px] text-muted-foreground">
              Operator sign-in
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-mono text-xs outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-mono text-xs outline-none focus:border-primary"
            />
          </label>

          {err && (
            <div className="rounded border border-destructive/50 bg-destructive/10 px-2 py-1.5 text-mono text-[11px] text-destructive">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-mono text-xs uppercase tracking-[0.18em] text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          className="mt-4 w-full text-center text-mono text-[11px] text-muted-foreground hover:text-foreground"
        >
          {mode === "signin"
            ? "No account? Create one →"
            : "Already have an account? Sign in →"}
        </button>

        <p className="mt-5 pt-3 border-t border-border text-mono text-[10px] text-muted-foreground leading-relaxed">
          New operators get read access by default. Ask an admin to grant{" "}
          <code className="text-foreground">fleet_admin</code> for lockdown +
          charger control.
        </p>

        <div className="mt-3 text-center">
          <Link to="/auth" className="hidden" />
        </div>
      </div>
    </div>
  );
}
