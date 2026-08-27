import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SiteFooter } from "@/components/Footer";
import { SiteNavbar } from "@/components/SiteNavbar";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import {
  Anchor,
  Users,
  MessageCircle,
  Search,
  ArrowLeft,
  Crown,
  LogOut,
  Sparkles,
  Shield,
  Layers,
} from "lucide-react";
import { getPublicStaffList } from "@/lib/registration.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/ciurma")({
  head: () => ({
    meta: [
      { title: "La nostra Ciurma & Reparti — Casinò Revenge" },
      {
        name: "description",
        content:
          "Gerarchia dello Staff e Reparti del Casinò Revenge a Liberty Bay. Scopri gli amministratori, i gestori, i croupier e le extrapex della nostra ciurma.",
      },
    ],
  }),
  component: StaffCiurmaPage,
});

function StaffCiurmaPage() {
  const navigate = useNavigate();
  const { user, profile, hasEmployeeAccess } = useAuth();
  const getStaffListFn = useServerFn(getPublicStaffList);

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"roles" | "reparti">("roles");

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["public-staff-list"],
    queryFn: () => getStaffListFn(),
  });

  const staffList = Array.isArray(rawData) ? rawData : rawData?.staffMembers || [];
  const repartiList = Array.isArray(rawData) ? [] : rawData?.repartiList || [];

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
      const matchReparti = (member.reparti || []).some((r: any) =>
        r.name?.toLowerCase().includes(q),
      );
      return (
        member.username?.toLowerCase().includes(q) ||
        member.displayName?.toLowerCase().includes(q) ||
        member.roleName?.toLowerCase().includes(q) ||
        member.telegramHandle?.toLowerCase().includes(q) ||
        matchReparti
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

  const roleGroups = Object.values(groupedRoles).sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return a.name.localeCompare(b.name);
  });

  // Filtered reparti based on search query, sorted by staffWeight hierarchy
  const filteredReparti = repartiList
    .slice()
    .sort((a: any, b: any) => (b.staffWeight ?? 50) - (a.staffWeight ?? 50))
    .map((rep: any) => {
      const q = search.toLowerCase().trim();
      if (!q) return rep;
      const matchingMembers = (rep.members || []).filter(
        (m: any) =>
          m.username?.toLowerCase().includes(q) ||
          m.displayName?.toLowerCase().includes(q) ||
          m.telegramHandle?.toLowerCase().includes(q) ||
          rep.name?.toLowerCase().includes(q),
      );
      return { ...rep, members: matchingMembers };
    })
    .filter((rep: any) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return rep.name.toLowerCase().includes(q) || rep.members.length > 0;
    });

  const renderMemberCard = (member: any) => (
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

      <div className="space-y-1.5 w-full min-w-0">
        <div className="font-black text-white text-sm md:text-base tracking-wide truncate">
          {member.displayName || member.username}
        </div>
        <div
          className="text-[10px] font-extrabold uppercase tracking-widest truncate"
          style={{ color: member.staffColor || "#f59e0b" }}
        >
          {member.roleName}
        </div>

        {/* Assigned Reparti (Extrapex) Badges */}
        {member.reparti && member.reparti.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 pt-1">
            {member.reparti.map((rep: any) => (
              <Badge
                key={rep.id}
                className="text-[9px] px-2 py-0.5 border font-semibold flex items-center gap-1"
                style={{
                  backgroundColor: `${rep.staffColor || "#8b5cf6"}15`,
                  borderColor: `${rep.staffColor || "#8b5cf6"}40`,
                  color: rep.staffColor || "#8b5cf6",
                }}
              >
                <Sparkles className="h-2.5 w-2.5" />
                <span>{rep.name}</span>
              </Badge>
            ))}
          </div>
        )}
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
  );

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
          {members.map((member) => renderMemberCard(member))}
        </div>
      </div>
    );
  };

  const renderRepartoGroup = (reparto: any) => {
    if (!reparto.members || reparto.members.length === 0) return null;

    return (
      <div key={reparto.id} className="space-y-4">
        <div className="flex flex-col items-center text-center space-y-1">
          <div
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest border shadow-lg"
            style={{
              backgroundColor: `${reparto.staffColor}15`,
              borderColor: `${reparto.staffColor}40`,
              color: reparto.staffColor,
            }}
          >
            <Sparkles className="h-4 w-4" style={{ color: reparto.staffColor }} />
            <span>{reparto.name}</span>
            <span className="ml-1 bg-slate-900/80 px-2 py-0.5 rounded-full text-[10px] font-mono border border-slate-700">
              {reparto.members.length} membri
            </span>
          </div>
          {reparto.description && (
            <p className="text-xs text-slate-400 max-w-md italic">{reparto.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pt-2">
          {reparto.members.map((member: any) => renderMemberCard(member))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200 flex flex-col justify-between">
      <div>
        {/* UNIFIED FLOATING NAVBAR */}
        <SiteNavbar />

        {/* TITLE BANNER */}
        <section className="relative pt-6 sm:pt-10 pb-8 px-4 overflow-hidden">
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
              L'equipaggio, lo staff e i reparti operativi in servizio al Casinò Revenge
            </p>

            {/* View Mode Selector (Ruoli vs Reparti/Extrapex) */}
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode("roles")}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  viewMode === "roles"
                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20"
                    : "bg-slate-900 text-slate-400 hover:text-white border-slate-800"
                }`}
              >
                <Crown className="h-4 w-4" />
                <span>Gerarchia Ruoli</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("reparti")}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  viewMode === "reparti"
                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20"
                    : "bg-slate-900 text-slate-400 hover:text-white border-slate-800"
                }`}
              >
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span>Reparti (Extrapex) ({repartiList.length})</span>
              </button>
            </div>

            <div className="pt-2 flex justify-center">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    viewMode === "roles"
                      ? "Cerca per Nickname, Ruolo, Reparto o Telegram..."
                      : "Cerca per Reparto, Nickname o Telegram..."
                  }
                  className="pl-10 bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* MAIN CONTENT AREA */}
        <main className="max-w-7xl mx-auto px-4 py-6 space-y-12">
          {isLoading ? (
            <div className="text-center py-20 text-slate-400 space-y-3">
              <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs uppercase tracking-wider font-semibold">
                Caricamento Ciurma...
              </p>
            </div>
          ) : viewMode === "roles" ? (
            filteredStaff.length === 0 && filteredReparti.length === 0 ? (
              <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <Users className="h-12 w-12 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">
                  Nessun membro della Ciurma o reparto trovato.
                </p>
                <p className="text-xs text-slate-500">Prova a modificare i criteri di ricerca.</p>
              </div>
            ) : (
              <div className="space-y-12">
                {/* Main Role Hierarchy Groups */}
                {roleGroups.map((group) => renderRoleGroup(group.name, group.color, group.members))}

                {/* Reparti & Extrapex (Shown lower down when flag show_in_staff_list is active) */}
                {filteredReparti.length > 0 && (
                  <div className="pt-12 border-t border-slate-800/80 space-y-8">
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-widest shadow-lg">
                        <Sparkles className="h-4 w-4" />
                        <span>Reparti & Extrapex Operativi ({filteredReparti.length})</span>
                      </div>
                      <p className="text-xs text-slate-400 max-w-lg mx-auto uppercase tracking-wider font-medium">
                        Reparti operativi e mansioni speciali attive con la spunta nella gestione
                        ruoli
                      </p>
                    </div>

                    <div className="space-y-12">
                      {filteredReparti.map((reparto: any) => renderRepartoGroup(reparto))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : /* REPARTI (EXTRAPEX) VIEW */
          filteredReparti.length === 0 ? (
            <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <Sparkles className="h-12 w-12 text-purple-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                Nessun Reparto o membro trovato.
              </p>
              <p className="text-xs text-slate-500">
                I reparti (extrapex) vengono configurati dalla direzione nella sezione dei Ruoli.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {filteredReparti.map((reparto: any) => renderRepartoGroup(reparto))}
            </div>
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
