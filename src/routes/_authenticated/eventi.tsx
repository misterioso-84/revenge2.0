import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  Sparkles,
  Ticket,
  Dices,
  Plus,
  Trash2,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Medal,
  Flag,
  DollarSign,
  Printer,
  ShieldAlert,
  Search,
  Check,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/eventi")({
  component: EventiPage,
});

const NONE = "__none__";

type Citizen = { id: string; full_name: string; nickname?: string | null };

type TicketItem = {
  id: string;
  citizen_id: string;
  citizen_name: string;
  category: string;
  price: number;
  event_phase: string;
  issued_by: string;
  created_at: string;
};

type QualificationAttempt = {
  id: string;
  citizen_id: string;
  citizen_name: string;
  minutes: number;
  seconds: number;
  milliseconds: number;
  time_formatted: string;
  time_ms: number;
  laps: number;
  attempt_number: number;
  notes?: string | null;
  created_at: string;
};

type Finalist = {
  id: string;
  citizen_id: string;
  citizen_name: string;
  qualifying_rank: number;
  qualifying_time: string;
  final_position?: number | null;
  final_time?: string | null;
  ticket_paid: boolean;
};

type Bet = {
  id: string;
  citizen_id: string;
  citizen_name: string;
  bet_type: "vincente" | "piazzato" | "accoppiata";
  fantino_1_id: string;
  fantino_1_name: string;
  fantino_2_id?: string | null;
  fantino_2_name?: string | null;
  amount: number;
  odd: number;
  potential_payout: number;
  status: "in_attesa" | "vinta" | "persa" | "pagata";
  issued_by: string;
  created_at: string;
};

const TICKET_TYPES = [
  {
    category: "Ticket Fantino - Qualificazioni",
    phase: "Qualificazioni",
    price: 2500,
    notes: "Valido per 1 tentativo di qualificazione (10 giri)",
  },
  {
    category: "Ticket Fantino - Finale",
    phase: "Finale",
    price: 5000,
    notes: "Riservato ai 6 finalisti qualificati (15 giri)",
  },
  {
    category: "Spettatore Normal - Qualificazioni",
    phase: "Qualificazioni",
    price: 500,
    notes: "Valido per 1 giorno di qualificazioni",
  },
  {
    category: "Spettatore VIP - Qualificazioni",
    phase: "Qualificazioni",
    price: 750,
    notes: "Valido per 1 giorno (Accesso Area VIP & Drink)",
  },
  {
    category: "Spettatore Normal - Finale",
    phase: "Finale",
    price: 1200,
    notes: "Valido per la giornata di Finale (05/08)",
  },
  {
    category: "Spettatore VIP - Finale",
    phase: "Finale",
    price: 1500,
    notes: "Valido per la Finale (Accesso Area VIP & Drink)",
  },
];

