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
import { WeekSessionsDialog } from "@/components/WeekSessionsDialog";

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage not accessible:", e);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("localStorage not accessible:", e);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("localStorage not accessible:", e);
    }
  },
};

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

function BadgePage() {
  const {
    user,
    isAdmin,
    permissions = [],
    activeSuspension,
    activeLeave,
    loading: authLoading,
  } = useAuth();
  const qc = useQueryClient();
  const can = (p: string) => isAdmin || permissions.includes(p);
  const canTimbra = can("badge.timbra");
  const canVedere = can("badge.visualizza") || isAdmin;
  const canSettimane = can("badge.settimane");
  const canGestisci = can("badge.gestisci");
  const canRead = canTimbra || canVedere || canSettimane || canGestisci;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const [isOperating, setIsOperating] = useState(false);
  const [frozenSessionElapsed, setFrozenSessionElapsed] = useState<number | null>(null);
  const [localClockedOut, setLocalClockedOut] = useState(false);
  const [closingSessionId, setClosingSessionId] = useState<string | null>(null);

  const { data: weeks = [] } = useQuery<Week[]>({
    queryKey: ["badge-weeks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("badge_weeks")
        .select("*")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Week[];
    },
    enabled: canRead,
    refetchInterval: 10000,
  });
  const active = weeks.find((w) => w.active) ?? null;
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [viewingWeek, setViewingWeek] = useState<Week | null>(null);
  const weekId = selectedWeekId ?? active?.id ?? weeks[0]?.id ?? null;

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["badge-sessions", weekId],
    enabled: canRead && !!weekId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("badge_sessions")
        .select("*")
        .eq("week_id", weekId!);
      if (error) throw error;
      return (data ?? []) as Session[];
    },
    refetchInterval: 10000,
  });

  const {
    data: activeSessions = [],
    isFetching: isFetchingActive,
    isLoading: isLoadingActive,
  } = useQuery<Session[]>({
    queryKey: ["badge-active"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("badge_sessions")
        .select("*")
        .is("ended_at", null);
      if (error) throw error;
      return (data ?? []) as Session[];
    },
    enabled: canRead,
    refetchInterval: 10000,
  });

  const {
    data: profiles = [],
    isFetching: isFetchingProfiles,
    isLoading: isLoadingProfiles,
  } = useQuery<Prof[]>({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return (data ?? []) as Prof[];
    },
    enabled: canRead,
    refetchInterval: 10000,
  });

  const profById = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p])) as Record<string, Prof>,
    [profiles],
  );

  // Computed state for loading
  const isLoadingData =
    authLoading || (canRead && (isLoadingActive || isLoadingProfiles || weeks.length === 0));

  // Load initial state from localStorage if available safely
  const [localSession, setLocalSession] = useState<{ started_at: string; week_id: string } | null>(
    null,
  );

  // Load from localStorage as soon as user is loaded
  useEffect(() => {
    if (user) {
      try {
        const stored = safeLocalStorage.getItem(`badge_active_session_${user.id}`);
        if (stored) {
          setLocalSession(JSON.parse(stored));
        } else {
          setLocalSession(null);
        }
      } catch (e) {
        console.warn("Error parsing local session from localStorage", e);
      }
    } else {
      setLocalSession(null);
    }
  }, [user]);

  const myProfile = useMemo(() => profiles.find((p) => p.id === user?.id), [profiles, user]);

  // Sync localStorage and localSession state with server state safely
  useEffect(() => {
    if (!user) return;

    const serverSession = activeSessions.find((s) => s.user_id === user.id);

    if (serverSession) {
      const sessionData = {
        started_at: serverSession.started_at || serverSession.created_at,
        week_id: serverSession.week_id,
      };
      safeLocalStorage.setItem(`badge_active_session_${user.id}`, JSON.stringify(sessionData));
      setLocalSession(sessionData);
    } else {
      // ONLY clear local session if we are absolutely sure the server has no active session,
      // and we are NOT currently fetching or loading the data, to prevent temporary resets on focus/alt-tab
      if (isFetchingActive || isFetchingProfiles || isLoadingActive || isLoadingProfiles) {
        return; // Don't clear during fetch or load to avoid transient reset bugs on Alt-Tab
      }

      const profilesLoaded = profiles.length > 0;
      if (profilesLoaded && !myProfile?.badge_start_time) {
        safeLocalStorage.removeItem(`badge_active_session_${user.id}`);
        setLocalSession(null);
      }
    }
  }, [
    activeSessions,
    user,
    myProfile,
    profiles,
    isFetchingActive,
    isFetchingProfiles,
    isLoadingActive,
    isLoadingProfiles,
  ]);

  // Sync from profile as secondary fallback safely
  useEffect(() => {
    if (user && myProfile?.badge_start_time) {
      const sessionData = {
        started_at: myProfile.badge_start_time,
        week_id: active?.id || weekId || "current",
      };
      safeLocalStorage.setItem(`badge_active_session_${user.id}`, JSON.stringify(sessionData));
      setLocalSession(sessionData);
    }
  }, [myProfile, user, active, weekId]);

  // Resolved active session using local state or server state
  const resolvedMySession = useMemo(() => {
    if (!user) return null;
    if (localClockedOut) return null;

    // 1. Live active session from query
    const serverSession = activeSessions.find((s) => s.user_id === user.id);
    if (serverSession) {
      return {
        id: serverSession.id,
        started_at: serverSession.started_at || serverSession.created_at,
        week_id: serverSession.week_id,
      };
    }

    // 2. Profile badge_start_time (more direct source of truth than local fallback)
    if (myProfile?.badge_start_time) {
      return {
        id: "profile-temp-id",
        started_at: myProfile.badge_start_time,
        week_id: active?.id || weekId || "current",
      };
    }

    // 3. Local fallback from localStorage
    if (localSession) {
      return {
        id: "local-temp-id",
        started_at: localSession.started_at,
        week_id: localSession.week_id,
      };
    }

    return null;
  }, [user, activeSessions, localSession, myProfile, active, weekId, localClockedOut]);

  // Reset frozen elapsed time once the active session has been fully cleared on the server and queries are not fetching
  useEffect(() => {
    if (
      (frozenSessionElapsed !== null || localClockedOut || closingSessionId !== null) &&
      !isOperating
    ) {
      const serverSession = activeSessions.find((s) => s.user_id === user?.id);
      const isFetching =
        isFetchingActive || isFetchingProfiles || isLoadingActive || isLoadingProfiles;

      if (!serverSession && !myProfile?.badge_start_time && !isFetching) {
        setFrozenSessionElapsed(null);
        setLocalClockedOut(false);
        setClosingSessionId(null);
      }
    }
  }, [
    frozenSessionElapsed,
    localClockedOut,
    closingSessionId,
    isOperating,
    activeSessions,
    isFetchingActive,
    isFetchingProfiles,
    isLoadingActive,
    isLoadingProfiles,
    myProfile,
    user,
  ]);

  const resolvedActiveSessions = useMemo(() => {
    const list = [...activeSessions];

    // Merge in any profile that has a badge_start_time set but is not yet in activeSessions
    profiles.forEach((p) => {
      if (p.badge_start_time) {
        const alreadyIn = list.some((s) => s.user_id === p.id);
        if (!alreadyIn) {
          list.push({
            id: `profile-temp-${p.id}`,
            user_id: p.id,
            week_id: active?.id || weekId || "current",
            started_at: p.badge_start_time,
            created_at: p.badge_start_time,
            ended_at: null,
          } as any);
        }
      }
    });

    return list;
  }, [activeSessions, profiles, active, weekId]);

  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const startStr = s.started_at || s.created_at;
      const endStr = s.ended_at;

      const start = startStr ? new Date(startStr).getTime() : NaN;
      if (isNaN(start)) {
        continue;
      }

      let end: number;
      if (endStr) {
        end = new Date(endStr).getTime();
      } else {
        if (user && s.user_id === user.id && frozenSessionElapsed !== null) {
          end = start + frozenSessionElapsed * 1000;
        } else {
          end = now;
        }
      }

      if (isNaN(end)) {
        continue;
      }

      const diffSec = Math.max(0, (end - start) / 1000);
      map.set(s.user_id, (map.get(s.user_id) ?? 0) + diffSec);
    }
    return map;
  }, [sessions, now, user, frozenSessionElapsed]);

  const employeeIds = useMemo(() => {
    const s = new Set<string>();
    resolvedActiveSessions.forEach((x) => s.add(x.user_id));
    sessions.forEach((x) => s.add(x.user_id));
    if (canTimbra && user) s.add(user.id);
    return Array.from(s);
  }, [resolvedActiveSessions, sessions, canTimbra, user]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["badge-weeks"] });
    qc.invalidateQueries({ queryKey: ["badge-sessions"] });
    qc.invalidateQueries({ queryKey: ["badge-active"] });
  };

  const clockIn = async () => {
    if (isOperating) return;
    if (!active) return toast.error("Nessuna settimana attiva");
    if (!user) return;
    if (resolvedMySession) {
      return toast.error("Hai già una timbratura attiva per questa settimana.");
    }
    if (activeSuspension) {
      const typeStr = activeSuspension.type === "espulsione" ? "espulso" : "sospeso";
      return toast.error(`Non puoi timbrare: sei attualmente ${typeStr}.`);
    }
    if (activeLeave) {
      return toast.error("Non puoi timbrare: sei attualmente in congedo.");
    }

    setLocalClockedOut(false);
    setFrozenSessionElapsed(null);
    setClosingSessionId(null);
    setIsOperating(true);
    try {
      const nowIso = new Date().toISOString();

      // Set local state immediately for instant feedback & resilience
      const sessionData = { started_at: nowIso, week_id: active.id };
      safeLocalStorage.setItem(`badge_active_session_${user.id}`, JSON.stringify(sessionData));
      setLocalSession(sessionData);

      const { error } = await (supabase as any).from("badge_sessions").insert({
        user_id: user.id,
        week_id: active.id,
        started_at: nowIso,
      });

      if (error) {
        toast.error(error.message);
        // Clear local state if insertion failed
        safeLocalStorage.removeItem(`badge_active_session_${user.id}`);
        setLocalSession(null);
      } else {
        // Also update profile badge_start_time in parallel/sequence
        await supabase.from("profiles").update({ badge_start_time: nowIso }).eq("id", user.id);

        toast.success("Badge attivato");
        invalidate();
      }
    } catch (e: any) {
      toast.error(e?.message || "Errore sconosciuto");
    } finally {
      setIsOperating(false);
    }
  };

  const clockOut = async (id: string) => {
    if (isOperating) return;

    // Freeze elapsed timer immediately for current user if they are clocking out themselves
    if (
      resolvedMySession &&
      (id === resolvedMySession.id ||
        id === "profile-temp-id" ||
        id === "local-temp-id" ||
        (user && id === `profile-temp-${user.id}`))
    ) {
      const start = new Date(resolvedMySession.started_at).getTime();
      const elapsed = isNaN(start) ? 0 : Math.max(0, (Date.now() - start) / 1000);
      setFrozenSessionElapsed(elapsed);
    }

    setIsOperating(true);
    try {
      let targetSessionId = id;

      // Resolve temporary IDs to real active session
      if (id === "profile-temp-id" || id === "local-temp-id") {
        // First, query the server directly to find if there's any active session for this user
        const { data: serverSessions, error: queryErr } = await (supabase as any)
          .from("badge_sessions")
          .select("*")
          .eq("user_id", user?.id)
          .is("ended_at", null);

        if (!queryErr && serverSessions && serverSessions.length > 0) {
          targetSessionId = serverSessions[0].id;
        } else {
          const memorySess = activeSessions.find((s) => s.user_id === user?.id);
          if (memorySess) {
            targetSessionId = memorySess.id;
          } else {
            // If there's really no server active session, we should just reset local/profile active state
            if (user) {
              safeLocalStorage.removeItem(`badge_active_session_${user.id}`);
              setLocalSession(null);
              await supabase.from("profiles").update({ badge_start_time: null }).eq("id", user.id);
              toast.success("Stato badge locale ripristinato");
              setFrozenSessionElapsed(null);
              invalidate();
            }
            return;
          }
        }
      }

      const sess =
        resolvedActiveSessions.find((s) => s.id === targetSessionId) ||
        sessions.find((s) => s.id === targetSessionId);
      const targetUserId = sess ? sess.user_id : user?.id;

      if (targetUserId === user?.id) {
        // Clear local state immediately
        safeLocalStorage.removeItem(`badge_active_session_${user.id}`);
        setLocalSession(null);
        setClosingSessionId(targetSessionId);
      }

      const { error } = await (supabase as any)
        .from("badge_sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", targetSessionId);

      if (error) {
        toast.error(error.message);
        setFrozenSessionElapsed(null);
        setClosingSessionId(null);
      } else {
        if (targetUserId === user?.id) {
          setLocalClockedOut(true);
        }
        if (targetUserId) {
          await supabase.from("profiles").update({ badge_start_time: null }).eq("id", targetUserId);
        }
        toast.success("Badge chiuso");
        invalidate();
      }
    } catch (e: any) {
      toast.error(e?.message || "Errore sconosciuto");
      setFrozenSessionElapsed(null);
      setClosingSessionId(null);
    } finally {
      setIsOperating(false);
    }
  };

  const [newWeekLabel, setNewWeekLabel] = useState("");
  const openWeek = async () => {
    if (active) return toast.error("Chiudi prima la settimana attiva");
    const defaultLabel = (() => {
      const date = new Date();
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const pad = (num: number) => String(num).padStart(2, "0");
      const monD = pad(monday.getDate());
      const monM = pad(monday.getMonth() + 1);
      const monY = String(monday.getFullYear()).slice(-2);

      const sunD = pad(sunday.getDate());
      const sunM = pad(sunday.getMonth() + 1);
      const sunY = String(sunday.getFullYear()).slice(-2);

      return `Settimana dal ${monD}/${monM}/${monY} - ${sunD}/${sunM}/${sunY}`;
    })();
    const label = newWeekLabel.trim() || defaultLabel;
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

    // Find who was active in this week so we can clear their badge_start_time on profiles
    const activeInWeek = activeSessions.filter((s) => s.week_id === w.id);

    await (supabase as any)
      .from("badge_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("week_id", w.id)
      .is("ended_at", null);

    // For each active user, update their profile badge_start_time to null
    for (const s of activeInWeek) {
      await supabase.from("profiles").update({ badge_start_time: null }).eq("id", s.user_id);
    }

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
    if (localClockedOut) return 0;
    if (frozenSessionElapsed !== null) return frozenSessionElapsed;
    if (!resolvedMySession) return 0;
    const startStr = resolvedMySession.started_at;
    const start = startStr ? new Date(startStr).getTime() : NaN;
    if (isNaN(start)) return 0;
    return Math.max(0, (now - start) / 1000);
  }, [resolvedMySession, now, frozenSessionElapsed, localClockedOut]);

  const myTotalSeconds = useMemo(() => {
    if (!user) return 0;

    // Sum all closed sessions for the user
    let closedTotal = 0;
    let isClosingSessionClosedInList = false;

    for (const s of sessions) {
      if (s.user_id !== user.id) continue;
      if (s.ended_at) {
        const start =
          s.started_at || s.created_at ? new Date(s.started_at || s.created_at).getTime() : NaN;
        const end = new Date(s.ended_at).getTime();
        if (!isNaN(start) && !isNaN(end)) {
          closedTotal += Math.max(0, (end - start) / 1000);
        }
        if (closingSessionId && s.id === closingSessionId) {
          isClosingSessionClosedInList = true;
        }
      }
    }

    // Add current active session duration
    let activeDuration = 0;
    if (isClosingSessionClosedInList) {
      // The session we clocked out is already present in the closed sessions array
      activeDuration = 0;
    } else if (frozenSessionElapsed !== null) {
      activeDuration = frozenSessionElapsed;
    } else if (resolvedMySession) {
      const startStr = resolvedMySession.started_at;
      const start = startStr ? new Date(startStr).getTime() : NaN;
      if (!isNaN(start)) {
        activeDuration = Math.max(0, (now - start) / 1000);
      }
    }

    return closedTotal + activeDuration;
  }, [sessions, user, frozenSessionElapsed, resolvedMySession, now, closingSessionId]);

  if (!canRead) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full border-red-200/50 bg-red-50/5 dark:bg-red-950/5 shadow-lg">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">Accesso Negato</h2>
              <p className="text-sm text-muted-foreground">
                Non disponi dei permessi necessari per visualizzare questa sezione.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            {isLoadingData ? (
              <div className="grid md:grid-cols-2 gap-8 items-center animate-pulse">
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="space-y-2">
                    <div className="h-6 bg-muted rounded w-32" />
                    <div className="h-16 bg-muted rounded w-64" />
                  </div>
                  <div className="h-4 bg-muted rounded w-48" />
                  <div className="pt-4 border-t border-border/40 mt-4 h-12 bg-muted/40 rounded w-full" />
                </div>
                <div className="flex md:justify-end">
                  <div className="h-16 bg-muted rounded w-48" />
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-3">
                  <div className="text-sm uppercase tracking-widest text-muted-foreground">
                    Il tuo badge
                  </div>
                  {resolvedMySession ? (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-2xl font-semibold text-green-500">Attivo</span>
                      </div>
                      <div className="font-mono text-6xl md:text-7xl font-bold text-primary tracking-tight">
                        {fmtDur(mySessionElapsed)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Iniziato alle{" "}
                        {new Date(resolvedMySession.started_at).toLocaleTimeString("it-IT")}
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

                  <div className="pt-4 border-t border-border/40 mt-4 flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        Ore accumulate questa settimana
                      </div>
                      <div className="text-lg font-bold font-mono text-primary flex items-baseline gap-1.5">
                        {fmtDur(myTotalSeconds)}
                        <span className="text-xs text-muted-foreground font-sans font-normal">
                          ({weeks.find((w) => w.id === weekId)?.label ?? "Settimana corrente"})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex md:justify-end">
                  {resolvedMySession ? (
                    <Button
                      size="lg"
                      variant="destructive"
                      className="h-16 px-10 text-lg flex items-center gap-2"
                      onClick={() => clockOut(resolvedMySession.id)}
                      disabled={isOperating}
                    >
                      {isOperating ? (
                        <>
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          <span>Salvataggio...</span>
                        </>
                      ) : (
                        <>
                          <Square className="h-6 w-6" /> Timbra uscita
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="h-16 px-10 text-lg flex items-center gap-2"
                      onClick={clockIn}
                      disabled={!active || isOperating}
                    >
                      {isOperating ? (
                        <>
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          <span>Salvataggio...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-6 w-6" /> Timbra entrata
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
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
                {resolvedActiveSessions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resolvedActiveSessions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 border border-dashed rounded-md">
                Nessun badge attivo
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {resolvedActiveSessions.map((s) => {
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
                  const activeSess = resolvedActiveSessions.find((s) => s.user_id === uid);
                  const isActive = !!activeSess || !!p?.badge_start_time;

                  const activeElapsed = isActive
                    ? (() => {
                        const startStr = activeSess?.started_at || p?.badge_start_time;
                        if (!startStr) return 0;
                        const start = new Date(startStr).getTime();
                        return isNaN(start) ? 0 : Math.max(0, (now - start) / 1000);
                      })()
                    : 0;

                  return (
                    <TableRow key={uid}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="flex items-center">
                            {p?.display_name ?? p?.username ?? uid.slice(0, 8)}
                            {isActive && (
                              <Badge className="ml-2 bg-green-500/20 text-green-500 text-[10px]">
                                Attivo
                              </Badge>
                            )}
                          </div>
                          {isActive && activeElapsed > 0 && (
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              Servizio da:{" "}
                              <span className="text-green-500 font-semibold">
                                {fmtDur(activeElapsed)}
                              </span>
                            </div>
                          )}
                        </div>
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
                      <Button size="sm" variant="outline" onClick={() => setViewingWeek(w)}>
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
      {viewingWeek && (
        <WeekSessionsDialog
          open={!!viewingWeek}
          onClose={() => setViewingWeek(null)}
          week={viewingWeek}
          profiles={profiles}
        />
      )}
    </div>
  );
}
