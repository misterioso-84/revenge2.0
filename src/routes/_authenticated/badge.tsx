import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { Play, Square, Clock, Plus, Lock as LockIcon, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/badge")({
  component: BadgePage,
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
type Prof = { id: string; username: string; display_name: string | null };

function fmtDur(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function BadgePage() {
  const { user, isAdmin, permissions } = useAuth();
  const qc = useQueryClient();
  const can = (p: string) => isAdmin || permissions.includes(p);
  const canTimbra = can("badge.timbra");
  const canVedere = can("badge.visualizza") || isAdmin;
  const canSettimane = can("badge.settimane");
  const canGestisci = can("badge.gestisci");

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const { data: weeks = [] } = useQuery<Week[]>({
    queryKey: ["badge-weeks"],
    refetchInterval: 2000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("badge_weeks")
        .select("*")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Week[];
    },
  });
  const active = weeks.find((w) => w.active) ?? null;
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const weekId = selectedWeekId ?? active?.id ?? weeks[0]?.id ?? null;

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["badge-sessions", weekId],
    enabled: !!weekId,
    refetchInterval: 2000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("badge_sessions")
        .select("*")
        .eq("week_id", weekId!);
      if (error) throw error;
      return (data ?? []) as Session[];
    },
  });

  const { data: activeSessions = [] } = useQuery<Session[]>({
    queryKey: ["badge-active"],
    refetchInterval: 2000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("badge_sessions")
        .select("*")
        .is("ended_at", null);
      if (error) throw error;
      return (data ?? []) as Session[];
    },
  });

  const { data: profiles = [] } = useQuery<Prof[]>({
    queryKey: ["profiles-all"],
    refetchInterval: 2000,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,username,display_name");
      if (error) throw error;
      return (data ?? []) as Prof[];
    },
  });
  const profById = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p])) as Record<string, Prof>,
    [profiles],
  );

  const mySession = activeSessions.find((s) => s.user_id === user?.id) ?? null;

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

  const employeeIds = useMemo(() => {
    const s = new Set<string>();
    activeSessions.forEach((x) => s.add(x.user_id));
    sessions.forEach((x) => s.add(x.user_id));
    if (canTimbra && user) s.add(user.id);
    return Array.from(s);
  }, [activeSessions, sessions, canTimbra, user]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["badge-weeks"] });
    qc.invalidateQueries({ queryKey: ["badge-sessions"] });
    qc.invalidateQueries({ queryKey: ["badge-active"] });
  };

  const clockIn = async () => {
    if (!active) return toast.error("Nessuna settimana attiva");
    if (!user) return;
    const { error } = await (supabase as any)
      .from("badge_sessions")
      .insert({ user_id: user.id, week_id: active.id });
    if (error) toast.error(error.message);
    else {
      toast.success("Badge attivato");
      invalidate();
    }
  };
  const clockOut = async (id: string) => {
    const { error } = await (supabase as any)
      .from("badge_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Badge chiuso");
      invalidate();
    }
  };

  const [newWeekLabel, setNewWeekLabel] = useState("");
  const openWeek = async () => {
    if (active) return toast.error("Chiudi prima la settimana attiva");
    const label = newWeekLabel.trim() || `Settimana ${new Date().toLocaleDateString("it-IT")}`;
    const { error } = await (supabase as any)
      .from("badge_weeks")
      .insert({ label, created_by: user?.id ?? null });
    if (error) toast.error(error.message);
    else {
      toast.success("Settimana aperta");
      setNewWeekLabel("");
      invalidate();
    }
  };
  const closeWeek = async (w: Week) => {
    if (!confirm(`Chiudere "${w.label}"? Tutte le timbrature aperte verranno chiuse.`)) return;
    await (supabase as any)
      .from("badge_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("week_id", w.id)
      .is("ended_at", null);
    const { error } = await (supabase as any)
      .from("badge_weeks")
      .update({ active: false, ended_at: new Date().toISOString() })
      .eq("id", w.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Settimana chiusa");
      invalidate();
    }
  };

  const mySessionElapsed = useMemo(() => {
    if (!mySession) return 0;
    const startStr = mySession.started_at || mySession.created_at;
    const start = startStr ? new Date(startStr).getTime() : NaN;
    if (isNaN(start)) return 0;
    return Math.max(0, (now - start) / 1000);
  }, [mySession, now]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold">Badge & Timbrature</h1>
        <p className="text-muted-foreground mt-1">Gestione presenze settimanali</p>
      </div>

      {/* HERO: Timbratura personale */}
      {canTimbra && (
        <Card className="border-primary/30">
          <CardContent className="p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-3">
                <div className="text-sm uppercase tracking-widest text-muted-foreground">
                  Il tuo badge
                </div>
                {mySession ? (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-2xl font-semibold text-green-500">Attivo</span>
                    </div>
                    <div className="font-mono text-6xl md:text-7xl font-bold text-primary tracking-tight">
                      {fmtDur(mySessionElapsed)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Iniziato alle {new Date(mySession.started_at).toLocaleTimeString("it-IT")}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-muted-foreground" />
                      <span className="text-2xl font-semibold text-muted-foreground">
                        Non attivo
                      </span>
                    </div>
                    <div className="font-mono text-6xl md:text-7xl font-bold text-muted tracking-tight">
                      00:00:00
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {active ? "Pronto a timbrare" : "Nessuna settimana attiva"}
                    </div>
                  </>
                )}
              </div>
              <div className="flex md:justify-end">
                {mySession ? (
                  <Button
                    size="lg"
                    variant="destructive"
                    className="h-16 px-10 text-lg"
                    onClick={() => clockOut(mySession.id)}
                  >
                    <Square className="h-6 w-6" /> Timbra uscita
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="h-16 px-10 text-lg"
                    onClick={clockIn}
                    disabled={!active}
                  >
                    <Play className="h-6 w-6" /> Timbra entrata
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settimana attiva & gestione */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Settimana attiva
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {active ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-xl font-semibold">{active.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Aperta il{" "}
                  {new Date(active.started_at || active.created_at || new Date()).toLocaleString(
                    "it-IT",
                  )}
                </div>
              </div>
              {canSettimane && (
                <Button variant="outline" onClick={() => closeWeek(active)}>
                  <LockIcon className="h-4 w-4" /> Chiudi settimana (azzera)
                </Button>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground py-4 text-center border border-dashed rounded-md">
              Nessuna settimana attiva. Le timbrature sono disabilitate.
            </div>
          )}
          {canSettimane && !active && (
            <div className="flex gap-2 pt-3 border-t border-border flex-wrap items-center">
              <Input
                placeholder="Etichetta (es. Settimana 42)"
                value={newWeekLabel}
                onChange={(e) => setNewWeekLabel(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={openWeek}>
                <Plus className="h-4 w-4" /> Apri nuova settimana
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attivi ora */}
      {canVedere && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Attivi ora
              <Badge variant="secondary" className="ml-1">
                {activeSessions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeSessions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 border border-dashed rounded-md">
                Nessun badge attivo
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeSessions.map((s) => {
                  const p = profById[s.user_id];
                  const startStr = s.started_at || s.created_at;
                  const start = startStr ? new Date(startStr).getTime() : NaN;
                  return (
                    <div
                      key={s.id}
                      className="rounded-lg border border-border p-5 bg-card/60 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold truncate">
                          {p?.display_name ?? p?.username ?? s.user_id.slice(0, 8)}
                        </div>
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                      </div>
                      <div className="font-mono text-2xl text-primary">
                        {isNaN(start) ? "00:00:00" : fmtDur((now - start) / 1000)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Dalle {startStr ? new Date(startStr).toLocaleTimeString("it-IT") : "—"}
                      </div>
                      {(isAdmin || canGestisci) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => clockOut(s.id)}
                        >
                          Forza chiusura
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tempo settimana */}
      {canVedere && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle>
                Tempo dipendenti — {weeks.find((w) => w.id === weekId)?.label ?? "—"}
              </CardTitle>
              <select
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                value={weekId ?? ""}
                onChange={(e) => setSelectedWeekId(e.target.value)}
              >
                {weeks.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                    {w.active ? " (attiva)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dipendente</TableHead>
                  <TableHead>Sessioni</TableHead>
                  <TableHead>Tempo totale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeIds.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      Nessuna timbratura in questa settimana
                    </TableCell>
                  </TableRow>
                )}
                {employeeIds.map((uid) => {
                  const p = profById[uid];
                  const sess = sessions.filter((s) => s.user_id === uid);
                  const total = totals.get(uid) ?? 0;
                  const isActive = activeSessions.some((s) => s.user_id === uid);
                  return (
                    <TableRow key={uid}>
                      <TableCell className="font-medium">
                        {p?.display_name ?? p?.username ?? uid.slice(0, 8)}
                        {isActive && (
                          <Badge className="ml-2 bg-green-500/20 text-green-500 text-[10px]">
                            Attivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{sess.length}</TableCell>
                      <TableCell className="font-mono text-lg">{fmtDur(total)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Storico settimane */}
      {canVedere && weeks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Storico settimane</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Settimana</TableHead>
                  <TableHead>Aperta</TableHead>
                  <TableHead>Chiusa</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeks.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.label}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(w.started_at).toLocaleString("it-IT")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {w.ended_at ? new Date(w.ended_at).toLocaleString("it-IT") : "—"}
                    </TableCell>
                    <TableCell>
                      {w.active ? (
                        <Badge className="bg-primary">Attiva</Badge>
                      ) : (
                        <Badge variant="secondary">Chiusa</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedWeekId(w.id)}>
                        Vedi
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
