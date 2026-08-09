import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users,
  CalendarDays,
  ArrowLeftRight,
  Tag,
  Trophy,
  Lock,
  Clock,
  UserCog,
  ShieldCheck,
  Heart,
  ChevronRight,
  AlertTriangle,
  Check,
  ShieldAlert,
  Palmtree,
  Sparkles,
  Banknote,
  UserCheck,
  Gavel,
  FileText,
} from "lucide-react";
import { PERMISSIONS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

type FeatureItem = {
  title: string;
  description: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions: string[];
  adminOnly?: boolean;
};

const FEATURES: FeatureItem[] = [
  {
    title: "Anagrafica Cittadini",
    description: "Gestione dei dati dei clienti del casinò, livello di membership e note dedicate.",
    to: "/cittadini",
    icon: Users,
    permissions: ["cittadini.read", "cittadini.write"],
  },
  {
    title: "Serate di Gioco",
    description:
      "Pianificazione delle serate di apertura, assegnazione dei pass, ingressi e monitoraggio incassi.",
    to: "/serate",
    icon: CalendarDays,
    permissions: ["serate.crea", "serate.gestisci", "serate.consulta", "serate.incassi"],
  },
  {
    title: "Conversioni Valuta",
    description:
      "Esecuzione delle transazioni di cambio tra Euro e Dobloni e consultazione dello storico.",
    to: "/conversioni",
    icon: ArrowLeftRight,
    permissions: ["conversioni.esegui", "conversioni.storico"],
  },
  {
    title: "Catalogo Servizi",
    description:
      "Listino prezzi, configurazione ed editing delle prestazioni e dei servizi disponibili nel casinò.",
    to: "/servizi",
    icon: Tag,
    permissions: ["servizi.read", "servizi.write"],
  },
  {
    title: "Gestione Eventi (Gran Galà)",
    description:
      "Corsa dei Cavalli, Qualificazioni, Gran Finale, Biglietteria Spectator/Fantino e Banco Scommesse Casinò.",
    to: "/eventi",
    icon: Sparkles,
    permissions: ["eventi.read", "eventi.write", "corse.read", "corse.write"],
  },
  /* {
    title: "Badge & Timbrature",
    description:
      "Rilevazione presenze, storico orari di lavoro e gestione dei turni del personale.",
    to: "/badge",
    icon: Clock,
    permissions: ["badge.timbra", "badge.visualizza", "badge.settimane", "badge.gestisci"],
  }, */
  {
    title: "Gestione Dipendenti",
    description: "Monitoraggio presenze, status operativo, congedi e gestione sanzioni aziendali.",
    to: "/dipendenti",
    icon: UserCheck,
    permissions: ["badge.visualizza", "dipendenti.sanzioni"],
  },
  {
    title: "Stipendi & Payroll",
    description: "Elaborazione prospetti paga settimanali, calcolo quota e comandi di pagamento.",
    to: "/stipendi",
    icon: Banknote,
    permissions: ["stipendi.visualizza", "stipendi.gestisci"],
  },
  {
    title: "Richiesta & Gestione Congedi",
    description: "Invia richieste di congedo o approva i periodi di ferie approvati del personale.",
    to: "/congedi",
    icon: Palmtree,
    permissions: [],
  },
  {
    title: "Gestione Utenti",
    description: "Amministrazione dei profili utente, ruoli, e abilitazioni d'accesso al portale.",
    to: "/utenti",
    icon: UserCog,
    permissions: [],
    adminOnly: true,
  },
  {
    title: "Ruoli & Permessi",
    description: "Configurazione dei gruppi e permessi granulari applicati alle funzioni del sito.",
    to: "/ruoli",
    icon: ShieldCheck,
    permissions: [],
    adminOnly: true,
  },
];

function DashboardPage() {
  const { profile, isAdmin, permissions, userSanctions } = useAuth();
  const qc = useQueryClient();

  const { data: maintenanceData } = useQuery({
    queryKey: ["maintenance-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("maintenance_settings")
        .select("*")
        .eq("id", "global")
        .maybeSingle();
      return data;
    },
  });

  const isMaintenance = !!maintenanceData?.is_maintenance;

  const toggleMaintenance = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from("maintenance_settings")
        .select("*")
        .eq("id", "global")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("maintenance_settings")
          .update({ is_maintenance: !isMaintenance, updated_at: new Date().toISOString() })
          .eq("id", "global");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("maintenance_settings")
          .insert({ id: "global", is_maintenance: true, updated_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance-settings"] });
      toast.success(
        isMaintenance ? "Modalità manutenzione disattivata" : "Modalità manutenzione attivata!",
      );
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const displayName = profile?.display_name || profile?.username || "Collaboratore";

  // Filter features based on user permissions or admin status
  const visibleFeatures = FEATURES.filter((f) => {
    if (isAdmin) return true;
    if (f.adminOnly) return false;
    if (f.to === "/congedi") return true; // Accessible to all authenticated employees
    // Show if user has at least one permission in the feature's permission list
    return f.permissions.some((p) => permissions.includes(p));
  });

  return (
    <div className="space-y-10 py-2">
      {/* Welcome Hero */}
      <div className="rounded-2xl border bg-card text-card-foreground p-8 relative overflow-hidden shadow-sm">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <Badge className="bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 hover:border-primary/30">
            Casino Revenge
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Benvenuto, <span className="text-primary">{displayName}</span>!
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Siamo felici di riaverti qui. Questa è la tua dashboard personalizzata. Di seguito trovi
            l'elenco di tutte le sezioni di cui hai l'autorizzazione all'uso, con il dettaglio delle
            tue abilitazioni attive.
          </p>
        </div>
      </div>

      {/* Fascicolo Sanzioni / Situazione Disciplinare */}
      <PersonalDisciplinaryStatus userSanctions={userSanctions} />

      {/* Features Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Le tue funzionalità abilitate</h2>
          <p className="text-muted-foreground mt-1">
            Seleziona una sezione per iniziare a lavorare
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleFeatures.map((f) => {
            const Icon = f.icon;

            // Get user's active permissions for this feature
            const activePerms = isAdmin
              ? f.adminOnly
                ? ["Amministrazione completa"]
                : PERMISSIONS.filter((p) => f.permissions.includes(p.key)).map((p) => p.label)
              : PERMISSIONS.filter(
                  (p) => f.permissions.includes(p.key) && permissions.includes(p.key),
                ).map((p) => p.label);

            return (
              <Card
                key={f.to}
                className="group hover:border-primary/40 transition-all flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md"
              >
                <CardHeader className="space-y-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-110">
                      <Icon className="h-5 w-5" />
                    </div>
                    {f.adminOnly && (
                      <Badge variant="destructive" className="text-[10px] uppercase font-semibold">
                        Amministratore
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {f.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">{f.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0 flex-1 flex flex-col justify-between">
                  {/* Active Permissions List */}
                  <div className="space-y-2 border-t pt-4">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Le tue abilitazioni:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activePerms.length > 0 ? (
                        activePerms.map((label, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-[10px] px-2 py-0.5 font-medium"
                          >
                            {label}
                          </Badge>
                        ))
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0.5 text-muted-foreground"
                        >
                          Accesso base consentito
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Navigation Button */}
                  <Button asChild size="sm" className="w-full mt-4 group/btn" variant="outline">
                    <Link to={f.to} className="flex items-center justify-center gap-1.5">
                      Accedi a {f.title}
                      <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {isAdmin && (
        <Card className="border-amber-500/30 bg-amber-500/5 max-w-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" /> Pannello Amministratore ·
              Manutenzione
            </CardTitle>
            <CardDescription>
              Attivando la modalità manutenzione, tutti gli operatori verranno reindirizzati a una
              pagina di cortesia di manutenzione attiva. Solo gli amministratori manterranno
              l'accesso completo al pannello.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <div className="font-semibold text-sm">
                Stato Manutenzione:{" "}
                {isMaintenance ? (
                  <span className="text-amber-500 font-bold uppercase">Attiva</span>
                ) : (
                  <span className="text-muted-foreground font-bold uppercase">Disattivata</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Tutti gli altri utenti vedranno la schermata di cortesia in tempo reale.
              </p>
            </div>
            <Button
              variant={isMaintenance ? "destructive" : "outline"}
              onClick={() => toggleMaintenance.mutate()}
              disabled={toggleMaintenance.isPending}
            >
              {isMaintenance ? "Disattiva Manutenzione" : "Attiva Manutenzione"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Signature Footer */}
      <div className="pt-10 pb-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div>&copy; {new Date().getFullYear()} Casino Revenge. Tutti i diritti riservati.</div>
        <div className="flex items-center gap-1 font-medium hover:text-foreground transition-colors">
          Creato con <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" /> da
          Giuse84pro
        </div>
      </div>
    </div>
  );
}

function PersonalDisciplinaryStatus({ userSanctions }: { userSanctions: any[] }) {
  const now = new Date();
  const activeVerbali = userSanctions.filter((s) => s.type === "richiamo_verbale" && s.is_active);
  const activeWarns = userSanctions.filter(
    (s) => s.type === "warn" && s.is_active && (!s.expires_at || new Date(s.expires_at) > now),
  );
  const activeSuspension = userSanctions.find(
    (s) =>
      s.type === "sospensione" && s.is_active && (!s.expires_at || new Date(s.expires_at) > now),
  );

  let statusBadge = {
    label: "In Regola",
    class: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  };
  let adviceMessage = "Nessun provvedimento attivo. Condotta regolare.";

  if (activeSuspension) {
    statusBadge = {
      label: "Servizio Sospeso",
      class: "bg-red-500/10 text-red-500 border-red-500/30 font-bold animate-pulse",
    };
    adviceMessage = "Sospensione in corso. Contatta la direzione per chiarimenti.";
  } else if (activeWarns.length >= 2) {
    statusBadge = {
      label: "Rischio Sospensione",
      class: "bg-red-500/10 text-red-400 border-red-500/30 font-semibold",
    };
    adviceMessage = "Molteplici Warn attivi. Rischio di sospensione imminente.";
  } else if (activeWarns.length === 1 || activeVerbali.length >= 2) {
    statusBadge = {
      label: "Attenzione Disciplinare",
      class: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    };
    adviceMessage = "Nota o Warn registrato. Rispetta rigorosamente il regolamento.";
  } else if (activeVerbali.length === 1) {
    statusBadge = {
      label: "Richiamo Verbale",
      class: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
    };
    adviceMessage = "1 Richiamo verbale registrato. Nessun blocco operativo attivo.";
  }

  return (
    <Card className="border-border bg-card/90 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Gavel className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Situazione Disciplinare</CardTitle>
              <CardDescription className="text-xs">{adviceMessage}</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={`text-xs px-2.5 py-1 border ${statusBadge.class}`}>
              {statusBadge.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Stat counter pills */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-center">
            <div className="text-sm font-bold text-yellow-500">{activeVerbali.length}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-medium">
              Verbali Attivi
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-center">
            <div className="text-sm font-bold text-amber-500">{activeWarns.length}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-medium">
              Warn Attivi
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-center">
            <div className="text-sm font-bold text-red-500">{activeSuspension ? 1 : 0}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-medium">
              Sospensioni
            </div>
          </div>
        </div>

        {/* History list */}
        {userSanctions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-2">
            Nessun provvedimento o sanzione registrata nel tuo storico.
          </p>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-amber-500" /> Storico Provvedimenti Disciplinari
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {userSanctions.map((s) => {
                const isExpired = s.expires_at && new Date(s.expires_at) <= now;
                const isRemoved = !s.is_active;
                const isActive = s.is_active && !isExpired;

                const typeLabel = s.type.replace("_", " ").toUpperCase();
                const typeBadgeColor =
                  s.type === "richiamo_verbale"
                    ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30"
                    : s.type === "warn"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";

                return (
                  <div
                    key={s.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isActive
                        ? "border-red-500/40 bg-red-500/5 shadow-sm"
                        : isRemoved
                          ? "border-border/40 bg-muted/20 opacity-75"
                          : "border-emerald-500/30 bg-emerald-500/5"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] px-2 py-0.5 border ${typeBadgeColor}`}>
                          {typeLabel}
                        </Badge>

                        {/* Status highlight */}
                        {isActive && (
                          <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40 font-bold text-[10px] uppercase">
                            🔴 ATTIVA
                          </Badge>
                        )}
                        {isRemoved && (
                          <Badge className="bg-slate-500/20 text-slate-500 dark:text-slate-400 border-slate-500/30 text-[10px] font-semibold uppercase">
                            ⚪ RIMOSSA / ANNULLATA
                          </Badge>
                        )}
                        {!isActive && !isRemoved && isExpired && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold uppercase">
                            🟢 SCADUTA
                          </Badge>
                        )}
                      </div>

                      <span className="text-[10px] text-muted-foreground font-mono">
                        Assegnata: {new Date(s.created_at).toLocaleDateString("it-IT")}
                      </span>
                    </div>

                    <p
                      className={`text-xs mt-2 font-medium ${
                        isRemoved ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {s.reason}
                    </p>

                    {/* Metadata if removed or expired */}
                    {isRemoved && s.removed_by_name && (
                      <div className="mt-1.5 text-[11px] text-muted-foreground bg-muted/40 px-2 py-1 rounded border border-border/40">
                        Annullata / Rimossa da <strong>{s.removed_by_name}</strong>
                        {s.removed_at &&
                          ` il ${new Date(s.removed_at).toLocaleDateString("it-IT")}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
