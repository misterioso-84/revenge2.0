import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Send, Trash2, Palmtree, Clock, CheckCircle2, XCircle } from "lucide-react";

export function LeaveRequestsList() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // Fetch the user's leave requests
  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["my-leaves", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Submit leave request
  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Utente non autenticato.");
      if (!startDate || !endDate) throw new Error("Inserisci le date di inizio e fine congedo.");
      if (!reason.trim()) throw new Error("Inserisci una motivazione per il congedo.");

      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        throw new Error("La data di inizio non può essere nel passato.");
      }
      if (end < start) {
        throw new Error(
          "La data di fine congedo deve essere successiva o uguale alla data di inizio.",
        );
      }

      const id = crypto.randomUUID();
      const { error } = await supabase.from("leave_requests").insert({
        id,
        user_id: user.id,
        display_name: profile?.display_name || profile?.username || "Collaboratore",
        username: profile?.username || "user",
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
      // Invalidate current auth status to check for newly approved congedi
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Cancel/delete pending leave request
  const cancelRequest = useMutation({
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
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  if (!user) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <Palmtree className="h-6 w-6 text-amber-500" /> Gestione Congedi Personale
      </h2>

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
                  <label className="text-xs font-semibold text-slate-300 uppercase">Da data</label>
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
          <CardContent className="flex-1 overflow-y-auto max-h-[350px] min-h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-48 text-slate-400 italic">
                Caricamento richieste...
              </div>
            ) : leaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 space-y-2">
                <Palmtree className="h-12 w-12 text-slate-600 animate-pulse" />
                <p className="text-sm font-medium">Nessuna richiesta inviata</p>
                <p className="text-xs max-w-xs text-slate-600">
                  Compila il modulo a sinistra per richiedere un congedo approvato.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {leaves.map((l: any) => {
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
                                onClick={() => cancelRequest.mutate(l.id)}
                                disabled={cancelRequest.isPending}
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
                          <span className="font-semibold text-slate-400">{l.approved_by_name}</span>
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
    </div>
  );
}
