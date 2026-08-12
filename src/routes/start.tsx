import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Send, LogOut, CheckCircle2, ArrowRight, ExternalLink, ShieldCheck, User, Globe } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Procedura di Associazione Telegram — Casinò Revenge" },
      { name: "description", content: "Procedura ufficiale per associare il tuo nickname Minecraft all'account Telegram del Casinò Revenge." },
    ],
  }),
  component: StartPage,
});

function StartPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const isConnected = !!(user && profile && profile.telegram_connected && profile.username);

  const handleDisconnect = async () => {
    try {
      if (profile?.id) {
        await supabase
          .from("profiles")
          .update({
            telegram_connected: false,
            telegram_handle: null,
            telegram_code: null,
          })
          .eq("id", profile.id);
      }
      await supabase.auth.signOut();
      toast.success("Account Minecraft e Telegram scollegati con successo.");
      window.location.reload();
    } catch (err: any) {
      toast.error("Errore durante lo scollegamento: " + (err.message || "Riprova più tardi"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="max-w-xl w-full relative z-10 space-y-6 my-8">
        {/* Top Header Logo */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-bold text-slate-950 text-2xl shadow-xl shadow-amber-500/20 group-hover:scale-105 transition-transform">
              ♠
            </div>
            <div className="text-left">
              <div className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent uppercase">
                Casinò Revenge
              </div>
              <div className="text-xs text-amber-500/80 font-medium tracking-widest uppercase">
                Liberty Bay — Bot Telegram Ufficiale
              </div>
            </div>
          </Link>
        </div>

        {isConnected ? (
          /* CONNECTED STATE */
          <Card className="bg-slate-900/90 border-emerald-500/40 text-white shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500" />
            <CardHeader className="text-center space-y-3 pt-8 pb-4">
              <div className="mx-auto h-20 w-20 rounded-2xl bg-slate-950 border-2 border-emerald-500/60 p-1 shadow-xl flex items-center justify-center relative">
                <img
                  src={`https://mc-heads.net/avatar/${encodeURIComponent(profile?.username || "Steve")}/80`}
                  alt="Minecraft Avatar"
                  className="h-full w-full rounded-xl object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://minotar.net/helm/Steve/80.png";
                  }}
                />
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 rounded-full p-1 shadow-md">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-1">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-3 py-1 font-semibold">
                  ✅ Account Collegato
                </Badge>
                <CardTitle className="text-2xl font-black text-white pt-2 uppercase tracking-tight">
                  {profile?.display_name || profile?.username}
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Nickname Minecraft associato con successo al tuo profilo.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-2 pb-8">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
                  <span className="text-slate-400 font-medium">Nickname Minecraft:</span>
                  <span className="font-bold text-amber-400 font-mono text-sm">
                    {profile?.username}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
                  <span className="text-slate-400 font-medium">Username Telegram:</span>
                  <span className="font-bold text-sky-400 font-mono">
                    {profile?.telegram_handle || "Collegato"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Stato Associazione:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" /> Attivo & Verificato
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleDisconnect}
                  className="w-full bg-red-600/90 hover:bg-red-700 text-white font-bold h-11 text-xs uppercase tracking-wider shadow-lg shadow-red-500/20"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Scollega Account Minecraft & Telegram
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: "/" })}
                    className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-10"
                  >
                    <Globe className="h-4 w-4 mr-1.5" /> Torna alla Home
                  </Button>
                  {profile?.has_employee_access && (
                    <Button
                      onClick={() => navigate({ to: "/dashboard" })}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-10"
                    >
                      Pannello Dipendenti <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* DISCONNECTED / PROCEDURE STATE */
          <Card className="bg-slate-900/90 border-amber-500/30 text-white shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-sky-500 to-amber-500" />
            <CardHeader className="text-center space-y-3 pt-8 pb-4">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center text-3xl shadow-lg">
                🤖
              </div>
              <div className="space-y-1">
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs px-3 py-1 font-semibold">
                  Procedura Ufficiale di Associazione
                </Badge>
                <CardTitle className="text-2xl font-black text-white pt-2 uppercase tracking-tight">
                  Collega il tuo Nickname Minecraft
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs max-w-md mx-auto">
                  Nessun profilo risulta attualmente collegato. Segui i passaggi per associare il tuo account Telegram.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-2 pb-8">
              {/* Step-by-Step Procedure */}
              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-3">
                  <div className="h-7 w-7 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <strong className="text-white text-sm font-bold block">
                      Registrazione sul Sito
                    </strong>
                    <p className="text-slate-400 leading-relaxed">
                      Clicca su <strong>Registrati</strong> nella Home del Casinò ed inserisci il tuo nickname Minecraft esatto.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 border border-amber-500/30 rounded-xl flex items-start gap-3">
                  <div className="h-7 w-7 rounded-lg bg-sky-500 text-slate-950 font-black flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <strong className="text-white text-sm font-bold block">
                      Genera Comando /associa
                    </strong>
                    <p className="text-slate-400 leading-relaxed">
                      Nel Passo 2 della registrazione, clicca su <strong>'Genera Comando /associa'</strong> per ottenere il tuo codice personale di verifica.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-3">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <strong className="text-white text-sm font-bold block">
                      Invia il Comando al Bot Telegram
                    </strong>
                    <p className="text-slate-400 leading-relaxed">
                      Apri <strong className="text-sky-400">@CasinoRevengeBot</strong> su Telegram ed incolla il comando (es. <code className="text-amber-300 font-bold">/associa 849201</code>). Il sito si aggiornerà automaticamente!
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href="https://t.me/CasinoRevengeBot"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full bg-sky-600 hover:bg-sky-500 text-white font-bold h-11 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-sky-500/20 transition-all"
                >
                  <Send className="h-4 w-4" /> Apri @CasinoRevengeBot su Telegram <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                </a>

                <Link to="/">
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black h-11 text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20">
                    <User className="h-4 w-4 mr-1.5" /> Vai alla Home & Avvia Registrazione
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
