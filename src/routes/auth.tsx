import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { bootstrapFirstAdmin, hasAnyUser } from "@/lib/admin.functions";
import { usernameToEmail } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Accesso — Casinò Revenge" },
      { name: "description", content: "Accedi al pannello di gestione del Casinò Revenge." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const checkUsers = useServerFn(hasAnyUser);
  const bootstrap = useServerFn(bootstrapFirstAdmin);
  const [mounted, setMounted] = useState(false);
  const [bootstrapMode, setBootstrapMode] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    checkUsers()
      .then((r) => {
        if (active) setBootstrapMode(!r.hasUser);
      })
      .catch(() => {
        if (active) setBootstrapMode(false);
      });
    return () => {
      active = false;
    };
  }, [checkUsers]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (data.session?.user?.id) {
        const [{ data: prof }, { data: roles }] = await Promise.all([
          supabase
            .from("profiles")
            .select("has_employee_access")
            .eq("id", data.session.user.id)
            .maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", data.session.user.id),
        ]);
        if (!active) return;
        const isEmployeeOrAdmin =
          prof?.has_employee_access || (roles || []).some((r: any) => r.role === "admin");
        if (isEmployeeOrAdmin) {
          navigate({ to: "/dashboard" });
        } else {
          navigate({ to: "/" });
        }
      }
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (bootstrapMode) {
        await bootstrap({ data: { username, password, displayName: displayName || username } });
        toast.success("Amministratore creato. Effettua l'accesso.");
        setBootstrapMode(false);
        setPassword("");
        return;
      }
      const { data: authRes, error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password,
      });
      if (error) throw error;
      toast.success("Accesso effettuato con successo");

      if (authRes.user?.id) {
        const [{ data: prof }, { data: roles }] = await Promise.all([
          supabase
            .from("profiles")
            .select("has_employee_access")
            .eq("id", authRes.user.id)
            .maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", authRes.user.id),
        ]);
        const isEmployeeOrAdmin =
          prof?.has_employee_access || (roles || []).some((r: any) => r.role === "admin");
        if (isEmployeeOrAdmin) {
          navigate({ to: "/dashboard" });
        } else {
          navigate({ to: "/" });
        }
      } else {
        navigate({ to: "/" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Errore di accesso");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-primary/30 shadow-[0_0_60px_-15px] shadow-primary/40">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary flex items-center justify-center text-2xl">
            ♠
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">
            Casinò Revenge
          </CardTitle>
          <CardDescription>
            {bootstrapMode === null
              ? "Caricamento…"
              : bootstrapMode
                ? "Crea il primo amministratore"
                : "Accedi al pannello di gestione"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="u">Username</Label>
              <Input
                id="u"
                required
                minLength={3}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            {bootstrapMode && (
              <div className="space-y-2">
                <Label htmlFor="dn">Nome visualizzato</Label>
                <Input
                  id="dn"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="p">Password</Label>
              <Input
                id="p"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={bootstrapMode ? "new-password" : "current-password"}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || bootstrapMode === null}>
              {bootstrapMode ? "Crea amministratore" : "Accedi"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => navigate({ to: "/" })}
            >
              ← Torna alla Guida del Casinò
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
