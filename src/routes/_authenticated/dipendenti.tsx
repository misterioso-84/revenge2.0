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
import { ForceLeaveDialog } from "@/components/ForceLeaveDialog";
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
  Ban,
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
  badge_start_time?: string | null;
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
  const [forceLeaveTarget, setForceLeaveTarget] = useState<Prof | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const canVedere = isAdmin || permissions.includes("badge.visualizza");
  const canSanzioni = isAdmin || permissions.includes("dipendenti.sanzioni");
  const canRead = canVedere;

  // Keep a live ticker for active session elapsed time
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  // 1. Fetch weeks
  const { data: weeks = [] } = useQuery<Week[]>({
    queryKey: ["badge-weeks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badge_weeks")
        .select("*")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Week[];
    },
    enabled: canRead,
    refetchInterval: 10000,
  });

  const activeWeek = weeks.find((w) => w.active) ?? null;
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const weekId = selectedWeekId ?? activeWeek?.id ?? weeks[0]?.id ?? null;

  // 2. Fetch sessions for the selected week
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["badge-sessions", weekId],
    enabled: canRead && !!weekId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badge_sessions")
        .select("*")
        .eq("week_id", weekId!);
      if (error) throw error;
      return (data ?? []) as Session[];
    },
    refetchInterval: 10000,
  });

  // 3. Fetch active sessions (for active/inactive badge status)
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

  // 4. Fetch all employees profiles
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

  // 5. Fetch leave requests to determine active leave status
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

  // 5b. Fetch sanctions to determine active suspensions and expulsions
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
          map.set(s.user_id, { type: "espulsione", expires_at: null, reason: s.reason }); // Treat permanent suspension as expulsion too
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

  // Filter profiles based on search term and exclude permanently expelled ones
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // If permanently expelled, exclude entirely from list
      const activeSanc = activeSanctionsMap.get(p.id);
      if (activeSanc && activeSanc.type === "espulsione") {
        return false;
      }

      const name = (p.display_name ?? "").toLowerCase();
      const username = p.username.toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || username.includes(term);
    });
  }, [profiles, searchTerm, activeSanctionsMap]);

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
      </div>

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
                <TableHead className="text-slate-400 text-right">Tempo Totale (HH:MM:SS)</TableHead>
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
                  let startStr = activeUserMap.get(p.id)?.started_at || p.badge_start_time;
                  let isActive = activeUserMap.has(p.id) || !!p.badge_start_time;

                  if (p.id === user?.id && !isActive && localMySession) {
                    startStr = localMySession.started_at;
                    isActive = true;
                  }
                  const isLeave = leaveUserIds.has(p.id);
                  const activeSanc = activeSanctionsMap.get(p.id);
                  const totalSec = totals.get(p.id) ?? 0;
                  const count = sessionCounts.get(p.id) ?? 0;

                  const activeElapsed =
                    isActive && startStr
                      ? (() => {
                          const start = new Date(startStr).getTime();
                          return isNaN(start) ? 0 : Math.max(0, (now - start) / 1000);
                        })()
                      : 0;

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
                          <div className="flex flex-col gap-1">
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-semibold uppercase tracking-wider animate-pulse w-fit">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              In servizio
                            </div>
                            {activeElapsed > 0 && (
                              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                Attivo da:{" "}
                                <span className="text-green-400 font-bold">
                                  {fmtDur(activeElapsed)}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : activeSanc?.type === "sospensione" ? (
                          <div className="flex flex-col gap-1">
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold uppercase tracking-wider gap-1">
                              <Ban className="h-3.5 w-3.5 text-red-500" />
                              Sospeso Temp.
                            </div>
                            {activeSanc.expires_at && (
                              <div className="text-[10px] text-red-400/80 font-medium">
                                Fino al:{" "}
                                {new Date(activeSanc.expires_at).toLocaleString("it-IT", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                          </div>
                        ) : isLeave ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-semibold uppercase tracking-wider gap-1">
                            <Palmtree className="h-3.5 w-3.5 text-amber-500" />
                            In congedo
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

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-800/40 bg-amber-950/25 hover:bg-amber-900/40 text-amber-200 font-semibold"
                              onClick={() => setForceLeaveTarget(p)}
                            >
                              <Palmtree className="h-3.5 w-3.5 mr-1.5" /> Forza Congedo
                            </Button>
                          )}
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
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Render Sanctions management popup */}
      {sanctionsTarget && (
        <SanctionsDialog user={sanctionsTarget} onClose={() => setSanctionsTarget(null)} />
      )}

      {/* Render Force Leave popup */}
      {forceLeaveTarget && (
        <ForceLeaveDialog user={forceLeaveTarget} onClose={() => setForceLeaveTarget(null)} />
      )}
    </div>
  );
}
