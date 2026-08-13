import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History,
  Search,
  User,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Database,
  Info,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Route = createFileRoute("/_authenticated/attivita")({
  beforeLoad: async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) throw redirect({ to: "/auth" });
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (!roles?.some((r) => r.role === "admin")) throw redirect({ to: "/cittadini" });
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/auth" });
    }
  },
  component: AttivitaPage,
});

function AttivitaPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedTable, setSelectedTable] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Fetch audit logs
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs" as any)
        .select("*")
        .order("created_at" as any, { ascending: false });

      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  // Fetch unique users list for filtering (only if admin)
  const { data: usersList = [] } = useQuery({
    queryKey: ["audit-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, display_name, username");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!isAdmin,
  });

  // Unique tables in logs for filter
  const uniqueTables = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.table_name) set.add(l.table_name);
    });
    return Array.from(set);
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      // If not admin, restrict view only to own logs
      if (!isAdmin && l.user_id !== user?.id) {
        return false;
      }

      // Search filter (searches details, username, display_name or table)
      const matchesSearch =
        search === "" ||
        l.details?.toLowerCase().includes(search.toLowerCase()) ||
        l.username?.toLowerCase().includes(search.toLowerCase()) ||
        l.user_display_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.table_name?.toLowerCase().includes(search.toLowerCase());

      // Action filter
      const matchesAction = selectedAction === "all" || l.action === selectedAction;

      // User filter (admin only)
      const matchesUser = !isAdmin || selectedUser === "all" || l.user_id === selectedUser;

      // Table filter
      const matchesTable = selectedTable === "all" || l.table_name === selectedTable;

      return matchesSearch && matchesAction && matchesUser && matchesTable;
    });
  }, [logs, user, isAdmin, search, selectedAction, selectedUser, selectedTable]);

  // Action badge renderer
  const renderActionBadge = (action: string) => {
    switch (action) {
      case "insert":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase font-bold text-[10px] tracking-wide px-2 py-0.5">
            Inserimento
          </Badge>
        );
      case "update":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase font-bold text-[10px] tracking-wide px-2 py-0.5">
            Modifica
          </Badge>
        );
      case "delete":
        return (
          <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 uppercase font-bold text-[10px] tracking-wide px-2 py-0.5">
            Eliminazione
          </Badge>
        );
      case "rpc":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase font-bold text-[10px] tracking-wide px-2 py-0.5">
            Funzione
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500/10 text-slate-400 border border-slate-500/20 uppercase font-bold text-[10px] tracking-wide px-2 py-0.5">
            {action}
          </Badge>
        );
    }
  };

  const stats = useMemo(() => {
    const myFiltered = logs.filter((l) => isAdmin || l.user_id === user?.id);
    const todayStr = new Date().toISOString().split("T")[0];
    const todayLogs = myFiltered.filter((l) => l.created_at?.startsWith(todayStr));

    return {
      total: myFiltered.length,
      today: todayLogs.length,
      writes: myFiltered.filter((l) => ["insert", "update", "delete"].includes(l.action)).length,
    };
  }, [logs, user, isAdmin]);

  return (
    <div className="space-y-8 py-2">
      {/* Title Section (Roleplay Theme) */}
      <div className="text-center space-y-2 pt-2">
        <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
          GESTIONALE ROLEPLAY
        </h1>

        {/* Diamond Divider Symbol */}
        <div className="flex items-center justify-center gap-2 my-2">
          <div className="h-[1px] w-12 bg-amber-500/40" />
          <span className="text-amber-400 text-xs font-bold">◆</span>
          <div className="h-[1px] w-12 bg-amber-500/40" />
        </div>

        <p className="text-slate-400 text-xs md:text-sm max-w-xl mx-auto uppercase tracking-wider font-medium">
          REGISTRO AUDIT, REGISTRAZIONE OPERAZIONI E LOG DI SISTEMA
        </p>
      </div>

      {/* Control Header Box */}
      <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold uppercase text-white tracking-wider">
            REGISTRO DELLE ATTIVITÀ & AUDIT LOGS
          </h2>
          <p className="text-xs text-slate-400">
            {isAdmin
              ? "Storico completo in tempo reale di tutte le operazioni eseguite dal personale."
              : "Storico personale di tutte le operazioni e transazioni eseguite con il tuo account."}
          </p>
        </div>

        <Button
          onClick={() => qc.invalidateQueries({ queryKey: ["audit-logs"] })}
          variant="outline"
          className="border-slate-800 bg-[#0a0b10] hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl"
        >
          Aggiorna Ora
        </Button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-primary" />
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              Operazioni Totali
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-white">
              {isLoading ? "..." : stats.total}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Registrate complessivamente in archivio</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-emerald-500" />
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              Operazioni Oggi
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-white">
              {isLoading ? "..." : stats.today}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Azioni completate nelle ultime 24 ore</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-amber-500" />
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              Operazioni di Scrittura
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-white">
              {isLoading ? "..." : stats.writes}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Inserimenti, modifiche e rimozioni dati</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Box */}
      <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-12">
            {/* Search */}
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Cerca per descrizione o utente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:ring-primary/50"
              />
            </div>

            {/* Action filter */}
            <div className="md:col-span-2">
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Tutti i tipi</option>
                <option value="insert">Inserimento</option>
                <option value="update">Modifica</option>
                <option value="delete">Eliminazione</option>
                <option value="rpc">Funzione</option>
              </select>
            </div>

            {/* Table context filter */}
            <div className="md:col-span-2">
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary uppercase text-[11px] font-bold"
              >
                <option value="all">Tutte le tabelle</option>
                {uniqueTables.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* User filter (Admin only) */}
            {isAdmin && (
              <div className="md:col-span-3">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Tutti gli utenti</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.display_name || u.username} (@{u.username})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Logs Table / View */}
      <Card className="bg-slate-900 border-slate-800 text-white shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" /> Registro Eventi
          </CardTitle>
          <CardDescription className="text-slate-400">
            Lista cronologica delle azioni. I dati vengono aggiornati costantemente in background.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic space-y-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs">Caricamento registro eventi...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 space-y-2">
              <Info className="h-12 w-12 text-slate-600 animate-pulse" />
              <p className="text-sm font-semibold">Nessun evento registrato</p>
              <p className="text-xs text-slate-600 max-w-sm">
                Nessuna operazione trovata con i filtri correnti o non ci sono ancora attività
                salvate.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => {
                const date = new Date(log.created_at);
                const isExpanded = expandedLogId === log.id;

                return (
                  <div
                    key={log.id}
                    className={`transition-colors hover:bg-slate-950/25 ${
                      isExpanded ? "bg-slate-950/40" : ""
                    }`}
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Action Badge */}
                        <div className="mt-0.5 shrink-0">{renderActionBadge(log.action)}</div>

                        {/* Details */}
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold text-slate-200 leading-snug">
                            {log.details}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            {isAdmin && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <User className="h-3.5 w-3.5 text-primary" />
                                <span className="font-semibold text-slate-300">
                                  {log.user_display_name || log.username}
                                </span>{" "}
                                <span className="text-[10px] font-mono">(@{log.username})</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1 font-mono text-[10px]">
                              <Database className="h-3 w-3" /> {log.table_name?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right items */}
                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 text-right">
                        <div className="flex items-center gap-1 text-slate-400 font-mono text-[10.5px]">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          <span>{date.toLocaleDateString("it-IT")}</span>
                          <span className="text-slate-600 font-bold">·</span>
                          <span className="text-primary font-bold">
                            {date.toLocaleTimeString("it-IT", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>
                        <div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Panel */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden bg-slate-950 border-t border-slate-900"
                        >
                          <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Metadati Operazione
                              </span>
                              <span className="text-[9px] font-mono text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                ID: {log.id}
                              </span>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 text-xs">
                              {/* Left parameters */}
                              <div className="space-y-2 bg-slate-900/55 p-3 rounded-lg border border-slate-800/60">
                                <p className="text-slate-400">
                                  User ID:{" "}
                                  <span className="font-mono text-slate-200">{log.user_id}</span>
                                </p>
                                <p className="text-slate-400">
                                  Username:{" "}
                                  <span className="font-mono text-slate-200">@{log.username}</span>
                                </p>
                                <p className="text-slate-400">
                                  Nome visualizzato:{" "}
                                  <span className="font-semibold text-slate-200">
                                    {log.user_display_name}
                                  </span>
                                </p>
                              </div>

                              {/* Right parameters */}
                              <div className="space-y-2 bg-slate-900/55 p-3 rounded-lg border border-slate-800/60">
                                <p className="text-slate-400">
                                  Azione:{" "}
                                  <span className="font-mono text-slate-200 capitalize">
                                    {log.action}
                                  </span>
                                </p>
                                <p className="text-slate-400">
                                  Contesto:{" "}
                                  <span className="font-mono text-slate-200 uppercase">
                                    {log.table_name}
                                  </span>
                                </p>
                                <p className="text-slate-400">
                                  Orario Completo:{" "}
                                  <span className="font-mono text-slate-200">
                                    {date.toISOString()}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