function EventiPage() {
  const qc = useQueryClient();
  const { user, profile, isAdmin, permissions = [] } = useAuth();
  const canRead = isAdmin || permissions.includes("eventi.gestisci");
  const canWrite = isAdmin || permissions.includes("eventi.gestisci");

  const staffName = profile?.display_name || user?.email?.split("@")[0] || "Operatore Staff";

  // Current event phase state stored in memory / settings
  const [eventPhase, setEventPhase] = useState<"qualificazioni" | "finale" | "concluso">(
    "qualificazioni",
  );

  // Dialog States
  const [qualDlgOpen, setQualDlgOpen] = useState(false);
  const [allAttemptsDlgOpen, setAllAttemptsDlgOpen] = useState(false);
  const [ticketDlgOpen, setTicketDlgOpen] = useState(false);
  const [betDlgOpen, setBetDlgOpen] = useState(false);
  const [selectedTicketForPrint, setSelectedTicketForPrint] = useState<TicketItem | null>(null);
  const [selectedBetForPrint, setSelectedBetForPrint] = useState<Bet | null>(null);

  // Queries
  const { data: citizens = [] } = useQuery({
    queryKey: ["citizens-all"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("citizens")
          .select("id, full_name, nickname")
          .order("full_name");
        if (error) {
          console.error("Error fetching citizens:", error);
          return [];
        }
        return (data ?? []) as Citizen[];
      } catch (e) {
        console.error("Exception fetching citizens:", e);
        return [];
      }
    },
    enabled: canRead,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["eventi-tickets"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("eventi_tickets")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) {
          console.error("Error fetching tickets:", error);
          return [];
        }
        return (data ?? []) as TicketItem[];
      } catch (e) {
        console.error("Exception fetching tickets:", e);
        return [];
      }
    },
    enabled: canRead,
    refetchInterval: 5000,
  });

  const { data: qualifications = [] } = useQuery({
    queryKey: ["eventi-qualificazioni"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("eventi_qualificazioni")
          .select("*")
          .order("time_ms", { ascending: true });
        if (error) {
          console.error("Error fetching qualifications:", error);
          return [];
        }
        return (data ?? []) as QualificationAttempt[];
      } catch (e) {
        console.error("Exception fetching qualifications:", e);
        return [];
      }
    },
    enabled: canRead,
    refetchInterval: 5000,
  });

  const { data: finalists = [] } = useQuery({
    queryKey: ["eventi-finalisti"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("eventi_finalisti")
          .select("*")
          .order("qualifying_rank", { ascending: true });
        if (error) {
          console.error("Error fetching finalists:", error);
          return [];
        }
        return (data ?? []) as Finalist[];
      } catch (e) {
        console.error("Exception fetching finalists:", e);
        return [];
      }
    },
    enabled: canRead,
    refetchInterval: 5000,
  });

  const { data: bets = [] } = useQuery({
    queryKey: ["eventi-scommesse"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("eventi_scommesse")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) {
          console.error("Error fetching bets:", error);
          return [];
        }
        return (data ?? []) as Bet[];
      } catch (e) {
        console.error("Exception fetching bets:", e);
        return [];
      }
    },
    enabled: canRead,
    refetchInterval: 5000,
  });

  // Calculate Best Time per Citizen for Qualifiers Leaderboard
  const leaderboard = useMemo(() => {
    if (!Array.isArray(qualifications)) return [];
    const map = new Map<
      string,
      {
        citizen_id: string;
        citizen_name: string;
        best_attempt: QualificationAttempt;
        total_attempts: number;
      }
    >();

    for (const q of qualifications) {
      if (!q || !q.citizen_id) continue;
      const timeMs = typeof q.time_ms === "number" ? q.time_ms : Number(q.time_ms) || 0;
      const safeQ = { ...q, time_ms: timeMs };

      const existing = map.get(q.citizen_id);
      if (!existing) {
        map.set(q.citizen_id, {
          citizen_id: q.citizen_id,
          citizen_name: q.citizen_name || "Fantino",
          best_attempt: safeQ,
          total_attempts: 1,
        });
      } else {
        existing.total_attempts += 1;
        if (timeMs < existing.best_attempt.time_ms) {
          existing.best_attempt = safeQ;
        }
      }
    }

    const sorted = Array.from(map.values()).sort(
      (a, b) => a.best_attempt.time_ms - b.best_attempt.time_ms,
    );
    return sorted;
  }, [qualifications]);

  const top6Qualifiers = useMemo(() => leaderboard.slice(0, 6), [leaderboard]);

  // Statistics
  const totalTicketRevenue = useMemo(
    () => (tickets || []).reduce((acc, t) => acc + (Number(t?.price) || 0), 0),
    [tickets],
  );
  const totalBetsVolume = useMemo(
    () => (bets || []).reduce((acc, b) => acc + (Number(b?.amount) || 0), 0),
    [bets],
  );
  const totalSpectatorsCount = useMemo(
    () =>
      (tickets || []).filter(
        (t) => typeof t?.category === "string" && t.category.includes("Spettatore"),
      ).length,
    [tickets],
  );

  // Promote Top 6 to Finalists
  const promoteFinalists = useMutation({
    mutationFn: async () => {
      if (top6Qualifiers.length < 1) {
        throw new Error("Nessun tempo registrato nelle qualificazioni per promuovere i finalisti.");
      }

      // Clear existing finalists
      await supabase.from("eventi_finalisti").delete().neq("id", "0");

      // Insert top 6
      const newFinalists = top6Qualifiers.map((item, idx) => ({
        id: `finalist-${idx + 1}`,
        citizen_id: item.citizen_id,
        citizen_name: item.citizen_name,
        qualifying_rank: idx + 1,
        qualifying_time: item.best_attempt.time_formatted,
        ticket_paid: false,
      }));

      const { error } = await supabase.from("eventi_finalisti").insert(newFinalists);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eventi-finalisti"] });
      setEventPhase("finale");
      toast.success(
        "Top 6 finalisti congelati ed inseriti nella fase finale! Banco Scommesse attivato.",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateFinalistPosition = useMutation({
    mutationFn: async ({ id, final_position }: { id: string; final_position: number | null }) => {
      const { error } = await supabase
        .from("eventi_finalisti")
        .update({ final_position })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eventi-finalisti"] });
      toast.success("Posizione finale aggiornata!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolveAllBets = useMutation({
    mutationFn: async () => {
      const pos1 = finalists.find((f) => f.final_position === 1);
      const pos2 = finalists.find((f) => f.final_position === 2);
      const pos3 = finalists.find((f) => f.final_position === 3);

      if (!pos1) {
        throw new Error("Devi prima assegnare il 1° posto (Campione) tra i finalisti.");
      }

      const podiumIds = [pos1.citizen_id, pos2?.citizen_id, pos3?.citizen_id].filter(Boolean);

      let updatedCount = 0;
      for (const bet of bets) {
        if (bet.status !== "in_attesa") continue;

        let newStatus: "vinta" | "persa" = "persa";

        if (bet.bet_type === "vincente") {
          if (bet.fantino_1_id === pos1.citizen_id) {
            newStatus = "vinta";
          }
        } else if (bet.bet_type === "piazzato") {
          if (podiumIds.includes(bet.fantino_1_id)) {
            newStatus = "vinta";
          }
        } else if (bet.bet_type === "accoppiata") {
          if (
            pos2 &&
            bet.fantino_1_id === pos1.citizen_id &&
            bet.fantino_2_id === pos2.citizen_id
          ) {
            newStatus = "vinta";
          }
        }

        const { error } = await supabase
          .from("eventi_scommesse")
          .update({ status: newStatus })
          .eq("id", bet.id);
        if (!error) updatedCount++;
      }

      return updatedCount;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["eventi-scommesse"] });
      toast.success(`Scommesse elaborate! ${count} scommesse in attesa sono state risolte.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateBetStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "in_attesa" | "vinta" | "persa" | "pagata";
    }) => {
      const { error } = await supabase.from("eventi_scommesse").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eventi-scommesse"] });
      toast.success("Stato scommessa aggiornato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventi_scommesse").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eventi-scommesse"] });
      toast.success("Scommessa eliminata");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTicket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventi_tickets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eventi-tickets"] });
      toast.success("Biglietto eliminato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteQualificationAttempt = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventi_qualificazioni").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eventi-qualificazioni"] });
      toast.success("Tempo eliminato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!canRead) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full border-red-500/30 bg-red-950/10 text-white shadow-xl">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Accesso Riservato Staff</h2>
              <p className="text-sm text-slate-400">
                Non disponi dei permessi necessari per accedere alla gestione del Gran Galà.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Banner & Top Stats */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-900/40 via-slate-900 to-slate-950 border border-amber-500/30 p-6 shadow-2xl text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold px-3 py-1 text-xs uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Gran Galà Casinò Revenge
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-semibold">
                Esclusivo Staff Casinò
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-amber-100 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-amber-400" /> Corsa dei Cavalli 2026
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Gestione completa per lo staff: Qualificazioni 10 giri (01/08 - 04/08), Gran Finale 15
              giri (05/08), Biglietteria e Banco Scommesse Casinò.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-900/80 backdrop-blur border border-amber-500/20 p-3.5 rounded-xl">
            <div className="text-xs">
              <div className="text-slate-400 font-medium uppercase tracking-wider">
                Fase Corrente Evento
              </div>
              <div className="text-base font-bold text-amber-300 capitalize flex items-center gap-1.5 mt-0.5">
                <Flag className="h-4 w-4 text-amber-400" /> {eventPhase}
              </div>
            </div>
            {canWrite && (
              <Select value={eventPhase} onValueChange={(val: any) => setEventPhase(val)}>
                <SelectTrigger className="w-36 bg-slate-800 border-slate-700 text-xs text-white h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qualificazioni">Qualificazioni</SelectItem>
                  <SelectItem value="finale">Gran Finale</SelectItem>
                  <SelectItem value="concluso">Concluso</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Quick KPI Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5 text-amber-400" /> Incassi Biglietteria
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              € {totalTicketRevenue.toLocaleString("it-IT")}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Dices className="h-3.5 w-3.5 text-purple-400" /> Volume Scommesse
            </div>
            <div className="text-xl font-bold font-mono text-purple-300 mt-1">
              € {totalBetsVolume.toLocaleString("it-IT")}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-amber-400" /> Fantini Qualificati
            </div>
            <div className="text-xl font-bold font-mono text-amber-300 mt-1">
              {leaderboard.length} Iscritti
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5 text-sky-400" /> Biglietti Spettatori
            </div>
            <div className="text-xl font-bold font-mono text-sky-300 mt-1">
              {totalSpectatorsCount} Spettatori
            </div>
          </div>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <Tabs defaultValue="qualificazioni" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl grid grid-cols-2 lg:grid-cols-4 w-full">
          <TabsTrigger
            value="qualificazioni"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold gap-2"
          >
            <Clock className="h-4 w-4" /> Qualificazioni (10 Giri)
          </TabsTrigger>
          <TabsTrigger
            value="finale"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold gap-2"
          >
            <Trophy className="h-4 w-4" /> Gran Finale & Podio
          </TabsTrigger>
          <TabsTrigger
            value="biglietteria"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold gap-2"
          >
            <Ticket className="h-4 w-4" /> Biglietteria
          </TabsTrigger>
          <TabsTrigger
            value="scommesse"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold gap-2"
          >
            <Dices className="h-4 w-4" /> Banco Scommesse
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: QUALIFICAZIONI */}
        <TabsContent value="qualificazioni" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-400" /> Fase 1: Classifica Tempi
                  Qualificazione
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs mt-1">
                  Qualificazioni a batterie (10 giri). I primi 6 tempi assoluti accedono alla Gran
                  Finale del 05/08.
                </CardDescription>
              </div>

              {canWrite && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => setQualDlgOpen(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Registra Tempo Prova
                  </Button>
                  <Button
                    onClick={() => setAllAttemptsDlgOpen(true)}
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs gap-1.5"
                  >
                    <Clock className="h-3.5 w-3.5" /> Registro Tempi ({qualifications.length})
                  </Button>
                  {top6Qualifiers.length > 0 && (
                    <Button
                      onClick={() => promoteFinalists.mutate()}
                      disabled={promoteFinalists.isPending}
                      variant="outline"
                      className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs gap-1.5 font-semibold"
                    >
                      <Sparkles className="h-4 w-4 text-amber-400" /> Congela TOP 6 Finalisti
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-950/60 border-slate-800">
                  <TableRow>
                    <TableHead className="text-slate-400 w-16 text-center">Pos</TableHead>
                    <TableHead className="text-slate-400">Fantino / Cittadino</TableHead>
                    <TableHead className="text-slate-400 text-center">
                      Miglior Tempo (10 Giri)
                    </TableHead>
                    <TableHead className="text-slate-400 text-center">Tentativi</TableHead>
                    <TableHead className="text-slate-400">Note / Batteria</TableHead>
                    <TableHead className="text-slate-400 text-right">
                      Stato Accesso Finale
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-400 italic">
                        Nessun tempo registrato nelle qualificazioni. Clicca su "Registra Tempo
                        Prova" per iniziare.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaderboard.map((item, index) => {
                      const isQualified = index < 6;
                      return (
                        <TableRow
                          key={item.citizen_id}
                          className={`border-slate-800/60 ${
                            isQualified
                              ? "bg-amber-500/10 hover:bg-amber-500/15"
                              : "hover:bg-slate-800/40"
                          }`}
                        >
                          <TableCell className="text-center font-extrabold font-mono text-sm">
                            {isQualified ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-black">
                                #{index + 1}
                              </span>
                            ) : (
                              <span className="text-slate-400">#{index + 1}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-white">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-slate-400" />
                              {item.citizen_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-amber-300 text-base">
                            {item.best_attempt.time_formatted}
                          </TableCell>
                          <TableCell className="text-center font-mono text-slate-300">
                            <Badge variant="outline" className="border-slate-700 text-xs">
                              {item.total_attempts}{" "}
                              {item.total_attempts === 1 ? "tentativo" : "tentativi"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-400 text-xs italic">
                            {item.best_attempt.notes || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {isQualified ? (
                              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-bold gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />{" "}
                                QUALIFICATO FINALE
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-slate-500 border-slate-700 text-xs"
                              >
                                Non Qualificato
                              </Badge>
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
        </TabsContent>

        {/* TAB 2: GRAN FINALE & PODIO */}
        <TabsContent value="finale" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" /> Fase 2: Gran Finale (15 Giri)
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Corsa diretta tra i 6 migliori fantini qualificati il 05/08/2026 ore 16:00.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Podium Visualisation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1st Place */}
                <div className="bg-gradient-to-b from-amber-500/20 to-slate-900 border border-amber-500/40 rounded-2xl p-5 text-center relative overflow-hidden order-1 md:order-2 shadow-xl">
                  <div className="absolute top-2 right-2 text-3xl">🥇</div>
                  <Badge className="bg-amber-500 text-slate-950 font-black px-3 py-1 text-xs">
                    1° POSTO - CAMPIONE
                  </Badge>
                  <h3 className="text-2xl font-black text-amber-300 mt-3">Coppa d'Oro</h3>
                  <p className="text-3xl font-extrabold font-mono text-emerald-400 mt-1">
                    30.000 €
                  </p>
                  <div className="mt-4 pt-3 border-t border-amber-500/20 text-xs text-slate-300">
                    {finalists.find((f) => f.final_position === 1) ? (
                      <span className="font-bold text-amber-200 text-sm">
                        🎉 {finalists.find((f) => f.final_position === 1)?.citizen_name}
                      </span>
                    ) : (
                      <span className="italic text-slate-500">
                        In attesa dei risultati ufficiali
                      </span>
                    )}
                  </div>
                </div>

                {/* 2nd Place */}
                <div className="bg-gradient-to-b from-slate-400/20 to-slate-900 border border-slate-400/30 rounded-2xl p-5 text-center relative overflow-hidden order-2 md:order-1">
                  <div className="absolute top-2 right-2 text-3xl">🥈</div>
                  <Badge className="bg-slate-300 text-slate-950 font-black px-3 py-1 text-xs">
                    2° POSTO
                  </Badge>
                  <h3 className="text-xl font-black text-slate-200 mt-3">Coppa d'Argento</h3>
                  <p className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">
                    20.000 €
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-700 text-xs text-slate-300">
                    {finalists.find((f) => f.final_position === 2) ? (
                      <span className="font-bold text-slate-200 text-sm">
                        🥈 {finalists.find((f) => f.final_position === 2)?.citizen_name}
                      </span>
                    ) : (
                      <span className="italic text-slate-500">In attesa dei risultati</span>
                    )}
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="bg-gradient-to-b from-amber-800/20 to-slate-900 border border-amber-800/30 rounded-2xl p-5 text-center relative overflow-hidden order-3">
                  <div className="absolute top-2 right-2 text-3xl">🥉</div>
                  <Badge className="bg-amber-800 text-amber-100 font-black px-3 py-1 text-xs">
                    3° POSTO
                  </Badge>
                  <h3 className="text-xl font-black text-amber-500 mt-3">Coppa di Bronzo</h3>
                  <p className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">
                    10.000 €
                  </p>
                  <div className="mt-4 pt-3 border-t border-amber-800/20 text-xs text-slate-300">
                    {finalists.find((f) => f.final_position === 3) ? (
                      <span className="font-bold text-amber-400 text-sm">
                        🥉 {finalists.find((f) => f.final_position === 3)?.citizen_name}
                      </span>
                    ) : (
                      <span className="italic text-slate-500">In attesa dei risultati</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Finalists Table */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                    <Flag className="h-4 w-4" /> Griglia dei 6 Finalisti & Risultati
                  </h3>
                  <div className="flex items-center gap-2">
                    {canWrite && finalists.length > 0 && (
                      <Button
                        onClick={() => resolveAllBets.mutate()}
                        disabled={resolveAllBets.isPending}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5"
                      >
                        <Dices className="h-4 w-4" /> Risolvi Scommesse in base al Podio
                      </Button>
                    )}
                    {finalists.length === 0 && canWrite && (
                      <Button
                        onClick={() => promoteFinalists.mutate()}
                        size="sm"
                        className="bg-amber-500 text-slate-950 font-bold text-xs"
                      >
                        Importa TOP 6 Qualificazioni
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-950">
                      <TableRow>
                        <TableHead className="text-slate-400 w-16">Griglia</TableHead>
                        <TableHead className="text-slate-400">Fantino</TableHead>
                        <TableHead className="text-slate-400">Tempo Qualifica</TableHead>
                        <TableHead className="text-slate-400">Ticket Finale (5.000€)</TableHead>
                        <TableHead className="text-slate-400">Posizione Finale</TableHead>
                        <TableHead className="text-slate-400 text-right">Premio Spettato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {finalists.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-slate-400 italic">
                            I 6 finalisti non sono ancora stati congelati. Completa le
                            qualificazioni e clicca "Congela TOP 6 Finalisti".
                          </TableCell>
                        </TableRow>
                      ) : (
                        finalists.map((f, idx) => {
                          const reward =
                            f.final_position === 1
                              ? "30.000 € + Coppa d'Oro"
                              : f.final_position === 2
                                ? "20.000 € + Coppa d'Argento"
                                : f.final_position === 3
                                  ? "10.000 € + Coppa di Bronzo"
                                  : f.final_position && f.final_position > 3
                                    ? "Medaglia Partecipazione"
                                    : "In attesa gara";

                          return (
                            <TableRow key={f.id} className="border-slate-800">
                              <TableCell className="font-mono font-extrabold text-amber-400">
                                #{idx + 1}
                              </TableCell>
                              <TableCell className="font-bold text-white">
                                {f.citizen_name}
                              </TableCell>
                              <TableCell className="font-mono text-slate-300">
                                {f.qualifying_time}
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                                  Incluso / Pagato
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {canWrite ? (
                                  <Select
                                    value={f.final_position ? String(f.final_position) : "0"}
                                    onValueChange={(val) =>
                                      updateFinalistPosition.mutate({
                                        id: f.id,
                                        final_position: val === "0" ? null : parseInt(val, 10),
                                      })
                                    }
                                  >
                                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs h-8 w-40">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">Da disputare</SelectItem>
                                      <SelectItem value="1">🥇 1° Posto (Oro)</SelectItem>
                                      <SelectItem value="2">🥈 2° Posto (Argento)</SelectItem>
                                      <SelectItem value="3">🥉 3° Posto (Bronzo)</SelectItem>
                                      <SelectItem value="4">4° Posto</SelectItem>
                                      <SelectItem value="5">5° Posto</SelectItem>
                                      <SelectItem value="6">6° Posto</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : f.final_position ? (
                                  <Badge className="bg-amber-500 text-slate-950 font-bold text-xs">
                                    {f.final_position}° Classificato
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-slate-500 italic">
                                    Da disputare
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-emerald-400 text-xs">
                                {reward}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: BIGLIETTERIA */}
        <TabsContent value="biglietteria" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ticket Prices Card */}
            <Card className="bg-slate-900 border-slate-800 text-white lg:col-span-1">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-amber-400" /> Listino Ticket Ufficiale
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {TICKET_TYPES.map((t, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{t.category}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{t.notes}</div>
                    </div>
                    <div className="text-sm font-extrabold font-mono text-emerald-400 shrink-0">
                      € {t.price.toLocaleString("it-IT")}
                    </div>
                  </div>
                ))}
                {canWrite && (
                  <Button
                    onClick={() => setTicketDlgOpen(true)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold mt-2 gap-2"
                  >
                    <Plus className="h-4 w-4" /> Emetti Biglietto
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Issued Tickets Table */}
            <Card className="bg-slate-900 border-slate-800 text-white lg:col-span-2">
              <CardHeader className="border-b border-slate-800 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-400" /> Biglietti Emessi
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Registro ufficiale delle vendite ticket con stampa ricevute.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-950">
                    <TableRow>
                      <TableHead className="text-slate-400">Cliente</TableHead>
                      <TableHead className="text-slate-400">Categoria Ticket</TableHead>
                      <TableHead className="text-slate-400 text-right">Prezzo</TableHead>
                      <TableHead className="text-slate-400">Operatore</TableHead>
                      <TableHead className="text-slate-400 text-right">Azione</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-400 italic">
                          Nessun biglietto emesso.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tickets.map((t) => (
                        <TableRow key={t.id} className="border-slate-800">
                          <TableCell className="font-bold text-white">
                            {t.citizen_name || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-amber-300 font-medium">
                            {t.category || "Ticket"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-400">
                            € {(t.price ?? 0).toLocaleString("it-IT")}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">
                            {t.issued_by || "Staff"}
                          </TableCell>
                          <TableCell className="text-right flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedTicketForPrint(t)}
                              className="text-xs text-slate-300 hover:text-white gap-1 h-8"
                            >
                              <Printer className="h-3.5 w-3.5 text-amber-400" /> Scontrino
                            </Button>
                            {canWrite && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm("Sei sicuro di voler eliminare questo biglietto?")) {
                                    deleteTicket.mutate(t.id);
                                  }
                                }}
                                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                                title="Elimina Biglietto"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: BANCO SCOMMESSE */}
        <TabsContent value="scommesse" className="space-y-6">
          {/* Rules & Odds Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900 border-amber-500/30 text-white p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium uppercase">
                    1. Vincente Gara
                  </div>
                  <div className="text-2xl font-black text-amber-300 font-mono">Quota 4.50x</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Scommetti sul 1° classificato
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900 border-amber-500/30 text-white p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                  <Medal className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium uppercase">
                    2. Piazzato sul Podio
                  </div>
                  <div className="text-2xl font-black text-purple-300 font-mono">Quota 1.60x</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Vinci se arriva 1°, 2° o 3°
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900 border-amber-500/30 text-white p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium uppercase">
                    3. Accoppiata Secca
                  </div>
                  <div className="text-2xl font-black text-emerald-300 font-mono">Quota 12.00x</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Indovina 1° e 2° nell'ordine esatto
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 gap-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Dices className="h-5 w-5 text-purple-400" /> Registro Scommesse Accettate
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs mt-0.5">
                  Limiti di Puntata Staff: Minimo 1.000€ - Massimo 25.000€. Riscossione previa
                  verifica scontrino.
                </CardDescription>
              </div>

              {canWrite && (
                <Button
                  onClick={() => setBetDlgOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-2"
                >
                  <Plus className="h-4 w-4" /> Nuova Scommessa
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-950">
                  <TableRow>
                    <TableHead className="text-slate-400">Scommettitore</TableHead>
                    <TableHead className="text-slate-400">Modalità</TableHead>
                    <TableHead className="text-slate-400">Pronostico</TableHead>
                    <TableHead className="text-slate-400 text-right">Puntata</TableHead>
                    <TableHead className="text-slate-400 text-center">Quota</TableHead>
                    <TableHead className="text-slate-400 text-right">Vincita Potenziale</TableHead>
                    <TableHead className="text-slate-400 text-center">Stato</TableHead>
                    <TableHead className="text-slate-400 text-right">Azione / Scontrino</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-400 italic">
                        Nessuna scommessa registrata al banco. Clicca "Nuova Scommessa" per
                        piazzarne una.
                      </TableCell>
                    </TableRow>
                  ) : (
                    bets.map((b) => (
                      <TableRow key={b.id} className="border-slate-800">
                        <TableCell className="font-bold text-white">
                          {b.citizen_name || "—"}
                        </TableCell>
                        <TableCell className="capitalize text-xs font-semibold text-purple-300">
                          {b.bet_type || "Scommessa"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-300 font-medium">
                          {b.bet_type === "accoppiata" ? (
                            <span>
                              1°:{" "}
                              <strong className="text-amber-300">{b.fantino_1_name || "—"}</strong>{" "}
                              - 2°:{" "}
                              <strong className="text-amber-300">{b.fantino_2_name || "—"}</strong>
                            </span>
                          ) : (
                            <strong className="text-amber-300">{b.fantino_1_name || "—"}</strong>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-white">
                          € {(b.amount ?? 0).toLocaleString("it-IT")}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-purple-300">
                          {b.odd ?? 1}x
                        </TableCell>
                        <TableCell className="text-right font-mono font-extrabold text-emerald-400">
                          € {(b.potential_payout ?? 0).toLocaleString("it-IT")}
                        </TableCell>
                        <TableCell className="text-center">
                          {canWrite ? (
                            <Select
                              value={b.status || "in_attesa"}
                              onValueChange={(val: any) =>
                                updateBetStatus.mutate({ id: b.id, status: val })
                              }
                            >
                              <SelectTrigger className="bg-slate-950 border-slate-800 text-xs h-7 w-28 mx-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in_attesa">In Attesa</SelectItem>
                                <SelectItem value="vinta">🟢 Vinta</SelectItem>
                                <SelectItem value="pagata">🔵 Pagata</SelectItem>
                                <SelectItem value="persa">🔴 Persa</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : b.status === "vinta" ? (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                              Vinta
                            </Badge>
                          ) : b.status === "pagata" ? (
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                              Pagata
                            </Badge>
                          ) : b.status === "persa" ? (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                              Persa
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 text-amber-300 text-xs"
                            >
                              In Attesa
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedBetForPrint(b)}
                            className="text-xs text-slate-300 hover:text-white gap-1 h-8"
                          >
                            <Printer className="h-3.5 w-3.5 text-purple-400" /> Scontrino
                          </Button>
                          {canWrite && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("Sei sicuro di voler eliminare questa scommessa?")) {
                                  deleteBet.mutate(b.id);
                                }
                              }}
                              className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                              title="Elimina Scommessa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG: REGISTRO COMPLETO TEMPI */}
      {allAttemptsDlgOpen && (
        <AllAttemptsDialog
          qualifications={qualifications}
          onClose={() => setAllAttemptsDlgOpen(false)}
          onDelete={(id) => deleteQualificationAttempt.mutate(id)}
        />
      )}

      {/* DIALOG: REGISTRA PROVA QUALIFICAZIONE */}
      {qualDlgOpen && (
        <QualificaDialog
          citizens={citizens}
          onClose={() => setQualDlgOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["eventi-qualificazioni"] });
            setQualDlgOpen(false);
          }}
        />
      )}

      {/* DIALOG: EMETTI TICKET */}
      {ticketDlgOpen && (
        <TicketDialog
          citizens={citizens}
          staffName={staffName}
          onClose={() => setTicketDlgOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["eventi-tickets"] });
            setTicketDlgOpen(false);
          }}
        />
      )}

      {/* DIALOG: NUOVA SCOMMESSA */}
      {betDlgOpen && (
        <BetDialog
          citizens={citizens}
          finalists={finalists}
          staffName={staffName}
          onClose={() => setBetDlgOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["eventi-scommesse"] });
            setBetDlgOpen(false);
          }}
        />
      )}

      {/* PRINT MODAL: TICKET */}
      {selectedTicketForPrint && (
        <Dialog open onOpenChange={() => setSelectedTicketForPrint(null)}>
          <DialogContent className="bg-slate-950 border-amber-500/40 text-white max-w-md">
            <DialogHeader className="border-b border-slate-800 pb-3">
              <DialogTitle className="text-center font-black text-amber-300 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" /> CASINÒ REVENGE - SCONTRINO TICKET
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3 text-sm font-mono border-b border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Codice Ticket:</span>
                <span className="font-bold text-amber-300">{selectedTicketForPrint.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-bold text-white">{selectedTicketForPrint.citizen_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Categoria:</span>
                <span className="font-bold text-amber-400">{selectedTicketForPrint.category}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-slate-400">Importo Pagato:</span>
                <span className="font-black text-emerald-400">
                  € {(selectedTicketForPrint.price ?? 0).toLocaleString("it-IT")}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-900">
                <span>Operatore Staff:</span>
                <span>{selectedTicketForPrint.issued_by}</span>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => window.print()}
                className="w-full bg-amber-500 text-slate-950 font-bold gap-2"
              >
                <Printer className="h-4 w-4" /> Stampa Scontrino Fiscale
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* PRINT MODAL: BET RECEIPT */}
      {selectedBetForPrint && (
        <Dialog open onOpenChange={() => setSelectedBetForPrint(null)}>
          <DialogContent className="bg-slate-950 border-purple-500/40 text-white max-w-md">
            <DialogHeader className="border-b border-slate-800 pb-3">
              <DialogTitle className="text-center font-black text-purple-300 flex items-center justify-center gap-2">
                <Dices className="h-5 w-5 text-purple-400" /> CASINÒ REVENGE - SCONTRINO SCOMMESSA
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3 text-sm font-mono border-b border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">ID Scommessa:</span>
                <span className="font-bold text-purple-300">{selectedBetForPrint.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Scommettitore:</span>
                <span className="font-bold text-white">{selectedBetForPrint.citizen_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Modalità:</span>
                <span className="font-bold text-purple-300 capitalize">
                  {selectedBetForPrint.bet_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pronostico:</span>
                <span className="font-bold text-amber-300">
                  {selectedBetForPrint.bet_type === "accoppiata"
                    ? `1° ${selectedBetForPrint.fantino_1_name} / 2° ${selectedBetForPrint.fantino_2_name}`
                    : selectedBetForPrint.fantino_1_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Puntata:</span>
                <span className="font-bold text-white">
                  € {(selectedBetForPrint.amount ?? 0).toLocaleString("it-IT")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Quota:</span>
                <span className="font-bold text-purple-300">{selectedBetForPrint.odd ?? 1}x</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-slate-900">
                <span className="text-slate-400">Vincita Potenziale:</span>
                <span className="font-black text-emerald-400">
                  € {(selectedBetForPrint.potential_payout ?? 0).toLocaleString("it-IT")}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => window.print()}
                className="w-full bg-purple-600 text-white font-bold gap-2"
              >
                <Printer className="h-4 w-4" /> Stampa Scontrino Scommessa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ---------------- DIALOGS ----------------

function QualificaDialog({
  citizens,
  onClose,
  onSaved,
}: {
  citizens: Citizen[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [citizenId, setCitizenId] = useState("");
  const [minutes, setMinutes] = useState("1");
  const [seconds, setSeconds] = useState("20");
  const [milliseconds, setMilliseconds] = useState("000");
  const [notes, setNotes] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const citizen = citizens.find((c) => c.id === citizenId);
      if (!citizen) throw new Error("Seleziona un cittadino valido");

      const m = parseInt(minutes, 10) || 0;
      const s = parseInt(seconds, 10) || 0;
      const ms = parseInt(milliseconds, 10) || 0;

      const totalMs = m * 60000 + s * 1000 + ms;
      const formatted = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;

      const payload = {
        id: `qual-${Date.now()}`,
        citizen_id: citizen.id,
        citizen_name: citizen.full_name,
        minutes: m,
        seconds: s,
        milliseconds: ms,
        time_formatted: formatted,
        time_ms: totalMs,
        laps: 10,
        notes: notes.trim() || null,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("eventi_qualificazioni").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tempo di qualificazione salvato con successo!");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Clock className="h-5 w-5" /> Registra Tempo Qualificazione (10 Giri)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-slate-300">Fantino / Cittadino *</Label>
            <Select value={citizenId} onValueChange={setCitizenId}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-white mt-1">
                <SelectValue placeholder="Seleziona cittadino..." />
              </SelectTrigger>
              <SelectContent>
                {citizens.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name} {c.nickname ? `(${c.nickname})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Tempo Cronometrato *</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div>
                <Label className="text-[10px] text-slate-400 uppercase">Minuti</Label>
                <Input
                  type="number"
                  min="0"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white text-center font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-400 uppercase">Secondi</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white text-center font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-400 uppercase">Millisec (ms)</Label>
                <Input
                  type="number"
                  min="0"
                  max="999"
                  value={milliseconds}
                  onChange={(e) => setMilliseconds(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white text-center font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Note / Batteria</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="es. Batteria 2 - Secondo tentativo"
              className="bg-slate-950 border-slate-800 text-white mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-400">
            Annulla
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
          >
            Salva Tempo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TicketDialog({
  citizens,
  staffName,
  onClose,
  onSaved,
}: {
  citizens: Citizen[];
  staffName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [citizenId, setCitizenId] = useState("");
  const [ticketCategory, setTicketCategory] = useState(TICKET_TYPES[0].category);

  const selectedType = useMemo(
    () => TICKET_TYPES.find((t) => t.category === ticketCategory) || TICKET_TYPES[0],
    [ticketCategory],
  );

  const save = useMutation({
    mutationFn: async () => {
      const citizen = citizens.find((c) => c.id === citizenId);
      if (!citizen) throw new Error("Seleziona un cittadino valido");

      const payload = {
        id: `ticket-${Date.now()}`,
        citizen_id: citizen.id,
        citizen_name: citizen.full_name,
        category: selectedType.category,
        price: selectedType.price,
        event_phase: selectedType.phase,
        issued_by: staffName,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("eventi_tickets").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Biglietto emesso con successo!");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Ticket className="h-5 w-5" /> Emetti Biglietto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-slate-300">Acquirente / Cittadino *</Label>
            <Select value={citizenId} onValueChange={setCitizenId}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-white mt-1">
                <SelectValue placeholder="Seleziona cittadino..." />
              </SelectTrigger>
              <SelectContent>
                {citizens.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Tipologia Ticket *</Label>
            <Select value={ticketCategory} onValueChange={setTicketCategory}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_TYPES.map((t) => (
                  <SelectItem key={t.category} value={t.category}>
                    {t.category} (€ {t.price.toLocaleString("it-IT")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
            <div className="text-slate-400">
              Dettaglio: <span className="text-white font-medium">{selectedType.notes}</span>
            </div>
            <div className="text-slate-400">
              Prezzo Fiscale:{" "}
              <span className="text-emerald-400 font-bold font-mono">
                € {selectedType.price.toLocaleString("it-IT")}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-400">
            Annulla
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
          >
            Conferma Incasso & Emetti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BetDialog({
  citizens,
  finalists,
  staffName,
  onClose,
  onSaved,
}: {
  citizens: Citizen[];
  finalists: Finalist[];
  staffName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [citizenId, setCitizenId] = useState("");
  const [betType, setBetType] = useState<"vincente" | "piazzato" | "accoppiata">("vincente");
  const [fantino1Id, setFantino1Id] = useState("");
  const [fantino2Id, setFantino2Id] = useState("");
  const [amount, setAmount] = useState("2000");

  const odd = betType === "vincente" ? 4.5 : betType === "piazzato" ? 1.6 : 12.0;
  const numAmount = parseFloat(amount) || 0;
  const potentialPayout = numAmount * odd;

  const candidateList =
    finalists.length > 0
      ? finalists.map((f) => ({ id: f.citizen_id, name: f.citizen_name }))
      : citizens.map((c) => ({ id: c.id, name: c.full_name }));

  const save = useMutation({
    mutationFn: async () => {
      const citizen = citizens.find((c) => c.id === citizenId);
      if (!citizen) throw new Error("Seleziona uno scommettitore valido");

      if (numAmount < 1000 || numAmount > 25000) {
        throw new Error("Puntata non valida: Minimo 1.000 € - Massimo 25.000 €");
      }

      const f1 = candidateList.find((f) => f.id === fantino1Id);
      if (!f1) throw new Error("Seleziona il fantino di riferimento");

      let f2Name = null;
      if (betType === "accoppiata") {
        const f2 = candidateList.find((f) => f.id === fantino2Id);
        if (!f2) throw new Error("Seleziona il secondo fantino per l'accoppiata secca");
        if (fantino1Id === fantino2Id)
          throw new Error("I due fantini per l'accoppiata devono essere diversi");
        f2Name = f2.name;
      }

      const payload = {
        id: `bet-${Date.now()}`,
        citizen_id: citizen.id,
        citizen_name: citizen.full_name,
        bet_type: betType,
        fantino_1_id: f1.id,
        fantino_1_name: f1.name,
        fantino_2_id: betType === "accoppiata" ? fantino2Id : null,
        fantino_2_name: f2Name,
        amount: numAmount,
        odd: odd,
        potential_payout: potentialPayout,
        status: "in_attesa",
        issued_by: staffName,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("eventi_scommesse").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Scommessa accettata con successo!");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-400">
            <Dices className="h-5 w-5" /> Nuova Scommessa Banco Casinò
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-slate-300">Cliente Scommettitore *</Label>
            <Select value={citizenId} onValueChange={setCitizenId}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-white mt-1">
                <SelectValue placeholder="Seleziona cliente..." />
              </SelectTrigger>
              <SelectContent>
                {citizens.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Modalità di Puntata *</Label>
            <Select value={betType} onValueChange={(v: any) => setBetType(v)}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vincente">1. Vincente Gara (Quota 4.50x)</SelectItem>
                <SelectItem value="piazzato">2. Piazzato Podio (Quota 1.60x)</SelectItem>
                <SelectItem value="accoppiata">3. Accoppiata Secca 1°/2° (Quota 12.00x)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">
              {betType === "accoppiata" ? "1° Classificato *" : "Fantino Scelto *"}
            </Label>
            <Select value={fantino1Id} onValueChange={setFantino1Id}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-white mt-1">
                <SelectValue placeholder="Seleziona fantino..." />
              </SelectTrigger>
              <SelectContent>
                {candidateList.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {betType === "accoppiata" && (
            <div>
              <Label className="text-slate-300">2° Classificato *</Label>
              <Select value={fantino2Id} onValueChange={setFantino2Id}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white mt-1">
                  <SelectValue placeholder="Seleziona 2° fantino..." />
                </SelectTrigger>
                <SelectContent>
                  {candidateList.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-slate-300">Importo Scommesso (€ 1.000 - € 25.000) *</Label>
            <Input
              type="number"
              min="1000"
              max="25000"
              step="500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-slate-950 border-slate-800 text-white mt-1 font-mono font-bold text-lg"
            />
          </div>

          <div className="bg-purple-950/40 p-3 rounded-xl border border-purple-500/30 space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Quota Applicata:</span>
              <span className="font-bold text-purple-300 font-mono">{odd}x</span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-purple-900/50">
              <span className="font-bold text-slate-200">Vincita Potenziale:</span>
              <span className="font-black text-emerald-400 font-mono">
                € {potentialPayout.toLocaleString("it-IT")}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-400">
            Annulla
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            Accetta Puntata & Genera Scontrino
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AllAttemptsDialog({
  qualifications,
  onClose,
  onDelete,
}: {
  qualifications: QualificationAttempt[];
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Clock className="h-5 w-5" /> Registro Completo Tentativi Qualificazione
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Table>
            <TableHeader className="bg-slate-950">
              <TableRow>
                <TableHead className="text-slate-400">Fantino</TableHead>
                <TableHead className="text-slate-400 text-center">Tempo</TableHead>
                <TableHead className="text-slate-400">Note</TableHead>
                <TableHead className="text-slate-400">Data/Ora</TableHead>
                <TableHead className="text-slate-400 text-right">Azione</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qualifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-slate-400 italic">
                    Nessun tempo registrato.
                  </TableCell>
                </TableRow>
              ) : (
                qualifications.map((q) => (
                  <TableRow key={q.id} className="border-slate-800">
                    <TableCell className="font-bold text-white">{q.citizen_name}</TableCell>
                    <TableCell className="text-center font-mono font-bold text-amber-300">
                      {q.time_formatted}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{q.notes || "—"}</TableCell>
                    <TableCell className="text-xs text-slate-400 font-mono">
                      {new Date(q.created_at).toLocaleString("it-IT")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Eliminare questo tempo?")) {
                            onDelete(q.id);
                          }
                        }}
                        className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="ghost" className="text-slate-400">
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
