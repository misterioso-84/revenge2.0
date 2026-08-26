import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getD1StatusFn, syncToD1NowFn, loadFromD1NowFn, getD1SeedSqlFn } from "@/lib/d1.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Database,
  RefreshCw,
  Download,
  CheckCircle2,
  Cloud,
  FileText,
  Copy,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export function CloudflareD1ControlCard() {
  const qc = useQueryClient();
  const getStatus = useServerFn(getD1StatusFn);
  const syncNow = useServerFn(syncToD1NowFn);
  const loadNow = useServerFn(loadFromD1NowFn);
  const getSeedSql = useServerFn(getD1SeedSqlFn);

  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [sqlContent, setSqlContent] = useState("");
  const [sqlSize, setSqlSize] = useState("");

  const {
    data: status,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["d1-status"],
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
      toast.error(err?.message || "Errore caricamento");
    },
  });

  const handleGenerateAndDownloadSql = async () => {
    try {
      toast.loading("Generazione file SQL di migrazione per D1...", { id: "gen-sql" });
      const res = await getSeedSql();
      toast.dismiss("gen-sql");
      if (res.success && res.sql) {
        setSqlContent(res.sql);
        setSqlSize(res.sizeKb || "80");
        setSqlModalOpen(true);

        // Auto download
        const blob = new Blob([res.sql], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "d1-seed-revenge.sql";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Script d1-seed-revenge.sql generato e scaricato!");
      } else {
        toast.error(res.error || "Errore generazione SQL");
      }
    } catch (e: any) {
      toast.dismiss("gen-sql");
      toast.error(e?.message || "Errore");
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlContent);
    toast.success("SQL copiato negli appunti!");
  };

  return (
    <Card className="bg-[#12141c] border-amber-500/30 shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <CardHeader className="pb-3 border-b border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Cloud className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-base font-black text-white flex items-center gap-2">
                Database Cloudflare D1 (&apos;revenge&apos;)
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] uppercase font-bold tracking-wider">
                  Pages Native
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Sincronizzazione persistente ad altissime prestazioni per Cloudflare Pages
              </CardDescription>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isLoading}
            className="text-slate-400 hover:text-white text-xs h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Aggiorna
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Status 1 */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="text-xs">
              <div className="text-slate-400 font-medium">Stato Database D1</div>
              <div className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Configurato &amp; Attivo
              </div>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
              revenge
            </Badge>
          </div>

          {/* Status 2 */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="text-xs">
              <div className="text-slate-400 font-medium">Sincronizzazione</div>
              <div className="font-bold text-slate-200 mt-0.5">
                {status?.lastUpdatedAt
                  ? new Date(status.lastUpdatedAt).toLocaleTimeString("it-IT", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "In tempo reale"}
              </div>
            </div>
            <Zap className="h-4 w-4 text-amber-400 shrink-0" />
          </div>

          {/* Status 3 */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="text-xs">
              <div className="text-slate-400 font-medium">Ottimizzazione Risorse</div>
              <div className="font-bold text-sky-400 mt-0.5">Dual-Mode Caching</div>
            </div>
            <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/30 text-[10px]">
              Min Quota
            </Badge>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`}
            />
            Sincronizza Ora su D1
          </Button>

          <Button
            onClick={handleGenerateAndDownloadSql}
            variant="outline"
            className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-xs"
          >
            <Download className="h-3.5 w-3.5 mr-2 text-amber-400" />
            Scarica SQL Seed D1 (.sql)
          </Button>

          <Button
            onClick={() => loadMutation.mutate()}
            disabled={loadMutation.isPending}
            variant="ghost"
            className="text-slate-400 hover:text-white font-medium text-xs ml-auto"
          >
            <Database className="h-3.5 w-3.5 mr-1.5" />
            Ricarica da D1
          </Button>
        </div>
      </CardContent>

      {/* SQL Script View Modal */}
      <Dialog open={sqlModalOpen} onOpenChange={setSqlModalOpen}>
        <DialogContent className="max-w-3xl bg-[#12141c] border-slate-800 text-white max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400 font-black">
              <FileText className="h-5 w-5" />
              Script SQL Migrazione Cloudflare D1 (&apos;revenge&apos;)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Usa questo script per popolare o ripristinare direttamente il database Cloudflare D1
              usando la CLI Wrangler o la Dashboard Cloudflare.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
            <div>
              Dimensione: <span className="font-bold text-amber-400">{sqlSize} KB</span>
            </div>
            <code className="text-[11px] text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 font-mono">
              npx wrangler d1 execute revenge --file=d1-seed.sql
            </code>
          </div>

          <div className="flex-1 min-h-0 bg-slate-950 p-3 rounded-xl border border-slate-800 overflow-auto font-mono text-[11px] text-slate-300 select-all leading-relaxed">
            <pre>{sqlContent}</pre>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={handleCopySql} variant="outline" className="border-slate-700 text-xs">
              <Copy className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
              Copia SQL
            </Button>
            <Button
              onClick={() => setSqlModalOpen(false)}
              className="bg-amber-500 text-slate-950 font-bold text-xs"
            >
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
