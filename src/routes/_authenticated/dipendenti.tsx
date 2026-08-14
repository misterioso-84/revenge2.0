import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SanctionsDialog } from "@/components/SanctionsDialog";
import { ForceLeaveDialog } from "@/components/ForceLeaveDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deletePanelUser } from "@/lib/admin.functions";
import {
  Clock,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  Search,
  Palmtree,
  Ban,
  Trash2,
  RefreshCw,
  Users,
  Briefcase,
  LayoutGrid,
  List,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/dipendenti")({
  component: DipendentiPage,
});

type Session = {
  id: string;
  user_id: string;
  week_id: string;
  started_at: string;
  ended_at: string | null;
};

type Prof = {
  id: string;
  username: string;
  display_name: string | null;
  badge_start_time?: string | null;
};

function DipendentiPage() {
  const { user, isAdmin, permissions = [] } = useAuth();
  const qc = useQueryClient();
  const delFn = useServerFn(deletePanelUser);
  const [sanctionsTarget, setSanctionsTarget] = useState<Prof | null>(null);
  const [forceLeaveTarget, setForceLeaveTarget] = useState<Prof | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "tutti" | "in_servizio" | "in_congedo" | "sospesi" | "fuori_servizio"
  >("tutti");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title?: string;
    description?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    onConfirm: () => {},
  });

  const canVedere = isAdmin || permissions.includes("badge.visualizza");
  const canSanzioni = isAdmin || permissions.includes("dipendenti.sanzioni");
  const canRead = canVedere;

  // Fetch active sessions (for active/inactive badge status)
  const { data: activeSessions = [] } = useQuery<Session[]>({
    queryKey: ["badge-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badge_sessions")
        .select("*")
        .is("ended_at", null);
      if (error) throw error;
      return (data ?? []) as Session[];
    },
    enabled: canRead,
    refetchInterval: 10000,
  });

  const [localMySession] = useState<{ started_at: string; week_id: string } | null>(() => {
    if (typeof window !== "undefined" && user) {
      try {
        const stored = localStorage.getItem(`badge_active_session_${user.id}`);
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Fetch all employees profiles
  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery<Prof[]>({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("display_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Prof[];
    },
    enabled: canRead,
    refetchInterval: 10000,
  });

  // Fetch leave requests to determine active leave status
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["all-leaves"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_requests").select("*");
      if (error) throw error;
      return data ?? [];
    },
    enabled: canRead,
    refetchInterval: 10000,
  });

  // Fetch sanctions to determine active suspensions and expulsions
  const { data: sanctions = [] } = useQuery<any[]>({
    queryKey: ["all-sanctions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sanctions").select("*");
      if (error) throw error;
      return data ?? [];
    },
    enabled: canRead,
    refetchInterval: 10000,
  });

  const activeSanctionsMap = useMemo(() => {
    const map = new Map<string, { type: string; expires_at: string | null; reason: string }>();
    const nowTime = new Date().getTime();
    for (const s of sanctions) {
      if (!s.is_active) continue;
      if (s.type === "espulsione") {
        map.set(s.user_id, { type: "espulsione", expires_at: null, reason: s.reason });
      } else if (s.type === "sospensione") {
        if (!s.expires_at) {
          map.set(s.user_id, { type: "espulsione", expires_at: null, reason: s.reason });
        } else {
          const expTime = new Date(s.expires_at).getTime();
          if (expTime > nowTime) {
            const existing = map.get(s.user_id);
            if (!existing || existing.type !== "espulsione") {
              map.set(s.user_id, {
                type: "sospensione",
                expires_at: s.expires_at,
                reason: s.reason,
              });
            }
          }
        }
      }
    }
    return map;
  }, [sanctions]);

  const leaveUserIds = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const dateMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const todayStr = `${dateMap.year}-${dateMap.month}-${dateMap.day}`;

    const activeLeaves = leaveRequests.filter((l: any) => {
      if (l.status !== "approved") return false;
      return l.start_date <= todayStr && l.end_date >= todayStr;
    });
    return new Set(activeLeaves.map((l: any) => l.user_id));
  }, [leaveRequests]);

  const activeUserMap = useMemo(() => {
    const map = new Map<string, Session>();
    activeSessions.forEach((s) => map.set(s.user_id, s));
    return map;
  }, [activeSessions]);

  // Stat Counters
  const totalStaff = profiles.length;
  const inServiceCount = useMemo(() => {
    return profiles.filter((p) => activeUserMap.has(p.id) || !!p.badge_start_time).length;
  }, [profiles, activeUserMap]);

  const inLeaveCount = useMemo(() => {
    return profiles.filter((p) => leaveUserIds.has(p.id)).length;
  }, [profiles, leaveUserIds]);

  const suspendedCount = useMemo(() => {
    return profiles.filter((p) => {
      const sanc = activeSanctionsMap.get(p.id);
      return sanc && sanc.type === "sospensione";
    }).length;
  }, [profiles, activeSanctionsMap]);

  // Current logged in user profile
  const currentUserProfile = useMemo(() => {
    return profiles.find((p) => p.id === user?.id);
  }, [profiles, user]);

  const offServiceCount = Math.max(0, totalStaff - inServiceCount - inLeaveCount - suspendedCount);

  // Filter profiles based on search term, status filter, and exclude permanently expelled ones
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const activeSanc = activeSanctionsMap.get(p.id);
      if (activeSanc && activeSanc.type === "espulsione") {
        return false;
      }

      let isActive = activeUserMap.has(p.id) || !!p.badge_start_time;
      if (p.id === user?.id && !isActive && localMySession) {
        isActive = true;
      }
      const isLeave = leaveUserIds.has(p.id);
      const isSuspended = activeSanc?.type === "sospensione";

      // Status Filter
      if (statusFilter === "in_servizio" && !isActive) return false;
      if (statusFilter === "in_congedo" && !isLeave) return false;
      if (statusFilter === "sospesi" && !isSuspended) return false;
      if (statusFilter === "fuori_servizio" && (isActive || isLeave || isSuspended)) return false;

      // Text Search
      const name = (p.display_name ?? "").toLowerCase();
      const username = p.username.toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || username.includes(term);
    });
  }, [
    profiles,
    searchTerm,
    statusFilter,
    activeSanctionsMap,
    activeUserMap,
    localMySession,
    leaveUserIds,
    user,
  ]);

  if (!canVedere) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <ShieldAlert className="h-16 w-16 text-red-500 animate-bounce" />
        <h2 className="text-2xl font-bold text-white">Accesso Negato</h2>
        <p className="text-slate-400 max-w-md">
          Non disponi delle autorizzazioni gestionali necessarie per visualizzare la sezione
          Dipendenti.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2 sm:px-4">
      {/* HEADER PAGE BANNER (Roleplay Gestionale Style) */}
      <div className="text-center space-y-2 pt-2">
        <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
          GESTIONALE ROLEPLAY
        </h1>
        <p className="text-slate-400 text-xs md:text-sm font-medium tracking-wide uppercase">
          PANORAMICA E STATO DI SERVIZIO DEL PERSONALE
        </p>

        {/* Diamond Line Separator */}
        <div className="flex items-center justify-center gap-3 my-3">
          <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-amber-500/50 to-amber-500/80" />
          <span className="text-amber-400 text-xs font-bold">◆</span>
          <div className="h-[1px] w-20 bg-gradient-to-l from-transparent via-amber-500/50 to-amber-500/80" />
        </div>
      </div>

      {/* USER GREETING BOX (Identical to Screenshot) */}
      <div className="rounded-2xl border border-slate-800/90 bg-[#12141c] p-6 relative overflow-hidden shadow-2xl flex flex-col sm:flex-row items-center gap-6">
        <div className="relative shrink-0">
          <div className="h-20 w-20 rounded-2xl bg-[#0a0b10] border border-slate-800 flex items-center justify-center p-2 shadow-inner">
            <img
              src={`https://mc-heads.net/avatar/${encodeURIComponent(currentUserProfile?.username || user?.email?.split("@")[0] || "Steve")}/64`}
              alt="Avatar Minecraft"
              className="h-16 w-16 rounded-xl object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://minotar.net/helm/Steve/64.png";
              }}
            />
          </div>
          <button
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["profiles-all"] });
              qc.invalidateQueries({ queryKey: ["badge-active"] });
              toast.success("Dati aggiornati");
            }}
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition-colors shadow-md"
            title="Aggiorna dati"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-1 text-center sm:text-left flex-1">
          <div className="text-sm font-bold text-white">Buongiorno,</div>
          <h2 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
            {currentUserProfile?.display_name ||
              currentUserProfile?.username ||
              user?.email?.split("@")[0] ||
              "Operatore"}
          </h2>
        </div>

        <div className="shrink-0 flex items-center gap-2 bg-[#0a0b10] border border-slate-800 px-4 py-2 rounded-xl">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            {isAdmin ? "Amministratore" : "Gestore Personale"}
          </span>
        </div>
      </div>

      {/* SECTION 1: GENERALE (Stats Overview) */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold uppercase text-white tracking-wider">
              GENERALE
            </h3>
            <p className="text-xs text-slate-400">Panoramica generale della Ciurma</p>
          </div>
        </div>

        <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-5 shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0a0b10] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-amber-400" /> Totale
              </div>
              <div className="text-2xl font-black text-amber-400 mt-2">{totalStaff}</div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">Membri registrati</div>
            </div>

            <div
              onClick={() => setStatusFilter("tutti")}
              className={`cursor-pointer bg-[#0a0b10] border p-4 rounded-xl flex flex-col justify-between transition-all ${
                statusFilter === "tutti"
                  ? "border-amber-500/80 bg-amber-500/5 shadow-lg shadow-amber-500/10"
                  : "border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-amber-400" /> Totale
              </div>
              <div className="text-2xl font-black text-amber-400 mt-2">{totalStaff}</div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">Membri registrati</div>
            </div>

            <div
              onClick={() => setStatusFilter("in_servizio")}
              className={`cursor-pointer bg-[#0a0b10] border p-4 rounded-xl flex flex-col justify-between transition-all ${
                statusFilter === "in_servizio"
                  ? "border-emerald-500/80 bg-emerald-500/5 shadow-lg shadow-emerald-500/10"
                  : "border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" /> In Servizio
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-2">{inServiceCount}</div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">Con badge attivo</div>
            </div>

            <div
              onClick={() => setStatusFilter("in_congedo")}
              className={`cursor-pointer bg-[#0a0b10] border p-4 rounded-xl flex flex-col justify-between transition-all ${
                statusFilter === "in_congedo"
                  ? "border-amber-500/80 bg-amber-500/5 shadow-lg shadow-amber-500/10"
                  : "border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Palmtree className="h-3.5 w-3.5 text-amber-400" /> In Congedo
              </div>
              <div className="text-2xl font-black text-amber-400 mt-2">{inLeaveCount}</div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">
                Assenti giustificati
              </div>
            </div>

            <div
              onClick={() => setStatusFilter("sospesi")}
              className={`cursor-pointer bg-[#0a0b10] border p-4 rounded-xl flex flex-col justify-between transition-all ${
                statusFilter === "sospesi"
                  ? "border-rose-500/80 bg-rose-500/5 shadow-lg shadow-rose-500/10"
                  : "border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Ban className="h-3.5 w-3.5 text-rose-400" /> Sospesi
              </div>
              <div className="text-2xl font-black text-rose-400 mt-2">{suspendedCount}</div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">Sanzioni attive</div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PERSONALE & REGISTRO */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold uppercase text-white tracking-wider">
                PERSONALE & REGISTRO
              </h3>
              <p className="text-xs text-slate-400">
                Gestione operativa, stato di servizio e provvedimenti
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#0a0b10] border border-slate-800 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                viewMode === "cards"
                  ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Schede
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="h-3.5 w-3.5" /> Tabella
            </button>
          </div>
        </div>

        {/* Outer Card Container */}
        <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6">
          {/* TOOLBAR: SEARCH & STATUS FILTERS */}
          <div className="bg-[#0a0b10] border border-slate-800/90 p-4 rounded-xl flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="flex items-center gap-2 bg-[#12141c] border border-slate-800 rounded-xl px-3.5 py-2 w-full lg:w-80 shadow-inner">
              <Search className="h-4 w-4 text-amber-400 shrink-0" />
              <Input
                placeholder="Cerca dipendente per nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 bg-transparent text-white p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-500 text-xs font-medium"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
              <button
                onClick={() => setStatusFilter("tutti")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider border transition-all ${
                  statusFilter === "tutti"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-[#12141c] text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                Tutti ({totalStaff})
              </button>

              <button
                onClick={() => setStatusFilter("in_servizio")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider border transition-all ${
                  statusFilter === "in_servizio"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-[#12141c] text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                In Servizio ({inServiceCount})
              </button>

              <button
                onClick={() => setStatusFilter("in_congedo")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider border transition-all ${
                  statusFilter === "in_congedo"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-[#12141c] text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                In Congedo ({inLeaveCount})
              </button>

              <button
                onClick={() => setStatusFilter("sospesi")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider border transition-all ${
                  statusFilter === "sospesi"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : "bg-[#12141c] text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                Sospesi ({suspendedCount})
              </button>

              <button
                onClick={() => setStatusFilter("fuori_servizio")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider border transition-all ${
                  statusFilter === "fuori_servizio"
                    ? "bg-slate-700/40 text-slate-200 border-slate-600"
                    : "bg-[#12141c] text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                Fuori Servizio ({offServiceCount})
              </button>
            </div>
          </div>

          {/* DISPLAY MODE 1: CARDS SUB-CONTAINERS (Roleplay Sub-card Grid) */}
          {viewMode === "cards" ? (
            isLoadingProfiles ? (
              <div className="text-center py-12 text-slate-400 italic text-xs font-medium">
                Caricamento dipendenti in corso...
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium bg-[#0a0b10] rounded-xl border border-slate-800">
                Nessun dipendente trovato per i filtri selezionati.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProfiles.map((p) => {
                  let isActive = activeUserMap.has(p.id) || !!p.badge_start_time;

                  if (p.id === user?.id && !isActive && localMySession) {
                    isActive = true;
                  }
                  const isLeave = leaveUserIds.has(p.id);
                  const activeSanc = activeSanctionsMap.get(p.id);

                  return (
                    <div
                      key={p.id}
                      className="bg-[#0a0b10] border border-slate-800/90 rounded-2xl p-4.5 flex flex-col justify-between gap-4 hover:border-amber-500/30 transition-all shadow-md group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Profile Info */}
                        <div className="flex items-center gap-3.5">
                          <img
                            src={`https://mc-heads.net/avatar/${encodeURIComponent(p.username)}/44`}
                            alt={p.username}
                            className="h-11 w-11 rounded-xl border border-slate-800 shrink-0 bg-[#12141c] object-contain p-0.5 group-hover:border-amber-500/40 transition-colors"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://minotar.net/helm/Steve/44.png";
                            }}
                          />
                          <div className="space-y-0.5">
                            <div className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                              {p.display_name ?? p.username}
                            </div>
                            <div className="text-xs font-mono text-slate-400 font-medium">
                              @{p.username}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge Pill */}
                        {isActive ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider shrink-0">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            IN SERVIZIO
                          </div>
                        ) : activeSanc?.type === "sospensione" ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider shrink-0">
                            <Ban className="h-3 w-3 text-rose-400" />
                            SOSPESO
                          </div>
                        ) : isLeave ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider shrink-0">
                            <Palmtree className="h-3 w-3 text-amber-400" />
                            IN CONGEDO
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#12141c] text-slate-400 border border-slate-800 text-[10px] font-bold uppercase tracking-wider shrink-0">
                            FUORI SERVIZIO
                          </div>
                        )}
                      </div>

                      {/* Action buttons row inside sub-card */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs rounded-xl h-8 px-3"
                            onClick={() => setForceLeaveTarget(p)}
                          >
                            <Palmtree className="h-3.5 w-3.5 mr-1" /> Forza Congedo
                          </Button>
                        )}
                        {canSanzioni && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="bg-rose-950/50 hover:bg-rose-900/70 text-rose-200 border border-rose-800/50 font-bold text-xs rounded-xl h-8 px-3"
                            onClick={() => setSanctionsTarget(p)}
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Sanzioni
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl"
                            title="Elimina utente"
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                title: "Elimina dipendente",
                                description: `Sei sicuro di voler eliminare DEFINITIVAMENTE l'utente "${p.display_name || p.username}"? Questa azione non può essere annullata.`,
                                onConfirm: async () => {
                                  try {
                                    await delFn({ data: { userId: p.id } });
                                    qc.invalidateQueries({ queryKey: ["profiles"] });
                                    qc.invalidateQueries({ queryKey: ["panel-users"] });
                                    toast.success("Utente eliminato");
                                  } catch (e: any) {
                                    try {
                                      await supabase.from("profiles").delete().eq("id", p.id);
                                      await supabase
                                        .from("user_roles")
                                        .delete()
                                        .eq("user_id", p.id);
                                      await supabase
                                        .from("user_custom_roles")
                                        .delete()
                                        .eq("user_id", p.id);
                                      await supabase.from("sanctions").delete().eq("user_id", p.id);
                                      qc.invalidateQueries({ queryKey: ["profiles"] });
                                      qc.invalidateQueries({ queryKey: ["panel-users"] });
                                      toast.success("Utente eliminato definitivamente");
                                    } catch (err: any) {
                                      toast.error(err?.message || "Impossibile eliminare l'utente");
                                    }
                                  }
                                },
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* DISPLAY MODE 2: HIGH-END DARK TABLE */
            <div className="overflow-hidden rounded-xl border border-slate-800">
              <Table>
                <TableHeader className="bg-[#0a0b10] border-b border-slate-800">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5">
                      Dipendente
                    </TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5">
                      Stato Servizio
                    </TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5 text-right w-44">
                      Azione / Gestione
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingProfiles ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center py-10 text-slate-400 italic text-xs"
                      >
                        Caricamento dipendenti in corso...
                      </TableCell>
                    </TableRow>
                  ) : filteredProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center py-10 text-slate-400 text-xs font-medium"
                      >
                        Nessun dipendente trovato per i filtri selezionati.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfiles.map((p) => {
                      let isActive = activeUserMap.has(p.id) || !!p.badge_start_time;

                      if (p.id === user?.id && !isActive && localMySession) {
                        isActive = true;
                      }
                      const isLeave = leaveUserIds.has(p.id);
                      const activeSanc = activeSanctionsMap.get(p.id);

                      return (
                        <TableRow
                          key={p.id}
                          className="border-b border-slate-800/60 hover:bg-[#0a0b10]/60 transition-colors"
                        >
                          {/* Name/Username */}
                          <TableCell className="font-semibold text-slate-100 py-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={`https://mc-heads.net/avatar/${encodeURIComponent(p.username)}/32`}
                                alt={p.username}
                                className="h-9 w-9 rounded-lg border border-slate-800 shrink-0 bg-[#0a0b10] object-contain p-0.5"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "https://minotar.net/helm/Steve/32.png";
                                }}
                              />
                              <div className="space-y-0.5">
                                <div className="text-sm font-black text-white">
                                  {p.display_name ?? p.username}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 font-medium">
                                  @{p.username}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Badge status */}
                          <TableCell className="py-3.5">
                            {isActive ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                IN SERVIZIO
                              </div>
                            ) : activeSanc?.type === "sospensione" ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider">
                                <Ban className="h-3 w-3 text-rose-400" />
                                SOSPESO
                              </div>
                            ) : isLeave ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                                <Palmtree className="h-3 w-3 text-amber-400" />
                                IN CONGEDO
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#0a0b10] text-slate-400 border border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                                FUORI SERVIZIO
                              </div>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs rounded-xl"
                                  onClick={() => setForceLeaveTarget(p)}
                                >
                                  <Palmtree className="h-3.5 w-3.5 mr-1" /> Forza Congedo
                                </Button>
                              )}
                              {canSanzioni && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="bg-rose-950/50 hover:bg-rose-900/70 text-rose-200 border border-rose-800/50 font-bold text-xs rounded-xl"
                                  onClick={() => setSanctionsTarget(p)}
                                >
                                  <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Sanzioni
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl"
                                  title="Elimina utente"
                                  onClick={() =>
                                    setDeleteConfirm({
                                      isOpen: true,
                                      title: "Elimina dipendente",
                                      description: `Sei sicuro di voler eliminare DEFINITIVAMENTE l'utente "${p.display_name || p.username}"? Questa azione non può essere annullata.`,
                                      onConfirm: async () => {
                                        try {
                                          await delFn({ data: { userId: p.id } });
                                          qc.invalidateQueries({ queryKey: ["profiles"] });
                                          qc.invalidateQueries({ queryKey: ["panel-users"] });
                                          toast.success("Utente eliminato");
                                        } catch (e: any) {
                                          try {
                                            await supabase.from("profiles").delete().eq("id", p.id);
                                            await supabase
                                              .from("user_roles")
                                              .delete()
                                              .eq("user_id", p.id);
                                            await supabase
                                              .from("user_custom_roles")
                                              .delete()
                                              .eq("user_id", p.id);
                                            await supabase
                                              .from("sanctions")
                                              .delete()
                                              .eq("user_id", p.id);
                                            qc.invalidateQueries({ queryKey: ["profiles"] });
                                            qc.invalidateQueries({ queryKey: ["panel-users"] });
                                            toast.success("Utente eliminato definitivamente");
                                          } catch (err: any) {
                                            toast.error(
                                              err?.message || "Impossibile eliminare l'utente",
                                            );
                                          }
                                        }
                                      },
                                    })
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Roleplay Notice Footer (Matching Image exact wording) */}
      <div className="text-center pt-6 pb-2">
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
          L'AGGIORNAMENTO DEI DATI AVVIENE AUTOMATICAMENTE OGNI 5 MINUTI
        </p>
      </div>

      {/* Render Sanctions management popup */}
      {sanctionsTarget && (
        <SanctionsDialog user={sanctionsTarget} onClose={() => setSanctionsTarget(null)} />
      )}

      {/* Render Force Leave popup */}
      {forceLeaveTarget && (
        <ForceLeaveDialog user={forceLeaveTarget} onClose={() => setForceLeaveTarget(null)} />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        description={deleteConfirm.description}
        onClose={() => setDeleteConfirm({ isOpen: false, onConfirm: () => {} })}
        onConfirm={deleteConfirm.onConfirm}
      />
    </div>
  );
}
