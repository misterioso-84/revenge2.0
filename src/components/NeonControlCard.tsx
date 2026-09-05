import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNeonStatusFn, syncToNeonNowFn, loadFromNeonNowFn } from "@/lib/neon.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, RefreshCw, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";

export function NeonControlCard() {
  const qc = useQueryClient();
  const getStatus = useServerFn(getNeonStatusFn);
  const syncNow = useServerFn(syncToNeonNowFn);
  const loadNow = useServerFn(loadFromNeonNowFn);

  const {
    data: status,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["neon-status"],
    queryFn: () => getStatus(),
    refetchInterval: 30000,
  });

  const syncMutation = useMutation({
    mutationFn: () => syncNow(),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message);
        qc.invalidateQueries();
        refetch();
      } else {
        toast.error(res.message);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Errore sincronizzazione");
    },
  });

  const loadMutation = useMutation({
    mutationFn: () => loadNow(),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message);
        qc.invalidateQueries();
        refetch();
      } else {
        toast.error(res.message);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Errore caricamento da Neon");
    },
  });

  return (
    <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-slate-900/60 to-slate-950/90 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-white">
                <span>Database Neon PostgreSQL</span>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-[10px] font-mono py-0"
                >
                  <Zap className="h-3 w-3 mr-1 inline" /> PRIMARIO
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Database relazionale serverless attivo su Neon Cloud. Tutti i dati sono memorizzati
                e sincronizzati in tempo reale.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoading ? (
              <Badge variant="outline" className="text-muted-foreground animate-pulse text-xs">
                Verifica...
              </Badge>
            ) : status?.isConnected ? (
              <Badge
                variant="outline"
                className="bg-emerald-500/15 text-emerald-400 border-emerald-500/40 text-xs py-1 flex items-center gap-1.5 font-medium"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Connesso & Operativo
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-500/15 text-amber-400 border-amber-500/40 text-xs py-1"
              >
                {status?.error || "Non Connesso"}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <div className="text-[10px] uppercase font-mono text-muted-foreground flex items-center gap-1.5 mb-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span>Stato Serverless</span>
            </div>
            <div className="text-sm font-semibold text-emerald-300">
              {status?.isConnected ? "Attivo (Neon EU)" : "In pausa"}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <div className="text-[10px] uppercase font-mono text-muted-foreground flex items-center gap-1.5 mb-1">
              <Database className="h-3 w-3 text-cyan-400" />
              <span>Tabelle nel Database</span>
            </div>
            <div className="text-sm font-semibold text-white">
              {status?.tablesCount ? `${status.tablesCount} tabelle` : "app_state + 22 tabelle"}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 col-span-2 sm:col-span-1">
            <div className="text-[10px] uppercase font-mono text-muted-foreground flex items-center gap-1.5 mb-1">
              <RefreshCw className="h-3 w-3 text-amber-400" />
              <span>Ultimo Aggiornamento</span>
            </div>
            <div className="text-xs font-mono text-slate-300 truncate">
              {status?.lastUpdatedAt
                ? new Date(status.lastUpdatedAt).toLocaleString("it-IT", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "Aggiornato adesso"}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/30">
          <div className="text-xs text-muted-foreground">
            Sincronizzazione automatica attiva ad ogni scrittura sul database.
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              className="text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Verifica Stato
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => loadMutation.mutate()}
              disabled={loadMutation.isPending}
              className="text-xs border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-300"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${loadMutation.isPending ? "animate-spin" : ""}`}
              />
              {loadMutation.isPending ? "Caricamento..." : "Ricarica da Neon"}
            </Button>

            <Button
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              <Zap
                className={`h-3.5 w-3.5 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`}
              />
              {syncMutation.isPending ? "Salvataggio..." : "Forza Sincronizzazione"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
