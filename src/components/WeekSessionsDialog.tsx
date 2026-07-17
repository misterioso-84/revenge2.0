import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Clock, User, X } from "lucide-react";

type Session = {
  id: string;
  user_id: string;
  week_id: string;
  started_at: string;
  ended_at: string | null;
  created_at?: string;
};

type Prof = {
  id: string;
  username: string;
  display_name: string | null;
};

type WeekSessionsDialogProps = {
  open: boolean;
  onClose: () => void;
  week: {
    id: string;
    label: string;
    started_at: string;
    ended_at: string | null;
  };
  profiles: Prof[];
};

function fmtDur(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function WeekSessionsDialog({ open, onClose, week, profiles }: WeekSessionsDialogProps) {
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [hourFilter, setHourFilter] = useState<string>("");
  const [textFilter, setTextFilter] = useState<string>("");

  const profById = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p])) as Record<string, Prof>,
    [profiles],
  );

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ["badge-sessions-dialog", week.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badge_sessions")
        .select("*")
        .eq("week_id", week.id);
      if (error) throw error;
      return (data ?? []) as Session[];
    },
    enabled: open,
  });

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // 1. Employee filter
      if (selectedUser !== "all" && s.user_id !== selectedUser) {
        return false;
      }

      // Profile details for text and profile filters
      const p = profById[s.user_id];
      const displayName = p?.display_name || "";
      const username = p?.username || "";

      // 2. Date filter (compares local date formatted as YYYY-MM-DD)
      if (dateFilter) {
        const startStr = s.started_at || s.created_at;
        if (!startStr) return false;
        const localDateStr = new Date(startStr).toLocaleDateString("en-CA"); // "YYYY-MM-DD" in local timezone
        if (localDateStr !== dateFilter) {
          return false;
        }
      }

      // 3. Hour filter
      if (hourFilter) {
        const startStr = s.started_at || s.created_at;
        const endStr = s.ended_at;

        const padZero = (n: number) => String(n).padStart(2, "0");

        const matchesHour = (isoStr: string | null | undefined) => {
          if (!isoStr) return false;
          const date = new Date(isoStr);
          const hh = padZero(date.getHours());
          const mm = padZero(date.getMinutes());
          const timeStr = `${hh}:${mm}`; // e.g. "14:30"
          return hh.includes(hourFilter) || mm.includes(hourFilter) || timeStr.includes(hourFilter);
        };

        const startMatch = matchesHour(startStr);
        const endMatch = endStr ? matchesHour(endStr) : false;

        if (!startMatch && !endMatch) {
          return false;
        }
      }

      // 4. Text filter
      if (textFilter) {
        const query = textFilter.toLowerCase();
        const startStr = s.started_at || s.created_at || "";
        const endStr = s.ended_at || "";
        const formattedStart = startStr
          ? new Date(startStr).toLocaleString("it-IT").toLowerCase()
          : "";
        const formattedEnd = endStr ? new Date(endStr).toLocaleString("it-IT").toLowerCase() : "";

        const match =
          displayName.toLowerCase().includes(query) ||
          username.toLowerCase().includes(query) ||
          formattedStart.includes(query) ||
          formattedEnd.includes(query);

        if (!match) {
          return false;
        }
      }

      return true;
    });
  }, [sessions, selectedUser, dateFilter, hourFilter, textFilter, profById]);

  // List of employees who actually have sessions in this week
  const employeesInWeek = useMemo(() => {
    const ids = Array.from(new Set(sessions.map((s) => s.user_id)));
    return ids
      .map((id) => profById[id])
      .filter(Boolean)
      .sort((a, b) => (a.display_name || a.username).localeCompare(b.display_name || b.username));
  }, [sessions, profById]);

  const clearFilters = () => {
    setSelectedUser("all");
    setDateFilter("");
    setHourFilter("");
    setTextFilter("");
  };

  const hasActiveFilters =
    selectedUser !== "all" || dateFilter !== "" || hourFilter !== "" || textFilter !== "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Timbrature della settimana: {week.label}
          </DialogTitle>
        </DialogHeader>

        {/* Filters Section */}
        <div className="bg-muted/40 border border-border/60 rounded-lg p-4 space-y-3 mt-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" /> Filtra timbrature
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Filter by Employee */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Dipendente
              </label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Tutti i dipendenti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i dipendenti</SelectItem>
                  {employeesInWeek.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.display_name || emp.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter by Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Data
              </label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 text-xs bg-background"
              />
            </div>

            {/* Filter by Hour */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Ora
              </label>
              <Input
                type="text"
                placeholder="Ora (es. 14, 08:30)"
                value={hourFilter}
                onChange={(e) => setHourFilter(e.target.value)}
                className="h-9 text-xs bg-background"
              />
            </div>

            {/* Filter by Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Search className="h-3 w-3" /> Cerca testo
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Nome, data, ecc..."
                  value={textFilter}
                  onChange={(e) => setTextFilter(e.target.value)}
                  className="h-9 text-xs pr-7 bg-background"
                />
                {textFilter && (
                  <button
                    onClick={() => setTextFilter("")}
                    className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset filtri
              </Button>
            </div>
          )}
        </div>

        {/* Sessions Table */}
        <div className="flex-1 min-h-[300px] border border-border/80 rounded-md mt-4 overflow-hidden bg-card/40">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
              Caricamento timbrature...
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-2">
              <span className="text-3xl">📭</span>
              <div className="text-sm font-semibold">Nessuna timbratura trovata</div>
              <div className="text-xs text-muted-foreground max-w-xs">
                {hasActiveFilters
                  ? "Prova a modificare i criteri di ricerca o a resettare i filtri."
                  : "Nessuna sessione registrata in questa settimana."}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[50vh]">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Dipendente</TableHead>
                    <TableHead>Inizio</TableHead>
                    <TableHead>Fine</TableHead>
                    <TableHead className="text-right">Durata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((s) => {
                    const p = profById[s.user_id];
                    const startStr = s.started_at || s.created_at;
                    const endStr = s.ended_at;

                    const start = startStr ? new Date(startStr) : null;
                    const end = endStr ? new Date(endStr) : null;

                    const durationSec =
                      start && end
                        ? (end.getTime() - start.getTime()) / 1000
                        : start
                          ? (Date.now() - start.getTime()) / 1000
                          : 0;

                    return (
                      <TableRow key={s.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold py-3">
                          {p?.display_name || p?.username || s.user_id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {start ? start.toLocaleString("it-IT") : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {end ? (
                            end.toLocaleString("it-IT")
                          ) : (
                            <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                              Attivo ora
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-right font-medium">
                          {fmtDur(durationSec)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-4 text-[11px] text-muted-foreground border-t border-border pt-4">
          <div>
            Mostrate <strong>{filteredSessions.length}</strong> di{" "}
            <strong>{sessions.length}</strong> timbrature
          </div>
          <div>Casinò Revenge Management</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
