import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Clock,
  Calendar,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  Search,
  Check,
  X,
  Palmtree,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/dipendenti")({
  component: DipendentiPage,
});

type Week = {
  id: string;
  label: string;
  started_at: string;
  ended_at: string | null;
  active: boolean;
  created_by: string | null;
};

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
};

function fmtDur(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function DipendentiPage() {
  const { user, isAdmin, permissions = [] } = useAuth();
  const qc = useQueryClient();
  const [sanctionsTarget, setSanctionsTarget] = useState<Prof | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"presenze" | "congedi">("presenze");

  const canVedere = isAdmin || permissions.includes("badge.visualizza");
  const canSanzioni = isAdmin || permissions.includes("dipendenti.sanzioni");
  const canGestisciCongedi = isAdmin || permissions.includes("congedi.gestisci");
  const canRead = canVedere;

  // Fetch all leave requests for administration
  const { data: allLeaves = [], isLoading: isLoadingLeaves } = useQuery({
    queryKey: ["all-leaves"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: canGestisciCongedi,
    refetchInterval: 5000,
  });

  // Handle leave decision mutation
  const handleLeaveDecision = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) => {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id;

      let deciderName = "Amministratore";
      if (currentUserId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("id", currentUserId)
          .maybeSingle();
        if (prof) {
          deciderName = prof.display_name || prof.username || "Amministratore";
        }
      }

      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: decision,
          approved_by: currentUserId,
          approved_by_name: deciderName,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.decision === "approved"
          ? "Richiesta di congedo approvata con successo!"
          : "Richiesta di congedo rifiutata.",
      );
      qc.invalidateQueries({ queryKey: ["all-leaves"] });
      qc.invalidateQueries({ queryKey: ["my-leaves"] });
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Keep a live ticker for active session elapsed time
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  // 1. Fetch weeks
  const { data: weeks = [] } = useQuery<Week[]>({
    queryKey: ["badge-weeks"],
    refetchInterval: 2000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badge_weeks")
        .select("*")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Week[];
    },
    enabled: canRead,
  });

  const activeWeek = weeks.find((w) => w.active) ?? null;
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const weekId = selectedWeekId ?? activeWeek?.id ?? weeks[0]?.id ?? null;

  // 2. Fetch sessions for the selected week
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["badge-sessions", weekId],
    enabled: canRead && !!weekId,
    refetchInterval: 2000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badge_sessions")
        .select("*")
        .eq("week_id", weekId!);
      if (error) throw error;
      return (data ?? []) as Session[];
    },
  });

  // 3. Fetch active sessions (for active/inactive badge status)
  const { data: activeSessions = [] } = useQuery<Session[]>({
    queryKey: ["badge-active"],
    refetchInterval: 2000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badge_sessions")
        .select("*")
        .is("ended_at", null);
      if (error) throw error;
      return (data ?? []) as Session[];
    },
    enabled: canRead,
  });

  // 4. Fetch all employees profiles
  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery<Prof[]>({
    queryKey: ["profiles-all"],
    refetchInterval: 2000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .order("display_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Prof[];
    },
    enabled: canRead,
  });

  // Calculations for session totals
  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const startStr = s.started_at || s.created_at;
      const endStr = s.ended_at;

      const start = startStr ? new Date(startStr).getTime() : NaN;
      const end = endStr ? new Date(endStr).getTime() : now;

      if (isNaN(start) || isNaN(end)) {
        continue;
      }

      const diffSec = Math.max(0, (end - start) / 1000);
      map.set(s.user_id, (map.get(s.user_id) ?? 0) + diffSec);
    }
    return map;
  }, [sessions, now]);

  const sessionCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      map.set(s.user_id, (map.get(s.user_id) ?? 0) + 1);
    }
    return map;
  }, [sessions]);

  const activeUserMap = useMemo(() => {
    const map = new Map<string, Session>();
    activeSessions.forEach((s) => map.set(s.user_id, s));
    return map;
  }, [activeSessions]);

  // Filter profiles based on search term
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const name = (p.display_name ?? "").toLowerCase();
      const username = p.username.toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || username.includes(term);
    });
  }, [profiles, searchTerm]);

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <UserCheck className="h-9 w-9 text-primary" /> Dipendenti & Presenze
          </h1>
          <p className="text-slate-400 mt-1">
            Sezione gestionale della Ciurma con storico timbrature e sanzioni.
          </p>
        </div>

        {/* Settimana selector */}
        {activeTab === "presenze" && (
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Settimana:
            </span>
            <select
              value={weekId ?? ""}
              onChange={(e) => setSelectedWeekId(e.target.value || null)}
              className="rounded bg-slate-800 border border-slate-700 text-white text-sm px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label} {w.active ? "(Attiva)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs bar for Leave Requests & Presenze */}
      {canGestisciCongedi && (
        <div className="flex border-b border-slate-800 gap-6 text-sm mb-6">
          <button
            onClick={() => setActiveTab("presenze")}
            className={`pb-3 font-semibold uppercase tracking-wider text-xs transition-all ${
              activeTab === "presenze"
                ? "border-b-2 border-primary text-primary"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Presenze & Sanzioni
          </button>
          <button
            onClick={() => setActiveTab("congedi")}
            className={`pb-3 font-semibold uppercase tracking-wider text-xs transition-all flex items-center gap-1.5 ${
              activeTab === "congedi"
                ? "border-b-2 border-primary text-primary"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Palmtree className="h-3.5 w-3.5 text-amber-500" /> Richieste di Congedo
            {allLeaves.filter((l: any) => l.status === "pending").length > 0 && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-[10px] px-1.5 py-0.2 ml-1">
                {allLeaves.filter((l: any) => l.status === "pending").length}
              </Badge>
            )}
          </button>
        </div>
      )}

      {activeTab === "congedi" && canGestisciCongedi ? (
        <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Palmtree className="h-5 w-5 text-amber-500" /> Approva o Rifiuta Richieste di Congedo
            </CardTitle>
            <CardDescription className="text-slate-400">
              Gestione centralizzata dei congedi temporanei degli operatori del Casinò.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 animate-fade-in">
            <Table>
              <TableHeader className="bg-slate-950/40 border-slate-800">
                <TableRow>
                  <TableHead className="text-slate-400">Dipendente</TableHead>
                  <TableHead className="text-slate-400">Periodo Congedo</TableHead>
                  <TableHead className="text-slate-400">Motivazione</TableHead>
                  <TableHead className="text-slate-400">Stato</TableHead>
                  <TableHead className="text-slate-400 text-right w-52">Gestione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingLeaves ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400 italic">
                      Caricamento richieste di congedo...
                    </TableCell>
                  </TableRow>
                ) : allLeaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                      <Palmtree className="h-10 w-10 text-slate-700 mx-auto mb-2" />
                      Nessun congedo richiesto finora.
                    </TableCell>
                  </TableRow>
                ) : (
                  allLeaves.map((l: any) => {
                    const start = new Date(l.start_date);
                    const end = new Date(l.end_date);
                    const daysCount =
                      Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

                    return (
                      <TableRow key={l.id} className="border-slate-800/60 hover:bg-slate-950/20">
                        <TableCell className="font-semibold text-slate-100 py-3.5">
                          <div>
                            <div>{l.display_name || l.username}</div>
                            <div className="text-[10px] font-mono text-slate-500 font-normal">
                              @{l.username}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs">
                          <div className="font-medium text-slate-300">
                            Dal {start.toLocaleDateString("it-IT")} al{" "}
                            {end.toLocaleDateString("it-IT")}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Durata: {daysCount} {daysCount === 1 ? "giorno" : "giorni"}
                          </div>
                        </TableCell>

                        <TableCell className="max-w-xs text-xs text-slate-300 italic py-3.5">
                          <span
                            className="block truncate hover:text-clip hover:whitespace-normal"
                            title={l.reason}
                          >
                            "{l.reason}"
                          </span>
                        </TableCell>

                        <TableCell>
                          {l.status === "pending" && (
                            <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 uppercase font-bold text-[9px] px-1.5 py-0.5">
                              In attesa
                            </Badge>
                          )}
                          {l.status === "approved" && (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase font-bold text-[9px] px-1.5 py-0.5">
                              Approvato
                            </Badge>
                          )}
                          {l.status === "rejected" && (
                            <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 uppercase font-bold text-[9px] px-1.5 py-0.5">
                              Rifiutato
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right py-3.5">
                          {l.status === "pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleLeaveDecision.mutate({ id: l.id, decision: "approved" })
                                }
                                disabled={handleLeaveDecision.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1 h-8"
                              >
                                <Check className="h-3.5 w-3.5 mr-1" /> Approva
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  handleLeaveDecision.mutate({ id: l.id, decision: "rejected" })
                                }
                                disabled={handleLeaveDecision.isPending}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-3 py-1 h-8"
                              >
                                <X className="h-3.5 w-3.5 mr-1" /> Rifiuta
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">
                              Gestito da: {l.approved_by_name || "Amministratore"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 rounded-xl px-3.5 py-2.5 max-w-md">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <Input
              placeholder="Cerca dipendente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 bg-transparent text-white p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-500"
            />
          </div>

          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Tabella Presenze & Sanzioni
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-950/40 border-slate-800">
                  <TableRow>
                    <TableHead className="text-slate-400">Nome / Username</TableHead>
                    <TableHead className="text-slate-400">Badge Stato</TableHead>
                    <TableHead className="text-slate-400 text-center">N. Sessioni</TableHead>
                    <TableHead className="text-slate-400 text-right">
                      Tempo Totale (HH:MM:SS)
                    </TableHead>
                    <TableHead className="text-slate-400 text-right w-40">Gestione</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingProfiles ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-400 italic">
                        Caricamento dipendenti...
                      </TableCell>
                    </TableRow>
                  ) : filteredProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                        Nessun dipendente trovato.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfiles.map((p) => {
                      const isActive = activeUserMap.has(p.id);
                      const totalSec = totals.get(p.id) ?? 0;
                      const count = sessionCounts.get(p.id) ?? 0;

                      return (
                        <TableRow
                          key={p.id}
                          className="border-b border-slate-800/60 hover:bg-slate-800/20"
                        >
                          {/* Name/Username */}
                          <TableCell className="font-semibold text-slate-100">
                            <div>
                              <div>{p.display_name ?? p.username}</div>
                              {p.display_name && (
                                <div className="text-[10px] font-mono text-slate-500 font-normal">
                                  @{p.username}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Badge status */}
                          <TableCell>
                            {isActive ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-semibold uppercase tracking-wider animate-pulse">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                In servizio
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700/50 text-xs font-semibold uppercase tracking-wider">
                                Fuori servizio
                              </div>
                            )}
                          </TableCell>

                          {/* Session count */}
                          <TableCell className="text-center font-medium font-mono text-slate-300">
                            {count}
                          </TableCell>

                          {/* Duration */}
                          <TableCell className="text-right font-bold font-mono text-primary">
                            {fmtDur(totalSec)}
                          </TableCell>

                          {/* Sanctions Button */}
                          <TableCell className="text-right">
                            {canSanzioni && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="bg-red-950/40 hover:bg-red-900/60 text-red-200 border border-red-800/40 font-semibold"
                                onClick={() => setSanctionsTarget(p)}
                              >
                                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Sanzioni
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Render Sanctions management popup */}
      {sanctionsTarget && (
        <SanctionsDialog user={sanctionsTarget} onClose={() => setSanctionsTarget(null)} />
      )}
    </div>
  );
}
