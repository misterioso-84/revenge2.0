import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Anchor,
  Users,
  MessageCircle,
  Search,
  ArrowLeft,
  Crown,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { getPublicStaffList } from "@/lib/registration.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/ciurma")({
  head: () => ({
    meta: [
      { title: "La nostra Ciurma — Casinò Revenge" },
      {
        name: "description",
        content:
          "Gerarchia dello Staff del Casinò Revenge a Liberty Bay. Scopri gli amministratori, i gestori e i croupier della nostra ciurma.",
      },
    ],
  }),
  component: StaffCiurmaPage,
});

function StaffCiurmaPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const getStaffListFn = useServerFn(getPublicStaffList);

  const [search, setSearch] = useState("");

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ["public-staff-list"],
    queryFn: () => getStaffListFn(),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.info("Scollegato con successo.");
  };

  const filteredStaff = staffList
    .slice()
    .sort((a, b) => (b.staffWeight ?? 50) - (a.staffWeight ?? 50))
    .filter((member) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        member.username?.toLowerCase().includes(q) ||
        member.displayName?.toLowerCase().includes(q) ||
        member.roleName?.toLowerCase().includes(q) ||
        member.telegramHandle?.toLowerCase().includes(q)
      );
    });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-amber-500/20 px-4 lg:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              ♠
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent uppercase">
                Casinò Revenge
              </div>
              <div className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
                Liberty Bay • Guida Ufficiale
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Link to="/" className="hover:text-amber-400 transition-colors">
              Home & Guida
            </Link>
            <Link to="/" hash="valute" className="hover:text-amber-400 transition-colors">
              Valute
            </Link>
            <Link to="/" hash="giochi" className="hover:text-amber-400 transition-colors">
              Giochi
            </Link>
            <Link to="/ciurma" className="text-amber-400 font-bold flex items-center gap-1.5">
              <Anchor className="h-3.5 w-3.5 text-amber-500" /> La nostra Ciurma
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 px-4"
                  onClick={() => navigate({ to: "/dashboard" })}
                >
                  Pannello Dipendenti
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-slate-400 hover:text-white"
                  onClick={signOut}
                  title="Scollegati"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 px-4"
                onClick={() => navigate({ to: "/" })}
              >
                Accedi / Registrati
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="relative pt-12 pb-16 px-4 border-b border-amber-500/10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Anchor className="h-4 w-4 text-amber-500 animate-pulse" /> La nostra Ciurma • Staff Ufficiale
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
            L'Equipaggio del Casinò Revenge
          </h1>

          <p className="text-slate-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            I volti e le figure chiave che garantiscono l'eccellenza, la sicurezza ed il fair-play nei tavoli da gioco e nelle attrazioni di Liberty Bay.
            Ordinati dal peso gerarchico più alto fino ai croupier operativi.
          </p>

          <div className="pt-4 flex justify-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca per Nickname, Ruolo o Telegram..."
                className="pl-10 bg-slate-900/90 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* STAFF MEMBERS GRID */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs uppercase tracking-wider font-semibold">Caricamento Ciurma...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
            <Users className="h-12 w-12 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Nessun membro della Ciurma trovato.</p>
            <p className="text-xs text-slate-500">Prova a modificare i criteri di ricerca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStaff.map((member, index) => {
              const rank = index + 1;
              const isTopRole = (member.staffWeight ?? 50) >= 90;

              return (
                <Card
                  key={member.id}
                  className="bg-slate-900/90 border border-amber-500/20 hover:border-amber-500/50 transition-all duration-300 overflow-hidden group shadow-xl flex flex-col justify-between"
                >
                  <div
                    className="h-2 w-full"
                    style={{ backgroundColor: member.staffColor || "#3b82f6" }}
                  />

                  <CardHeader className="text-center pt-6 pb-2 space-y-3 relative">
                    {/* Rank Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-amber-400 font-bold">
                      {isTopRole ? <Crown className="h-3 w-3 text-amber-400" /> : <ShieldCheck className="h-3 w-3 text-sky-400" />}
                      #{rank}
                    </div>

                    <div className="relative mx-auto w-28 h-32 flex items-center justify-center bg-slate-950/90 rounded-2xl border border-slate-800 p-2 group-hover:border-amber-500/50 transition-colors shadow-inner">
                      <img
                        src={`https://mc-heads.net/body/${encodeURIComponent(member.username)}/120`}
                        alt={`Skin di ${member.username}`}
                        className="h-28 object-contain drop-shadow-lg transition-transform group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://mc-heads.net/avatar/${encodeURIComponent(member.username)}/80`;
                        }}
                      />
                    </div>

                    <div className="space-y-0.5">
                      <CardTitle className="text-lg font-bold text-white tracking-wide">
                        {member.displayName || member.username}
                      </CardTitle>
                      <div className="text-xs font-mono text-amber-400/90">
                        @{member.username}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="text-center space-y-4 pt-1 pb-6">
                    <div>
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold shadow-sm"
                        style={{
                          backgroundColor: `${member.staffColor || "#3b82f6"}25`,
                          color: member.staffColor || "#3b82f6",
                          border: `1px solid ${member.staffColor || "#3b82f6"}45`,
                        }}
                      >
                        {member.roleName}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs px-1">
                      <span className="text-[11px] text-slate-400">Telegram:</span>
                      {member.telegramHandle ? (
                        <a
                          href={`https://t.me/${member.telegramHandle.replace("@", "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-mono font-semibold bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 rounded-lg border border-sky-500/20 transition-colors"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {member.telegramHandle}
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Non impostato</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link to="/">
            <Button variant="outline" className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
              <ArrowLeft className="h-4 w-4 mr-2" /> Torna alla Guida del Casinò
            </Button>
          </Link>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-amber-500/20 py-8 px-4 bg-slate-950 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-amber-500 flex items-center justify-center font-bold text-slate-950 text-sm">
              ♠
            </div>
            <span className="font-bold text-slate-200 uppercase">Casinò Revenge • Liberty Bay</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Registro Ufficiale della Ciurma dello Staff.
          </p>
        </div>
      </footer>
    </div>
  );
}
