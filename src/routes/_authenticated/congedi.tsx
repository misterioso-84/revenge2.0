import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Calendar,
  Send,
  Trash2,
  Palmtree,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/congedi")({
  component: CongediPage,
});

function CongediPage() {
  const { user, isAdmin, permissions = [] } = useAuth();
  const qc = useQueryClient();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const [activeTab, setActiveTab] = useState<"miei" | "gestione">("miei");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", description: "", onConfirm: () => {} });

  const canGestisciCongedi =
    isAdmin || permissions.includes("congedi.gestisci") || permissions.includes("badge.gestisci");

  // Helper to parse dates safely in local time to avoid timezone offset shifts
  const parseLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Fetch the current user's leaves
  const { data: myLeaves = [], isLoading: isLoadingMy } = useQuery({
    queryKey: ["my-leaves", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Fetch ALL leaves for admin management
  const { data: allLeaves = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ["all-leaves"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: canGestisciCongedi,
  });

  // Submit a leave request (for employees)
  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Utente non autenticato.");
      if (!startDate || !endDate) throw new Error("Inserisci le date di inizio e fine congedo.");
      if (!reason.trim()) throw new Error("Inserisci una motivazione per il congedo.");

      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);

      if (start < today) {
        throw new Error("La data di inizio non può essere nel passato.");
      }
      if (end < start) {
        throw new Error(
          "La data di fine congedo deve essere successiva o uguale alla data di inizio.",
        );
      }

      // Check for overlap in existing approved leaves of this user
      const hasOverlap = myLeaves.some((l: any) => {
        if (l.status !== "approved") return false;
        const lStart = parseLocalDate(l.start_date);
        const lEnd = parseLocalDate(l.end_date);
        return start <= lEnd && end >= lStart;
      });

      if (hasOverlap) {
        throw new Error("Hai già un congedo approvato che si sovrappone a questo periodo.");
      }

      const id = crypto.randomUUID();
      const { error } = await supabase.from("leave_requests").insert({
        id,
        user_id: user.id,
        display_name: user.email?.split("@")[0] || "Collaboratore", // fallback to display_name later
        username: user.email?.split("@")[0] || "user",
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
        status: "pending",
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Richiesta di congedo inviata con successo!");
      setStartDate("");
      setEndDate("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["my-leaves"] });
      qc.invalidateQueries({ queryKey: ["all-leaves"] });
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Cancel/delete pending leave request (by employee)
  const cancelPendingRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("leave_requests")
        .delete()
        .eq("id", id)
        .eq("status", "pending");

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Richiesta di congedo annullata.");
      qc.invalidateQueries({ queryKey: ["my-leaves"] });
      qc.invalidateQueries({ queryKey: ["all-leaves"] });
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Process a leave decision (Approve / Reject)
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

  // Admin action: Delete/Cancel an approved leave
  const deleteApprovedLeave = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leave_requests").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Congedo annullato ed eliminato definitivamente dal database!");
      qc.invalidateQueries({ queryKey: ["all-leaves"] });
      qc.invalidateQueries({ queryKey: ["my-leaves"] });
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Admin lists categorized:
  // 1. Pending Requests
  const pendingRequests = useMemo(() => {
    return allLeaves.filter((l: any) => l.status === "pending");
  }, [allLeaves]);

  // 2. Approved Future Leaves (start_date > today)
  const approvedFutureLeaves = useMemo(() => {
    return allLeaves.filter((l: any) => {
      if (l.status !== "approved") return false;
      const start = parseLocalDate(l.start_date);
      return start > today;
    });
  }, [allLeaves, today]);

  // 3. Approved Ongoing Leaves (start_date <= today && end_date >= today)
  const approvedOngoingLeaves = useMemo(() => {
    return allLeaves.filter((l: any) => {
      if (l.status !== "approved") return false;
      const start = parseLocalDate(l.start_date);
      const end = parseLocalDate(l.end_date);
      return start <= today && end >= today;
    });
  }, [allLeaves, today]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <Palmtree className="h-9 w-9 text-amber-500 animate-pulse" /> Gestione Congedi & Ferie
        </h1>
        <p className="text-slate-400 mt-1">
          Pianifica le tue assenze e monitora lo stato delle approvazioni dello staff.
        </p>
      </div>

      {/* Tabs Switcher - Hidden if the user doesn't have permissions */}
      {canGestisciCongedi && (
        <div className="flex border-b border-slate-800 gap-6 text-sm mb-6">
          <button
            onClick={() => setActiveTab("miei")}
            className={`pb-3 font-semibold uppercase tracking-wider text-xs transition-all ${
              activeTab === "miei"
                ? "border-b-2 border-amber-500 text-amber-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            I miei Congedi
          </button>
          <button
            onClick={() => setActiveTab("gestione")}
            className={`pb-3 font-semibold uppercase tracking-wider text-xs transition-all flex items-center gap-1.5 ${
              activeTab === "gestione"
                ? "border-b-2 border-amber-500 text-amber-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Gestione Richieste Staff
            {pendingRequests.length > 0 && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-[10px] px-1.5 py-0.2 ml-1">
                {pendingRequests.length}
              </Badge>
            )}
          </button>
        </div>
      )}

      {/* Tab Content: Employees view (I miei congedi) */}
      {(!canGestisciCongedi || activeTab === "miei") && (
        <div className="grid gap-6 md:grid-cols-12">
          {/* Richiedi Congedo Form Card */}
          <Card className="md:col-span-5 bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-amber-400">
                <Calendar className="h-5 w-5" /> Nuova Richiesta
              </CardTitle>
              <CardDescription className="text-slate-400">
                Seleziona l'arco temporale per il tuo congedo. Durante questo periodo il tuo accesso
                al pannello sarà bloccato.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitRequest.mutate();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase">
                      Da data
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="bg-slate-950 border-slate-800 text-white focus:ring-amber-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase">A data</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="bg-slate-950 border-slate-800 text-white focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase">
                    Motivazione
                  </label>
                  <textarea
                    placeholder="Es. Motivi personali, vacanza, impegni familiari..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    rows={3}
                    className="w-full rounded-md bg-slate-950 border border-slate-800 text-white p-3 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitRequest.isPending}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-all"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitRequest.isPending ? "Invio in corso..." : "Invia Richiesta"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Storico Richieste Card */}
          <Card className="md:col-span-7 bg-slate-900 border-slate-800 text-white shadow-xl flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-300">
                <Clock className="h-5 w-5 text-amber-500" /> Le mie Richieste di Congedo
              </CardTitle>
              <CardDescription className="text-slate-400">
                Storico e stato attuale delle tue richieste di congedo inviate.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto max-h-[450px] min-h-[200px]">
              {isLoadingMy ? (
                <div className="flex items-center justify-center h-48 text-slate-400 italic">
                  Caricamento richieste...
                </div>
              ) : myLeaves.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 space-y-2">
                  <Palmtree className="h-12 w-12 text-slate-600" />
                  <p className="text-sm font-medium">Nessuna richiesta inviata</p>
                  <p className="text-xs max-w-xs text-slate-600">
                    Compila il modulo a sinistra per richiedere un congedo.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {myLeaves.map((l: any) => {
                    const daysCount =
                      Math.ceil(
                        (new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) /
                          (1000 * 3600 * 24),
                      ) + 1;

                    return (
                      <div
                        key={l.id}
                        className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2.5 transition-all hover:bg-slate-950/70"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-slate-200">
                              Dal {new Date(l.start_date).toLocaleDateString("it-IT")} al{" "}
                              {new Date(l.end_date).toLocaleDateString("it-IT")}
                            </span>
                            <span className="text-slate-500">
                              ({daysCount} {daysCount === 1 ? "giorno" : "giorni"})
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {l.status === "pending" && (
                              <>
                                <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 uppercase font-bold text-[9px] px-1.5 py-0.5">
                                  In attesa
                                </Badge>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    setDeleteConfirm({
                                      isOpen: true,
                                      title: "Annulla richiesta congedo",
                                      description:
                                        "Sei sicuro di voler annullare questa richiesta di congedo in attesa?",
                                      onConfirm: () => cancelPendingRequest.mutate(l.id),
                                    })
                                  }
                                  disabled={cancelPendingRequest.isPending}
                                  className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  title="Annulla richiesta"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {l.status === "approved" && (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase font-bold text-[9px] px-1.5 py-0.5 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Approvato
                              </Badge>
                            )}
                            {l.status === "rejected" && (
                              <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 uppercase font-bold text-[9px] px-1.5 py-0.5 flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> Rifiutato
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="text-xs bg-slate-950 p-2 rounded border border-slate-900 text-slate-300 italic leading-relaxed">
                          "{l.reason}"
                        </div>

                        {l.status !== "pending" && l.approved_by_name && (
                          <p className="text-[10px] text-slate-500 text-right">
                            {l.status === "approved" ? "Approvato" : "Rifiutato"} da:{" "}
                            <span className="font-semibold text-slate-400">
                              {l.approved_by_name}
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Content: Admin management (Gestione Richieste Staff) */}
      {canGestisciCongedi && activeTab === "gestione" && (
        <div className="space-y-6">
          {/* 1. RICHIESTE IN ATTESA */}
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-yellow-500">
                <Clock className="h-5 w-5" /> Richieste in Attesa di Approvazione
              </CardTitle>
              <CardDescription className="text-slate-400">
                Esamina, approva o rifiuta le richieste inviate dai dipendenti del casinò.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-950/40 border-slate-800">
                  <TableRow>
                    <TableHead className="text-slate-400">Dipendente</TableHead>
                    <TableHead className="text-slate-400">Periodo Congedo</TableHead>
                    <TableHead className="text-slate-400">Motivazione</TableHead>
                    <TableHead className="text-slate-400 text-right w-52">Gestione</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingAll ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-slate-400 italic">
                        Caricamento richieste...
                      </TableCell>
                    </TableRow>
                  ) : pendingRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500 italic">
                        Nessuna richiesta in attesa di approvazione.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingRequests.map((l: any) => {
                      const daysCount =
                        Math.ceil(
                          (new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) /
                            (1000 * 3600 * 24),
                        ) + 1;

                      return (
                        <TableRow key={l.id} className="border-slate-800/60 hover:bg-slate-950/20">
                          <TableCell className="font-semibold text-slate-100">
                            <div>
                              <div>{l.display_name || l.username}</div>
                              <div className="text-[10px] font-mono text-slate-500 font-normal">
                                @{l.username}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-slate-300">
                              Dal {new Date(l.start_date).toLocaleDateString("it-IT")} al{" "}
                              {new Date(l.end_date).toLocaleDateString("it-IT")}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Durata: {daysCount} {daysCount === 1 ? "giorno" : "giorni"}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs text-xs text-slate-300 italic">
                            <span
                              className="block truncate hover:text-clip hover:whitespace-normal"
                              title={l.reason}
                            >
                              "{l.reason}"
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-3.5">
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
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 2. CONGEDI IN CORSO */}
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" /> Congedi Attivi Ora (In Corso)
              </CardTitle>
              <CardDescription className="text-slate-400">
                I congedi approvati in corso in questo momento. L'accesso per questi utenti è
                attualmente bloccato.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-950/40 border-slate-800">
                  <TableRow>
                    <TableHead className="text-slate-400">Dipendente</TableHead>
                    <TableHead className="text-slate-400">Periodo Congedo</TableHead>
                    <TableHead className="text-slate-400">Motivazione</TableHead>
                    <TableHead className="text-slate-400">Approvato Da</TableHead>
                    {isAdmin && (
                      <TableHead className="text-slate-400 text-right w-40">Azioni</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingAll ? (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 5 : 4}
                        className="text-center py-6 text-slate-400 italic"
                      >
                        Caricamento congedi...
                      </TableCell>
                    </TableRow>
                  ) : approvedOngoingLeaves.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 5 : 4}
                        className="text-center py-8 text-slate-500 italic"
                      >
                        Nessun congedo attualmente in corso in questo arco temporale.
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvedOngoingLeaves.map((l: any) => {
                      const daysCount =
                        Math.ceil(
                          (new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) /
                            (1000 * 3600 * 24),
                        ) + 1;

                      return (
                        <TableRow key={l.id} className="border-slate-800/60 hover:bg-slate-950/20">
                          <TableCell className="font-semibold text-slate-100">
                            <div>
                              <div>{l.display_name || l.username}</div>
                              <div className="text-[10px] font-mono text-slate-500 font-normal">
                                @{l.username}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-emerald-400">
                              Dal {new Date(l.start_date).toLocaleDateString("it-IT")} al{" "}
                              {new Date(l.end_date).toLocaleDateString("it-IT")}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Durata: {daysCount} {daysCount === 1 ? "giorno" : "giorni"}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs text-xs text-slate-300 italic">
                            "{l.reason}"
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">
                            {l.approved_by_name || "Amministratore"}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              {confirmDeleteId === l.id ? (
                                <div className="flex items-center gap-1.5 justify-end">
                                  <span className="text-[10px] text-red-400 font-medium animate-pulse">
                                    Sicuro di voler annullare?
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      deleteApprovedLeave.mutate(l.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 h-7 font-bold"
                                  >
                                    Sì, Annulla
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="bg-slate-800 text-slate-200 border-slate-700 text-xs px-2 h-7"
                                  >
                                    No
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setConfirmDeleteId(l.id)}
                                  disabled={deleteApprovedLeave.isPending}
                                  className="bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 text-xs px-2.5 h-8 font-semibold"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Annulla Congedo
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 3. CONGEDI FUTURI */}
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-amber-400">
                <Calendar className="h-5 w-5" /> Congedi Approvati Futuri (Da Venire)
              </CardTitle>
              <CardDescription className="text-slate-400">
                Pianificazioni approvate per periodi futuri che devono ancora iniziare.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-950/40 border-slate-800">
                  <TableRow>
                    <TableHead className="text-slate-400">Dipendente</TableHead>
                    <TableHead className="text-slate-400">Periodo Congedo</TableHead>
                    <TableHead className="text-slate-400">Motivazione</TableHead>
                    <TableHead className="text-slate-400">Approvato Da</TableHead>
                    {isAdmin && (
                      <TableHead className="text-slate-400 text-right w-40">Azioni</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingAll ? (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 5 : 4}
                        className="text-center py-6 text-slate-400 italic"
                      >
                        Caricamento congedi...
                      </TableCell>
                    </TableRow>
                  ) : approvedFutureLeaves.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 5 : 4}
                        className="text-center py-8 text-slate-500 italic"
                      >
                        Nessun congedo programmato per il futuro.
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvedFutureLeaves.map((l: any) => {
                      const daysCount =
                        Math.ceil(
                          (new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) /
                            (1000 * 3600 * 24),
                        ) + 1;

                      return (
                        <TableRow key={l.id} className="border-slate-800/60 hover:bg-slate-950/20">
                          <TableCell className="font-semibold text-slate-100">
                            <div>
                              <div>{l.display_name || l.username}</div>
                              <div className="text-[10px] font-mono text-slate-500 font-normal">
                                @{l.username}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-amber-400">
                              Dal {new Date(l.start_date).toLocaleDateString("it-IT")} al{" "}
                              {new Date(l.end_date).toLocaleDateString("it-IT")}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Durata: {daysCount} {daysCount === 1 ? "giorno" : "giorni"}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs text-xs text-slate-300 italic">
                            "{l.reason}"
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">
                            {l.approved_by_name || "Amministratore"}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              {confirmDeleteId === l.id ? (
                                <div className="flex items-center gap-1.5 justify-end">
                                  <span className="text-[10px] text-red-400 font-medium animate-pulse">
                                    Sicuro di voler annullare?
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      deleteApprovedLeave.mutate(l.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 h-7 font-bold"
                                  >
                                    Sì, Annulla
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="bg-slate-800 text-slate-200 border-slate-700 text-xs px-2 h-7"
                                  >
                                    No
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setConfirmDeleteId(l.id)}
                                  disabled={deleteApprovedLeave.isPending}
                                  className="bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 text-xs px-2.5 h-8 font-semibold"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Annulla Congedo
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        description={deleteConfirm.description}
        onConfirm={deleteConfirm.onConfirm}
        onClose={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
