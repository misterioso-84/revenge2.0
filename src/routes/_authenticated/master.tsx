import { createFileRoute, redirect, isRedirect, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Users,
  Shield,
  Crown,
  Sparkles,
  Send,
  Settings,
  RefreshCw,
  LayoutGrid,
  List,
  Check,
  X,
  FileText,
  ExternalLink,
  ArrowUpDown,
  UserCheck,
  Award,
  BookOpen,
  Info,
} from "lucide-react";
import {
  getMasterEmployees,
  markExplanationStatus,
  setMasterExplanationGroup,
  calculateTimeElapsed,
} from "@/lib/master.functions";
import { CloudflareD1ControlCard } from "@/components/CloudflareD1ControlCard";

export const Route = createFileRoute("/_authenticated/master")({
  beforeLoad: async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) throw redirect({ to: "/auth" });

      const [{ data: userRoles }, { data: customs }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", data.user.id),
        supabase
          .from("user_custom_roles")
          .select("custom_roles(permissions)")
          .eq("user_id", data.user.id),
      ]);

      const isAdmin = (userRoles || []).some((r: any) => r.role === "admin");
      const perms = new Set<string>();
      for (const c of customs || []) {
        const pList = (c.custom_roles as any)?.permissions || [];
        for (const p of pList) perms.add(p);
      }

      const canAccess = isAdmin || perms.has("master.gestisci") || perms.has("master.visualizza");
      if (!canAccess) {
        throw redirect({ to: "/dashboard" });
      }
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/auth" });
    }
  },
  component: MasterPage,
});

