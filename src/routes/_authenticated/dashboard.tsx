import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    title: "Corse dei Cavalli",
    description: "Monitoraggio delle competizioni ippiche ed inserimento dei risultati di gara.",
    to: "/corse-cavalli",
    icon: Trophy,
    permissions: ["corse.read", "corse.write"],
  },
  {
    title: "Cassette di Sicurezza",
    description: "Assegnazione, stato e controllo dei caveau privati dei clienti del casinò.",
    to: "/cassette",
    icon: Lock,
    permissions: ["cassette.read", "cassette.write"],
  },
  {
    title: "Badge & Timbrature",
    description:
      "Rilevazione presenze, storico orari di lavoro e gestione dei turni del personale.",
    to: "/badge",
    icon: Clock,
    permissions: ["badge.timbra", "badge.visualizza", "badge.settimane", "badge.gestisci"],
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

  const displayName = profile?.display_name || profile?.username || "Collaboratore";

  // Filter features based on user permissions or admin status
  const visibleFeatures = FEATURES.filter((f) => {
    if (isAdmin) return true;
    if (f.adminOnly) return false;
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
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-red-500" /> Situazione Disciplinare
        </h2>

        {userSanctions.length === 0 ? (
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Check className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-emerald-400">Nessuna sanzione attiva</h4>
                <p className="text-sm text-emerald-100/70">
                  Il tuo stato di servizio è impeccabile! Non sono presenti richiami verbali, warn o
                  sospensioni a tuo carico nel fascicolo del personale. Continua così!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-accent/20 bg-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Riepilogo Fascicolo
                </CardTitle>
                <CardDescription>
                  Panoramica dei provvedimenti registrati a tuo nome
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-slate-950/40 rounded-xl border border-border/60 text-center">
                  <div className="text-2xl font-bold text-yellow-500">
                    {
                      userSanctions.filter((s) => s.type === "richiamo_verbale" && s.is_active)
                        .length
                    }
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold mt-1">
                    Richiami Verbali
                  </div>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-xl border border-border/60 text-center">
                  <div className="text-2xl font-bold text-orange-500">
                    {userSanctions.filter((s) => s.type === "warn" && s.is_active).length}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold mt-1">
                    Warn Attivi
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Cronologia Provvedimenti
                </CardTitle>
                <CardDescription>Storico completo dei richiami e delle notifiche</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/40 max-h-[220px] overflow-y-auto px-6 pb-4">
                  {userSanctions.map((s) => {
                    const now = new Date();
                    const isExpired = s.expires_at && new Date(s.expires_at) <= now;
                    const statusText = isExpired ? "Scaduta" : !s.is_active ? "Rimossa" : "Attuale";
                    const statusColor = isExpired
                      ? "text-green-500 bg-green-500/10 border-green-500/20"
                      : !s.is_active
                        ? "text-slate-400 bg-slate-500/10 border-slate-500/20"
                        : "text-red-400 bg-red-500/10 border-red-500/20";

                    return (
                      <div
                        key={s.id}
                        className="py-2.5 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                                s.type === "richiamo_verbale"
                                  ? "bg-yellow-500/10 text-yellow-500"
                                  : s.type === "warn"
                                    ? "bg-orange-500/10 text-orange-500"
                                    : s.type === "sospensione"
                                      ? "bg-red-500/10 text-red-500"
                                      : "bg-purple-500/10 text-purple-400"
                              }`}
                            >
                              {s.type.replace("_", " ")}
                            </span>
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${statusColor}`}
                            >
                              {statusText}
                            </span>
                          </div>
                          <p
                            className={
                              s.is_active && !isExpired
                                ? "text-slate-200"
                                : "text-slate-500 line-through"
                            }
                          >
                            {s.reason}
                          </p>
                          {s.type === "sospensione" && s.expires_at && (
                            <p className="text-[10px] text-red-400/80">
                              {isExpired ? "Scaduta il: " : "Scade il: "}
                              {new Date(s.expires_at).toLocaleString("it-IT", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5 font-mono">
                          {new Date(s.created_at).toLocaleDateString("it-IT")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

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
