import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { generateSSOToken } from "@/lib/sso.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LayoutDashboard,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({
  redirect_uri: z.string().optional(),
  app_name: z.string().optional(),
});

export const Route = createFileRoute("/sso")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: SSOPage,
});

function SSOPage() {
  const { redirect_uri, app_name = "Board & Workspace Revenge" } = useSearch({ from: "/sso" });
  const { user, profile, isAdmin, hasEmployeeAccess, loading } = useAuth();
  const navigate = useNavigate();

  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProceedSSO = async () => {
    if (!user) {
      navigate({
        to: "/auth",
        search: { redirect: `/sso?redirect_uri=${encodeURIComponent(redirect_uri || "")}` } as any,
      });
      return;
    }

    try {
      setAuthorizing(true);
      setError(null);
      const res = await generateSSOToken();

      if (!res.ok || !res.token) {
        throw new Error("Impossibile generare il token di accesso.");
      }

      if (redirect_uri) {
        const targetUrl = new URL(redirect_uri);
        targetUrl.searchParams.set("sso_token", res.token);
        window.location.href = targetUrl.toString();
      } else {
        toast.success("Token SSO generato con successo!");
      }
    } catch (err: any) {
      setError(err.message || "Errore durante l'autorizzazione SSO.");
      toast.error(err.message || "Accesso non autorizzato.");
      setAuthorizing(false);
    }
  };

  useEffect(() => {
    if (!loading && user && redirect_uri && !error && !authorizing) {
      // Auto-authorize if user is already logged in
      handleProceedSSO();
    }
  }, [loading, user, redirect_uri]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
        <p className="text-slate-400 font-medium">Verifica sessione Casinò Revenge in corso...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md bg-slate-900/90 border border-amber-500/20 backdrop-blur-md shadow-2xl relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mb-3">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-100 flex items-center justify-center gap-2">
            Autenticazione Casinò Revenge
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Accesso sicuro Single Sign-On (SSO) per <strong>{app_name}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {error ? (
            <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-300 text-sm">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-200">Accesso Negato</p>
                <p className="text-red-300/90 text-xs mt-0.5">{error}</p>
              </div>
            </div>
          ) : user ? (
            <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1.5 text-xs text-slate-300">
              <p className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                Utente Riconosciuto
              </p>
              <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                {profile?.display_name || profile?.username || user.email}
                {isAdmin && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                    Admin
                  </span>
                )}
              </p>
              <p className="text-slate-400">
                @{profile?.username || "user"} • Casinò Revenge Staff
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-300 text-center">
              È necessario accedere al gestionale Casinò Revenge per autenticarsi sull'applicazione
              Board.
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2">
            {user ? (
              <Button
                onClick={handleProceedSSO}
                disabled={authorizing}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold shadow-lg shadow-amber-500/20 h-11"
              >
                {authorizing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Autorizzazione in corso...
                  </>
                ) : (
                  <>
                    Autorizza e Continua
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() =>
                  navigate({
                    to: "/auth",
                    search: {
                      redirect: `/sso?redirect_uri=${encodeURIComponent(redirect_uri || "")}`,
                    } as any,
                  })
                }
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-11"
              >
                Accedi al Casinò Revenge
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => navigate({ to: "/dashboard" })}
              className="text-slate-400 hover:text-white text-xs"
            >
              Torna al Gestionale
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
