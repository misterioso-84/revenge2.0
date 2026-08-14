import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteFooter } from "@/components/Footer";
import { Anchor, Users, MessageCircle, Search, ArrowLeft, Crown, LogOut } from "lucide-react";
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

  // Dynamically group staff by their exact configured roleName
  const groupedRoles = filteredStaff.reduce(
    (acc, member) => {
      const rName = member.roleName || "Staff";
      if (!acc[rName]) {
        acc[rName] = {
          name: rName,
          weight: member.staffWeight ?? 50,
          color: member.staffColor || "#f59e0b",
          members: [],
        };
      }
      acc[rName].members.push(member);
      return acc;
    },
    {} as Record<
      string,
      { name: string; weight: number; color: string; members: typeof staffList }
    >,
  );

  const roleGroups = Object.values(groupedRoles).sort((a, b) => b.weight - a.weight);

  const renderRoleGroup = (groupName: string, colorHex: string, members: typeof staffList) => {
    if (members.length === 0) return null;

    return (
      <div key={groupName} className="space-y-6">
        <div className="flex justify-center">
          <div
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest border shadow-lg"
            style={{
              backgroundColor: `${colorHex}15`,
              borderColor: `${colorHex}40`,
              color: colorHex,
            }}
          >
            <Crown className="h-4 w-4" style={{ color: colorHex }} />
            <span>{groupName}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 flex flex-col items-center text-center space-y-3 transition-all duration-300 shadow-xl group hover:-translate-y-1"
            >
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 h-32 w-28 flex items-center justify-center shadow-inner relative group-hover:border-amber-500/40 transition-colors">
                <img
                  src={`https://mc-heads.net/body/${encodeURIComponent(member.username)}/120`}
                  alt={`Skin di ${member.username}`}
                  className="h-28 object-contain drop-shadow-md transition-transform group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      `https://mc-heads.net/avatar/${encodeURIComponent(member.username)}/80`;
                  }}
                />
              </div>

              <div className="space-y-1 w-full min-w-0">
                <div className="font-black text-white text-sm md:text-base tracking-wide truncate">
                  {member.displayName || member.username}
                </div>
                <div
                  className="text-[10px] font-extrabold uppercase tracking-widest truncate"
                  style={{ color: member.staffColor || "#f59e0b" }}
                >
                  {member.roleName}
                </div>
              </div>

              {member.telegramHandle ? (
                <a
                  href={`https://t.me/${member.telegramHandle.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] text-sky-400 hover:text-sky-300 font-mono font-semibold bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1 rounded-full border border-sky-500/20 transition-colors"
                >
                  <MessageCircle className="h-3 w-3" />
                  {member.telegramHandle.startsWith("@")
                    ? member.telegramHandle
                    : `@${member.telegramHandle}`}
                </a>
              ) : (
                <div className="text-[10px] text-slate-500 font-mono italic">@CasinòRevenge</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200 flex flex-col justify-between">
      <div>
        {/* HEADER NAVBAR */}
        <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-amber-500/20 px-4 lg:px-8 py-3 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
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

        {/* TITLE BANNER (Matching Image 2 Style) */}
        <section className="relative pt-12 pb-10 px-4 overflow-hidden">
          <div className="max-w-5xl mx-auto text-center relative z-10 space-y-3">
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
              LA CIURMA DI LIBERTY BAY
            </h1>

            {/* Diamond Divider Symbol */}
            <div className="flex items-center justify-center gap-2 my-2">
              <div className="h-[1px] w-12 bg-amber-500/40" />
              <span className="text-amber-400 text-xs font-bold">◆</span>
              <div className="h-[1px] w-12 bg-amber-500/40" />
            </div>

            <p className="text-slate-400 text-xs md:text-sm max-w-xl mx-auto uppercase tracking-wider font-medium">
              L'equipaggio e lo staff ufficiale in servizio al Casinò Revenge
            </p>

            <div className="pt-3 flex justify-center">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca per Nickname, Ruolo o Telegram..."
                  className="pl-10 bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* STAFF MEMBERS GROUPS (Matching Image 2) */}
        <main className="max-w-7xl mx-auto px-4 py-6 space-y-12">
          {isLoading ? (
            <div className="text-center py-20 text-slate-400 space-y-3">
              <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs uppercase tracking-wider font-semibold">
                Caricamento Ciurma...
              </p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <Users className="h-12 w-12 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                Nessun membro della Ciurma trovato.
              </p>
              <p className="text-xs text-slate-500">Prova a modificare i criteri di ricerca.</p>
            </div>
          ) : (
            <>
              {roleGroups.map((group) => renderRoleGroup(group.name, group.color, group.members))}
            </>
          )}

          <div className="mt-12 text-center">
            <Link to="/">
              <Button
                variant="outline"
                className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 rounded-xl font-bold text-xs"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Torna alla Guida del Casinò
              </Button>
            </Link>
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