function MasterPage() {
  const { user, isAdmin, permissions = [] } = useAuth();
  const qc = useQueryClient();

  const getMasterDataFn = useServerFn(getMasterEmployees);
  const markStatusFn = useServerFn(markExplanationStatus);
  const setGroupFn = useServerFn(setMasterExplanationGroup);

  const canManage = isAdmin || permissions.includes("master.gestisci");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "done">("all");
  const [sortBy, setSortBy] = useState<"waiting_desc" | "waiting_asc" | "name_asc" | "role">(
    "waiting_desc",
  );
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [autoKick, setAutoKick] = useState(true);

  const [markingTarget, setMarkingTarget] = useState<any>(null);
  const [markNotes, setMarkNotes] = useState("");
  const [markingAction, setMarkingAction] = useState<boolean>(true);

  // Fetch Master data
  const {
    data: masterData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["master-employees"],
    queryFn: async () => {
      return await getMasterDataFn();
    },
    refetchInterval: 10000,
  });

  const employees = useMemo(() => masterData?.employees || [], [masterData?.employees]);
  const stats = masterData?.stats || { totalEmployees: 0, pendingCount: 0, completedCount: 0 };
  const masterSettings = masterData?.masterSettings;
  const availableGroups = useMemo(
    () => masterData?.availableTelegramGroups || [],
    [masterData?.availableTelegramGroups],
  );

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    let list = [...employees];

    // Status filter
    if (statusFilter === "pending") {
      list = list.filter((e) => e.needsExplanation);
    } else if (statusFilter === "done") {
      list = list.filter((e) => !e.needsExplanation);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((e) => {
        const u = (e.username || "").toLowerCase();
        const d = (e.displayName || "").toLowerCase();
        const tg = (e.telegramHandle || "").toLowerCase();
        const rolesStr = (e.customRoles || []).map((r: any) => r.name.toLowerCase()).join(" ");
        return u.includes(q) || d.includes(q) || tg.includes(q) || rolesStr.includes(q);
      });
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === "waiting_desc") {
        return (b.timeElapsed?.durationMs || 0) - (a.timeElapsed?.durationMs || 0);
      }
      if (sortBy === "waiting_asc") {
        return (a.timeElapsed?.durationMs || 0) - (b.timeElapsed?.durationMs || 0);
      }
      if (sortBy === "name_asc") {
        return (a.displayName || a.username).localeCompare(b.displayName || b.username);
      }
      if (sortBy === "role") {
        const rA = a.customRoles?.[0]?.name || "";
        const rB = b.customRoles?.[0]?.name || "";
        return rA.localeCompare(rB);
      }
      return 0;
    });

    return list;
  }, [employees, statusFilter, search, sortBy]);

  // Mutation to mark status
  const markMutation = useMutation({
    mutationFn: async ({
      userId,
      done,
      notes,
    }: {
      userId: string;
      done: boolean;
      notes?: string;
    }) => {
      return await markStatusFn({ data: { userId, done, notes } });
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["master-employees"] });
      qc.invalidateQueries({ queryKey: ["master-stats-summary"] });
      qc.invalidateQueries({ queryKey: ["admin-telegram-groups"] });
      setMarkingTarget(null);
      setMarkNotes("");
      toast.success(
        variables.done
          ? "Spiegazione contrassegnata come completata!"
          : "Stato reimpostato su 'Deve Ricevere Spiegazione'.",
      );
    },
    onError: (err: any) => {
      toast.error(err.message || "Errore durante l'aggiornamento dello stato.");
    },
  });

  // Mutation for Telegram explanation group settings
  const saveSettingsMutation = useMutation({
    mutationFn: async ({
      groupId,
      autoKickOnDone,
    }: {
      groupId: string | null;
      autoKickOnDone: boolean;
    }) => {
      return await setGroupFn({ data: { groupId, autoKickOnDone } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master-employees"] });
      qc.invalidateQueries({ queryKey: ["admin-telegram-groups"] });
      setSettingsOpen(false);
      toast.success("Impostazioni Gruppo Formazione Telegram salvate con successo!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Errore durante il salvataggio delle impostazioni.");
    },
  });

  const configuredGroupName = useMemo(() => {
    if (!masterSettings?.explanation_group_id) return null;
    const g = availableGroups.find((grp: any) => grp.id === masterSettings.explanation_group_id);
    return g?.title || `Gruppo ID: ${masterSettings.explanation_group_id}`;
  }, [masterSettings, availableGroups]);

  return (
    <div className="space-y-8 py-2 pb-16">
      {/* Title Section (Roleplay Theme) */}
      <div className="text-center space-y-2 pt-2">
        <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-3">
          <GraduationCap className="h-8 w-8 md:h-11 md:w-11 text-amber-400" />
          MASTER SPIEGAZIONI STAFF
        </h1>

        {/* Diamond Divider */}
        <div className="flex items-center justify-center gap-2 my-2">
          <div className="h-[1px] w-12 bg-amber-500/40" />
          <span className="text-amber-400 text-xs font-bold">◆</span>
          <div className="h-[1px] w-12 bg-amber-500/40" />
        </div>

        <p className="text-slate-400 text-xs md:text-sm max-w-2xl mx-auto uppercase tracking-wider font-medium">
          SUPERVISIONE E CONTROLLO SPIEGAZIONE RUOLI DIPENDENTI, FORMAZIONE E ABILITAZIONI GRUPPO
        </p>
      </div>

      {/* Cloudflare D1 Migration & Control */}
      {canManage && <CloudflareD1ControlCard />}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: Da Spiegare */}
        <div
          onClick={() => setStatusFilter("pending")}
          className={`cursor-pointer border rounded-2xl p-4 flex items-center gap-3.5 shadow-xl relative overflow-hidden transition-all ${
            stats.pendingCount > 0
              ? "bg-gradient-to-br from-amber-500/15 via-[#12141c] to-[#12141c] border-amber-500/50 hover:border-amber-400 shadow-amber-500/10"
              : "bg-[#12141c] border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white">{stats.pendingCount}</span>
              {stats.pendingCount > 0 && (
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              Da Spiegare
            </div>
          </div>
        </div>

        {/* Card 2: Spiegazioni Fatte */}
        <div
          onClick={() => setStatusFilter("done")}
          className="cursor-pointer bg-[#12141c] border border-emerald-500/30 hover:border-emerald-500/50 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl relative overflow-hidden transition-all"
        >
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{stats.completedCount}</div>
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              Spiegazioni Fatte
            </div>
          </div>
        </div>

        {/* Card 3: Totale Staff */}
        <div
          onClick={() => setStatusFilter("all")}
          className="cursor-pointer bg-[#12141c] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl relative overflow-hidden transition-all"
        >
          <div className="h-11 w-11 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{stats.totalEmployees}</div>
            <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
              Totale Dipendenti
            </div>
          </div>
        </div>

        {/* Card 4: Gruppo Telegram Formazione */}
        <div className="bg-[#12141c] border border-purple-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 shadow-inner">
              <Send className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-white truncate">
                {configuredGroupName || "Non configurato"}
              </div>
              <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                Gruppo Spiegazioni
              </div>
            </div>
          </div>

          {canManage && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setSelectedGroupId(masterSettings?.explanation_group_id || "");
                setAutoKick(masterSettings?.auto_kick_on_done ?? true);
                setSettingsOpen(true);
              }}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
              title="Configura Gruppo Telegram Spiegazioni"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                statusFilter === "all"
                  ? "bg-slate-700 text-white shadow"
                  : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              Tutti ({employees.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                statusFilter === "pending"
                  ? "bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                  : "bg-slate-900/80 text-amber-400 hover:bg-amber-500/10 border border-amber-500/30"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Da Spiegare ({stats.pendingCount})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("done")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                statusFilter === "done"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-slate-900/80 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Spiegazione Fatta ({stats.completedCount})
            </button>
          </div>

          {/* Search, Sort and View Mode */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-64 min-w-[180px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca dipendente o ruolo..."
                className="pl-9 bg-[#0a0b10] border-slate-800 text-xs rounded-xl text-white placeholder:text-slate-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-[#0a0b10] border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="waiting_desc">Più tempo in attesa</option>
              <option value="waiting_asc">Meno tempo in attesa</option>
              <option value="name_asc">Nome Alfabetico (A-Z)</option>
              <option value="role">Per Ruolo</option>
            </select>

            {/* View Mode Toggle */}
            <div className="bg-[#0a0b10] border border-slate-800 p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "cards"
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Vista Schede"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "table"
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Vista Tabella"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <Button
              size="icon"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-slate-800 bg-[#0a0b10] text-slate-300 hover:text-white h-9 w-9 rounded-xl"
              title="Ricarica Dati"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-amber-400" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Employees Content */}
      {filteredEmployees.length === 0 ? (
        <Card className="bg-[#12141c] border-slate-800 text-center py-16">
          <CardContent className="space-y-3">
            <GraduationCap className="h-10 w-10 text-slate-600 mx-auto" />
            <div className="text-white font-bold text-base">Nessun dipendente trovato</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {search
                ? "Nessun membro dello staff corrisponde ai parametri di ricerca."
                : statusFilter === "pending"
                  ? "Ottimo lavoro! Nessun dipendente è attualmente in attesa di spiegazione."
                  : "Nessun dipendente presente in questa categoria."}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        /* CARDS GRID VIEW */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => {
            const isPending = emp.needsExplanation;
            const isUrgent = emp.timeElapsed?.isUrgent;

            return (
              <Card
                key={emp.id}
                className={`bg-[#12141c] border rounded-2xl shadow-xl overflow-hidden transition-all relative flex flex-col justify-between ${
                  isPending
                    ? isUrgent
                      ? "border-rose-500/60 bg-gradient-to-b from-rose-500/5 via-[#12141c] to-[#12141c] shadow-rose-500/5"
                      : "border-amber-500/50 bg-gradient-to-b from-amber-500/5 via-[#12141c] to-[#12141c] shadow-amber-500/5"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Top Accent Strip */}
                <div
                  className={`h-1.5 w-full ${
                    isPending ? (isUrgent ? "bg-rose-500" : "bg-amber-500") : "bg-emerald-500"
                  }`}
                />

                <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  {/* Header info */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={`https://mc-heads.net/avatar/${encodeURIComponent(emp.username || "Steve")}/44`}
                            alt={emp.displayName}
                            className="h-11 w-11 rounded-xl border border-slate-700 object-cover bg-slate-900 shadow"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://minotar.net/helm/Steve/44.png";
                            }}
                          />
                          {isPending && (
                            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 border-2 border-[#12141c] flex items-center justify-center text-[8px] font-bold text-slate-950">
                              !
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-black text-white text-base truncate flex items-center gap-1.5">
                            <span>{emp.displayName}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                            <span>@{emp.username}</span>
                            {emp.telegramHandle && (
                              <span className="text-sky-400 font-sans">
                                {emp.telegramHandle.startsWith("@")
                                  ? emp.telegramHandle
                                  : `@${emp.telegramHandle}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {isPending ? (
                          <Badge
                            className={`text-[10px] font-black uppercase px-2.5 py-1 ${
                              isUrgent
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            }`}
                          >
                            ⚠️ Da Spiegare
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase px-2.5 py-1">
                            ✓ Spiegata
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Assigned Roles */}
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                        <Shield className="h-3 w-3 text-amber-400" /> Ruolo & Incarichi:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {emp.customRoles.map((r: any) => (
                          <span
                            key={r.id}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                            style={{
                              backgroundColor: `${r.staff_color || "#3b82f6"}18`,
                              borderColor: `${r.staff_color || "#3b82f6"}40`,
                              color: "#ffffff",
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: r.staff_color || "#3b82f6" }}
                            />
                            <span>{r.name}</span>
                          </span>
                        ))}
                        {emp.customRoles.length === 0 && (
                          <Badge
                            variant="outline"
                            className="text-slate-400 border-slate-700 text-[10px]"
                          >
                            Membro Ciurma (Base)
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Timing Details */}
                    <div className="p-2.5 rounded-xl bg-[#0a0b10] border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1 font-medium">
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                          {isPending ? "In attesa da:" : "Completata:"}
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            isPending
                              ? isUrgent
                                ? "text-rose-400"
                                : "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {isPending
                            ? emp.timeElapsed?.text || "In attesa"
                            : emp.explanationDoneAt
                              ? new Date(emp.explanationDoneAt).toLocaleDateString("it-IT", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Completata"}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5 border-t border-slate-800/80">
                        <span>Ultimo cambio ruolo / inserimento:</span>
                        <span className="font-mono text-slate-400">
                          {new Date(emp.roleChangedAt).toLocaleDateString("it-IT", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {!isPending && emp.explanationDoneByName && (
                        <div className="text-[10px] text-emerald-400/90 pt-0.5 flex items-center justify-between">
                          <span>Spiegata da:</span>
                          <span className="font-bold">{emp.explanationDoneByName}</span>
                        </div>
                      )}

                      {emp.notes && (
                        <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
                          "{emp.notes}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <Link
                      to="/cittadini"
                      search={{ search: emp.username }}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-medium"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-sky-400" /> Scheda
                    </Link>

                    {canManage && (
                      <div className="flex items-center gap-1.5">
                        {isPending ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setMarkingTarget(emp);
                              setMarkingAction(true);
                              setMarkNotes("");
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md h-8 px-3"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Spiegazione Fatta
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setMarkingTarget(emp);
                              setMarkingAction(false);
                              setMarkNotes("");
                            }}
                            className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-semibold text-xs rounded-xl h-8 px-2.5"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Da Spiegare
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="bg-[#12141c] border-slate-800/90 shadow-2xl rounded-2xl overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 bg-[#0a0b10]">
                  <TableHead className="py-3 px-4 text-xs font-mono uppercase text-slate-400">
                    Dipendente
                  </TableHead>
                  <TableHead className="py-3 px-4 text-xs font-mono uppercase text-slate-400">
                    Ruolo / Reparto
                  </TableHead>
                  <TableHead className="py-3 px-4 text-xs font-mono uppercase text-slate-400">
                    Stato Spiegazione
                  </TableHead>
                  <TableHead className="py-3 px-4 text-xs font-mono uppercase text-slate-400">
                    Tempo Trascorso / Data
                  </TableHead>
                  <TableHead className="py-3 px-4 text-xs font-mono uppercase text-slate-400 text-right">
                    Azioni
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => {
                  const isPending = emp.needsExplanation;
                  const isUrgent = emp.timeElapsed?.isUrgent;

                  return (
                    <TableRow
                      key={emp.id}
                      className={`border-slate-800/80 transition-colors ${
                        isPending
                          ? isUrgent
                            ? "bg-rose-500/5 hover:bg-rose-500/10"
                            : "bg-amber-500/5 hover:bg-amber-500/10"
                          : "hover:bg-slate-800/30"
                      }`}
                    >
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://mc-heads.net/avatar/${encodeURIComponent(emp.username || "Steve")}/32`}
                            alt={emp.displayName}
                            className="h-8 w-8 rounded-lg border border-slate-700 object-cover bg-slate-900 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://minotar.net/helm/Steve/32.png";
                            }}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-white text-xs sm:text-sm truncate">
                              {emp.displayName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              @{emp.username}
                              {emp.telegramHandle && ` (${emp.telegramHandle})`}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {emp.customRoles.map((r: any) => (
                            <span
                              key={r.id}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                              style={{
                                backgroundColor: `${r.staff_color || "#3b82f6"}18`,
                                borderColor: `${r.staff_color || "#3b82f6"}40`,
                                color: "#ffffff",
                              }}
                            >
                              <span>{r.name}</span>
                            </span>
                          ))}
                          {emp.customRoles.length === 0 && (
                            <Badge
                              variant="outline"
                              className="text-slate-400 border-slate-700 text-[10px]"
                            >
                              Ciurma
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5 px-4">
                        {isPending ? (
                          <Badge
                            className={`text-[10px] font-black uppercase px-2 py-0.5 ${
                              isUrgent
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            }`}
                          >
                            ⚠️ Deve Ricevere Spiegazione
                          </Badge>
                        ) : (
                          <div className="flex flex-col">
                            <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase px-2 py-0.5 w-fit">
                              ✓ Spiegazione Fatta
                            </Badge>
                            {emp.explanationDoneByName && (
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                da {emp.explanationDoneByName}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span
                            className={`font-mono text-xs font-bold ${
                              isPending
                                ? isUrgent
                                  ? "text-rose-400"
                                  : "text-amber-400"
                                : "text-slate-300"
                            }`}
                          >
                            {isPending
                              ? `In attesa da: ${emp.timeElapsed?.text}`
                              : `Fatta il ${
                                  emp.explanationDoneAt
                                    ? new Date(emp.explanationDoneAt).toLocaleDateString("it-IT")
                                    : "-"
                                }`}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Cambio ruolo: {new Date(emp.roleChangedAt).toLocaleDateString("it-IT")}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5 px-4 text-right">
                        {canManage && (
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setMarkingTarget(emp);
                                  setMarkingAction(true);
                                  setMarkNotes("");
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg h-7 px-2.5"
                              >
                                <Check className="h-3 w-3 mr-1" /> Fatta
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setMarkingTarget(emp);
                                  setMarkingAction(false);
                                  setMarkNotes("");
                                }}
                                className="border-slate-700 text-slate-400 hover:text-amber-300 hover:border-amber-500/40 text-xs rounded-lg h-7 px-2"
                              >
                                <RefreshCw className="h-3 w-3 mr-1" /> Reset
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* DIALOG: Mark Explanation Action */}
      {markingTarget && (
        <Dialog open onOpenChange={() => setMarkingTarget(null)}>
          <DialogContent className="max-w-md bg-[#12141c] border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {markingAction ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    Conferma Spiegazione Effettuata
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5 text-amber-400" />
                    Reimposta Stato su "Da Spiegare"
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                {markingAction
                  ? `Stai contrassegnando come completata la spiegazione del ruolo per ${markingTarget.displayName} (@${markingTarget.username}).`
                  : `Stai reimpostando lo stato di ${markingTarget.displayName} (@${markingTarget.username}) su "Deve Ricevere Spiegazione".`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="p-3 bg-[#0a0b10] border border-slate-800 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Dipendente:</span>
                  <span className="font-bold text-white">
                    {markingTarget.displayName} (@{markingTarget.username})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">In attesa da:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {markingTarget.timeElapsed?.text}
                  </span>
                </div>
                {configuredGroupName && (
                  <div className="flex justify-between pt-1 border-t border-slate-800 text-[11px]">
                    <span className="text-slate-400">Gruppo Telegram Formazione:</span>
                    <span className="font-semibold text-purple-300">
                      {markingAction
                        ? "Verrà congedato dal gruppo"
                        : "Verrà autorizzato nel gruppo"}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">
                  Note aggiuntive (opzionale):
                </Label>
                <Input
                  value={markNotes}
                  onChange={(e) => setMarkNotes(e.target.value)}
                  placeholder="es. Spiegati comandi roulette e procedure di cassa..."
                  className="bg-[#0a0b10] border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setMarkingTarget(null)}
                className="border-slate-700 text-slate-300"
              >
                Annulla
              </Button>
              <Button
                disabled={markMutation.isPending}
                onClick={() => {
                  markMutation.mutate({
                    userId: markingTarget.id,
                    done: markingAction,
                    notes: markNotes.trim() || undefined,
                  });
                }}
                className={
                  markingAction
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    : "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                }
              >
                {markMutation.isPending ? "Salvataggio..." : "Conferma"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG: Telegram Explanation Group Configuration */}
      {settingsOpen && (
        <Dialog open onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-lg bg-[#12141c] border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-amber-400" />
                Configurazione Gruppo Formazione Telegram
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Seleziona il gruppo Telegram riservato all'accoglienza e spiegazione dei nuovi
                ruoli.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold">
                  Seleziona Gruppo Telegram Ufficiale:
                </Label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full bg-[#0a0b10] border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Nessun gruppo dedicato (Disabilitato) --</option>
                  {availableGroups.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.chat_id})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Tutti i dipendenti che hanno lo stato <b>"Deve Ricevere Spiegazione"</b>{" "}
                  otterranno automaticamente la licenza / eccezione per entrare in questo gruppo.
                </p>
              </div>

              <div className="p-3 bg-[#0a0b10] border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autokick"
                    checked={autoKick}
                    onChange={(e) => setAutoKick(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500"
                  />
                  <Label
                    htmlFor="autokick"
                    className="text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    Espulsione automatica al termine della spiegazione
                  </Label>
                </div>
                <p className="text-[10px] text-slate-500 pl-5">
                  Quando contrassegni un dipendente come <b>"Spiegazione Fatta"</b>, il bot lo
                  rimuoverà automaticamente dalle eccezioni del gruppo e dal gruppo Telegram stesso.
                  Se in futuro gli verrà cambiato il ruolo, verrà riammesso per ricevere nuova
                  formazione.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSettingsOpen(false)}
                className="border-slate-700 text-slate-300"
              >
                Annulla
              </Button>
              <Button
                disabled={saveSettingsMutation.isPending}
                onClick={() => {
                  saveSettingsMutation.mutate({
                    groupId: selectedGroupId || null,
                    autoKickOnDone: autoKick,
                  });
                }}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              >
                {saveSettingsMutation.isPending ? "Salvataggio..." : "Salva Configurazione"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
