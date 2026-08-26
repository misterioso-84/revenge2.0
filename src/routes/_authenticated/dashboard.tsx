import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getTimeBasedGreeting } from "@/lib/greeting";
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
  CheckCircle2,
  Send,
  ExternalLink,
  Copy,
  MessageSquare,
  QrCode,
  Crown,
  Shield,
  Sun,
  Moon,
  Flame,
  Zap,
  GraduationCap,
  LayoutDashboard,
} from "lucide-react";
import { PERMISSIONS } from "@/lib/format";
import { getUserTelegramGroups, generateGroupInviteLink } from "@/lib/telegram-groups.functions";
import { getMaintenanceStatus, setMaintenanceMode } from "@/lib/admin.functions";
import { getMasterStatsSummary } from "@/lib/master.functions";

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
    title: "Board & Workspace Staff",
    description: "Bacheca comunicazioni, note operative staff, direttive aziendali e accesso SSO.",
    to: "/board",
    icon: LayoutDashboard,
    permissions: [],
  },
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
    permissions: ["eventi.gestisci"],
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
    title: "Master & Spiegazioni Staff",
    description:
      "Controllo spiegazione ruoli dipendenti, formazione e abilitazione temporanea nei gruppi.",
    to: "/master",
    icon: GraduationCap,
    permissions: ["master.gestisci", "master.visualizza"],
  },
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
  const {
    profile,
    isAdmin,
    permissions,
    userSanctions,
    hasEmployeeAccess,
    customRoles = [],
    customRoleNames = [],
    roles = [],
    loading,
  } = useAuth();
  const qc = useQueryClient();
  const timeGreeting = getTimeBasedGreeting();

  const { data: maintenanceData } = useQuery({
    queryKey: ["maintenance-settings"],
    queryFn: async () => {
      try {
        const res = await getMaintenanceStatus();
        return res;
      } catch {
        const { data } = await supabase
          .from("maintenance_settings")
          .select("*")
          .eq("id", "global")
          .maybeSingle();
        return data ?? null;
      }
    },
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  const isMaintenance = !!maintenanceData?.is_maintenance;

  const toggleMaintenance = useMutation({
    mutationFn: async (explicitTarget?: boolean) => {
      const nextVal = typeof explicitTarget === "boolean" ? explicitTarget : !isMaintenance;
      try {
        const res = await setMaintenanceMode({ data: { isMaintenance: nextVal } });
        return res?.is_maintenance ?? nextVal;
      } catch {
        const { error } = await supabase.from("maintenance_settings").upsert({
          id: "global",
          is_maintenance: nextVal,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        return nextVal;
      }
    },
    onMutate: async (explicitTarget?: boolean) => {
      const nextVal = typeof explicitTarget === "boolean" ? explicitTarget : !isMaintenance;
      await qc.cancelQueries({ queryKey: ["maintenance-settings"] });
      const previousData = qc.getQueryData(["maintenance-settings"]);
      qc.setQueryData(["maintenance-settings"], {
        id: "global",
        is_maintenance: nextVal,
        updated_at: new Date().toISOString(),
      });
      return { previousData };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousData) {
        qc.setQueryData(["maintenance-settings"], context.previousData);
      }
      toast.error(err.message || "Errore durante il cambio modalità manutenzione");
    },
    onSuccess: (newVal) => {
      qc.invalidateQueries({ queryKey: ["maintenance-settings"] });
      toast.success(
        newVal ? "Modalità manutenzione attivata!" : "Modalità manutenzione disattivata!",
      );
    },
  });

  const displayName = profile?.display_name || profile?.username || "Collaboratore";
  const [allGroupsJoined, setAllGroupsJoined] = useState(false);

  const getMasterStatsFn = useServerFn(getMasterStatsSummary);
  const canAccessMaster =
    isAdmin || permissions.includes("master.gestisci") || permissions.includes("master.visualizza");

  const { data: masterStats } = useQuery({
    queryKey: ["master-stats-summary"],
    queryFn: async () => {
      try {
        return await getMasterStatsFn();
      } catch {
        return null;
      }
    },
    enabled: !!canAccessMaster,
    refetchInterval: 12000,
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        <p className="text-sm text-slate-400">Caricamento pannello...</p>
      </div>
    );
  }

  // Filter features based on user permissions or admin status
  const visibleFeatures = FEATURES.filter((f) => {
    if (isAdmin) return true;
    if (f.adminOnly) return false;
    if (f.to === "/congedi") return true; // Accessible to all authenticated employees
    // Show if user has at least one permission in the feature's permission list
    return f.permissions.length > 0 && f.permissions.some((p) => permissions.includes(p));
  });

  return (
    <div className="space-y-10 py-2">
      {/* Title Section (Matching Image 1 Style) */}
      <div className="text-center space-y-2 pt-2">
        <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
          GESTIONALE ROLEPLAY
        </h1>

        {/* Diamond Divider Symbol */}
        <div className="flex items-center justify-center gap-2 my-2">
          <div className="h-[1px] w-12 bg-amber-500/40" />
          <span className="text-amber-400 text-xs font-bold">◆</span>
          <div className="h-[1px] w-12 bg-amber-500/40" />
        </div>

        <p className="text-slate-400 text-xs md:text-sm max-w-xl mx-auto uppercase tracking-wider font-medium">
          PANORAMICA E INFORMAZIONI SULLA TUA ESPERIENZA DI GIOCO
        </p>
      </div>

      {/* User Greeting Block */}
      <div className="rounded-3xl border border-slate-800/90 bg-[#12141c] p-6 relative overflow-hidden shadow-2xl backdrop-blur-sm">
        {/* Ambient background glow depending on time of day */}
        <div
          className={`absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none ${
            timeGreeting.period === "morning"
              ? "bg-amber-500"
              : timeGreeting.period === "afternoon"
                ? "bg-sky-500"
                : "bg-indigo-600"
          }`}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar with Minecraft Head and Level Glow */}
          <div className="relative group shrink-0">
            <div className="h-24 w-24 rounded-2xl bg-[#0a0b10] border-2 border-amber-500/40 p-2 flex items-center justify-center shadow-xl relative overflow-hidden group-hover:border-amber-400 transition-colors">
              <img
                src={`https://mc-heads.net/avatar/${encodeURIComponent(profile?.username || "Steve")}/80`}
                alt="Avatar Minecraft"
                className="h-20 w-20 object-contain rounded-xl drop-shadow-lg transform group-hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://minotar.net/helm/Steve/80.png";
                }}
              />
            </div>
            {isAdmin && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 p-1.5 rounded-full shadow-lg border border-amber-300">
                <Crown className="h-3.5 w-3.5" />
              </div>
            )}
          </div>

          {/* User Information & Time Greeting */}
          <div className="space-y-3 text-center md:text-left flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-slate-900 border border-slate-700/80 text-slate-300 shadow-inner">
                <span>{timeGreeting.emoji}</span>
                <span>{timeGreeting.badgeLabel}</span>
              </span>

              <div className="flex items-center gap-1.5 bg-[#0a0b10] border border-slate-800 px-3 py-1 rounded-full shadow-inner">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  {isAdmin
                    ? "Amministratore"
                    : hasEmployeeAccess
                      ? "Staff Operativo"
                      : "Cittadino Registrato"}
                </span>
              </div>
            </div>

            <div>
              <div className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {timeGreeting.greeting},{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500">
                  {displayName}
                </span>
                !
              </div>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-2xl mt-1">
                {timeGreeting.phrase}.{" "}
                {hasEmployeeAccess
                  ? "Di seguito trovi il tuo pannello operativo, i ruoli assegnati e le abilitazioni attive."
                  : "Consulta i tuoi servizi cittadini e la tua tessera ufficiale di gioco."}
              </p>
            </div>

            {/* Roles & Extrapex Visualization */}
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2 border-t border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Shield className="h-3 w-3 text-amber-400" /> Ruoli & Incarichi:
              </span>

              {isAdmin && (
                <Badge className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 border border-amber-500/40 text-xs font-bold px-2.5 py-0.5 rounded-lg shadow-sm">
                  👑 Amministratore
                </Badge>
              )}

              {customRoles.map((cr) => {
                const roleColor = cr.staff_color || (cr.is_reparto ? "#a855f7" : "#3b82f6");
                return (
                  <span
                    key={cr.id || cr.name}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-lg border transition-all shadow-sm"
                    style={{
                      backgroundColor: `${roleColor}18`,
                      borderColor: `${roleColor}50`,
                      color: "#ffffff",
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: roleColor }}
                    />
                    <span>{cr.name}</span>
                    {cr.is_reparto && (
                      <span className="text-[9px] uppercase px-1 py-0 rounded bg-purple-500/20 text-purple-300 ml-0.5">
                        Extrapex
                      </span>
                    )}
                  </span>
                );
              })}

              {!isAdmin && customRoles.length === 0 && (
                <Badge variant="outline" className="text-slate-400 border-slate-700 text-xs">
                  {hasEmployeeAccess ? "Membro della Ciurma" : "Cittadino di Liberty Bay"}
                </Badge>
              )}

              {permissions.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400/90 border border-amber-500/20">
                  <Zap className="h-3 w-3 text-amber-400" />
                  {permissions.length} permessi
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Master Explanation Alert Banner (Yellow / Orange alert) */}
      {masterStats?.hasAccess && masterStats.pendingCount > 0 && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/80 bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-[#12141c] p-4 sm:p-6 shadow-2xl shadow-amber-500/15">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/25 border-2 border-amber-400 flex items-center justify-center text-amber-300 shrink-0 shadow-lg shadow-amber-500/20">
                <GraduationCap className="h-7 w-7 animate-pulse" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-base sm:text-lg font-black text-amber-300 uppercase tracking-tight flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
                    ATTENZIONE: {masterStats.pendingCount} DIPENDENT
                    {masterStats.pendingCount === 1 ? "E DEVE" : "I DEVONO"} RICEVERE SPIEGAZIONE!
                  </span>
                  <Badge className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-0.5 uppercase tracking-wide">
                    Master Spiegazioni
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 font-medium">
                  Sono presenti membri dello staff con cambio ruolo o nuovo inserimento in attesa di
                  formazione.
                </p>

                {/* Chips of pending employees with duration elapsed */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                    In attesa da:
                  </span>
                  {masterStats.pendingEmployees.slice(0, 4).map((emp: any) => (
                    <span
                      key={emp.id}
                      className="inline-flex items-center gap-1.5 text-xs bg-[#0a0b10]/90 text-white border border-amber-500/40 px-2.5 py-1 rounded-lg font-medium shadow-sm"
                    >
                      <span className="font-bold">{emp.displayName}</span>
                      <span className="text-amber-400 font-mono text-[11px]">
                        ({emp.timeElapsed.text})
                      </span>
                    </span>
                  ))}
                  {masterStats.pendingEmployees.length > 4 && (
                    <span className="text-xs font-bold text-amber-400/90 self-center">
                      +{masterStats.pendingEmployees.length - 4} altri dipendenti...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Link to="/master" className="shrink-0 w-full lg:w-auto">
              <Button className="w-full lg:w-auto bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-amber-500/25 h-11 px-6 flex items-center justify-center gap-2 border border-amber-300">
                <GraduationCap className="h-4 w-4" />
                <span>Apri Sezione Master</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Fascicolo Sanzioni / Situazione Disciplinare */}
      {hasEmployeeAccess && <PersonalDisciplinaryStatus userSanctions={userSanctions} />}

      {/* Gruppi Telegram & Canali Staff Riservati (Normal position if pending) */}
      {hasEmployeeAccess && !allGroupsJoined && (
        <TelegramStaffGroupsSection profile={profile} onAllJoinedChange={setAllGroupsJoined} />
      )}

      {/* Features Section */}
      {hasEmployeeAccess ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white uppercase">
              Le tue funzionalità abilitate
            </h2>
            <p className="text-slate-400 text-xs mt-1">
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
                  className="group bg-[#12141c] border-slate-800/90 hover:border-amber-500/50 transition-all flex flex-col justify-between overflow-hidden shadow-2xl rounded-2xl"
                >
                  <CardHeader className="space-y-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center transition-transform group-hover:scale-110">
                        <Icon className="h-5 w-5" />
                      </div>
                      {f.adminOnly && (
                        <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px] uppercase font-bold">
                          Amministratore
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <CardTitle className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                        {f.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 text-slate-400 text-xs">
                        {f.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0 flex-1 flex flex-col justify-between">
                    {/* Active Permissions List */}
                    <div className="space-y-2 border-t border-slate-800/80 pt-4">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Le tue abilitazioni:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activePerms.length > 0 ? (
                          activePerms.map((label, idx) => (
                            <Badge
                              key={idx}
                              className="bg-[#0a0b10] border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 font-semibold"
                            >
                              {label}
                            </Badge>
                          ))
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-slate-800 text-[10px] px-2 py-0.5 text-slate-500"
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
      ) : (
        <div className="space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="font-black text-sm text-white uppercase tracking-wider">
                  Gestionale Riservato allo Staff
                </div>
                <p className="text-slate-400 text-xs">
                  Il pannello di gestione interna è riservato esclusivamente agli utenti con un
                  ruolo staff personalizzato autorizzato. La tua Scheda Cittadino ufficiale è
                  consultabile direttamente sul sito.
                </p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shrink-0 rounded-xl px-5 h-9"
            >
              <Link to="/scheda-cittadino">
                Vai alla Scheda Cittadino
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white uppercase">
              I tuoi servizi cittadini
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Accedi alle sezioni dedicate ai clienti e cittadini del Casinò Revenge
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="group bg-[#12141c] border-slate-800/90 hover:border-amber-500/50 transition-all flex flex-col justify-between overflow-hidden shadow-2xl rounded-2xl">
              <CardHeader className="space-y-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Users className="h-5 w-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 text-amber-300 text-[10px] uppercase font-bold"
                  >
                    Tessera Ufficiale
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <CardTitle className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                    La Mia Scheda Cittadino
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-slate-400 text-xs">
                    Consulta la tua anagrafica, i tuoi dati di gioco, il saldo conversioni in
                    Dobloni, le consumazioni e la cassetta di sicurezza.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  asChild
                  size="sm"
                  className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl"
                >
                  <Link to="/scheda-cittadino" className="flex items-center justify-center gap-1.5">
                    Apri Scheda Cittadino
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="group bg-[#12141c] border-slate-800/90 hover:border-emerald-500/50 transition-all flex flex-col justify-between overflow-hidden shadow-2xl rounded-2xl">
              <CardHeader className="space-y-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-300 text-[10px] uppercase font-bold"
                  >
                    Reclutamento
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <CardTitle className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                    Candidature Staff
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-slate-400 text-xs">
                    Invia la tua candidatura per entrare a far parte della Ciurma e dello staff del
                    Casinò.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  asChild
                  size="sm"
                  className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  <Link to="/candidature" className="flex items-center justify-center gap-1.5">
                    Invia Candidatura
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="group bg-[#12141c] border-slate-800/90 hover:border-sky-500/50 transition-all flex flex-col justify-between overflow-hidden shadow-2xl rounded-2xl">
              <CardHeader className="space-y-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center transition-transform group-hover:scale-110">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className="border-sky-500/30 text-sky-300 text-[10px] uppercase font-bold"
                  >
                    Info & Ciurma
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <CardTitle className="text-lg font-bold text-white group-hover:text-sky-400 transition-colors">
                    La Ciurma & Staff
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-slate-400 text-xs">
                    Visualizza i membri della Ciurma, la gerarchia del Casinò e i dettagli
                    informativi.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="w-full mt-4 border-sky-500/30 text-sky-300 hover:bg-sky-500/10 rounded-xl"
                >
                  <Link to="/ciurma" className="flex items-center justify-center gap-1.5">
                    Vedi Ciurma
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Gruppi Telegram & Canali Staff Riservati (Moved to bottom if user is inside ALL groups) */}
      {allGroupsJoined && (
        <TelegramStaffGroupsSection profile={profile} onAllJoinedChange={setAllGroupsJoined} />
      )}

      {isAdmin && (
        <Card className="border-amber-500/30 bg-amber-500/5 max-w-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" /> Pannello Amministratore ·
              Manutenzione
            </CardTitle>
            <CardDescription>
              Attivando la modalità manutenzione, tutti gli operatori non amministratori verranno
              reindirizzati alla pagina di cortesia. Solo gli amministratori manterranno l'accesso
              completo e l'autorizzazione alle operazioni di scrittura.
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
  if (userSanctions.length === 0) {
    return (
      <Card className="border-emerald-500/30 bg-card/90 shadow-sm rounded-xl overflow-hidden relative">
        <div className="absolute right-0 top-0 -translate-y-6 translate-x-6 h-32 w-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-white">
                  Situazione Disciplinare Impeccabile
                </CardTitle>
                <CardDescription className="text-xs text-slate-300">
                  Nessun provvedimento o avvertimento presente nel tuo storico.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold rounded-full">
                In Regola
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 pb-4 relative z-10">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-slate-200">
              <strong className="text-emerald-400 font-semibold">Condotta eccellente!</strong> Non
              hai mai ricevuto avvertimenti o sanzioni disciplinari.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

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

function TelegramStaffGroupsSection({
  profile,
  onAllJoinedChange,
}: {
  profile: any;
  onAllJoinedChange?: (allJoined: boolean) => void;
}) {
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const {
    data: groupsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["user-telegram-groups", profile?.id],
    queryFn: async () => {
      return await getUserTelegramGroups();
    },
    enabled: !!profile?.id,
    staleTime: 30000,
  });

  const groups: any[] = Array.isArray(groupsData) ? groupsData : (groupsData as any)?.groups || [];
  const telegramUsername =
    profile?.telegram_username ||
    profile?.telegram_handle ||
    (groupsData as any)?.userTelegramUsername;
  const isTelegramLinked = !!profile?.telegram_connected || !!telegramUsername;

  const allGroupsJoined =
    groups.length > 0 && groups.every((grp: any) => grp.isMember || grp.isInside);

  useEffect(() => {
    if (onAllJoinedChange) {
      onAllJoinedChange(allGroupsJoined);
    }
  }, [allGroupsJoined, onAllJoinedChange]);

  const generateMutation = useMutation({
    mutationFn: async (groupId: string) => {
      setGeneratingFor(groupId);
      return await generateGroupInviteLink({ data: { groupId } });
    },
    onSuccess: (res, groupId) => {
      if (res?.inviteLink) {
        setGeneratedLinks((prev) => ({ ...prev, [groupId]: res.inviteLink }));
        toast.success("Link d'invito Telegram generato con successo!");
      }
      setGeneratingFor(null);
    },
    onError: (e: any) => {
      toast.error(e.message || "Errore nella generazione del link d'invito");
      setGeneratingFor(null);
    },
  });

  const copyLink = async (link: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = link;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success("Link copiato negli appunti!");
    } catch {
      toast.info(`Link d'invito: ${link}`);
    }
  };

  if (isLoading) {
    return null;
  }

  if (groups.length === 0 && !isTelegramLinked) {
    return null;
  }

  return (
    <Card className="border-sky-500/30 bg-gradient-to-br from-sky-950/20 via-slate-900/60 to-slate-950/80 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <CardHeader className="pb-3 border-b border-sky-500/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                Gruppi Telegram Staff & Canali Riservati
                <Badge
                  variant="outline"
                  className="border-sky-500/30 text-sky-400 bg-sky-500/10 text-[10px]"
                >
                  {groups.length}{" "}
                  {groups.length === 1 ? "gruppo accessibile" : "gruppi accessibili"}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                In base ai tuoi ruoli sul portale hai diritto ad accedere ai seguenti gruppi
                Telegram.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTelegramLinked ? (
              <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-xs px-2.5 py-1">
                <Check className="h-3 w-3 mr-1 text-emerald-400" />@
                {telegramUsername.replace("@", "")}
              </Badge>
            ) : (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs px-2.5 py-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Telegram non collegato
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {allGroupsJoined && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-xs text-emerald-200">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-emerald-300 text-sm">
                ✅ Accesso Completo: Sei presente in tutti i gruppi Telegram abilitati!
              </p>
              <p className="text-[11px] text-emerald-400/80 mt-0.5">
                Risulti già all'interno di tutti i gruppi riservati ai tuoi ruoli. Disponi
                dell'autorizzazione e di tutti i permessi operativi attivi.
              </p>
            </div>
          </div>
        )}
        {!isTelegramLinked && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs text-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Collega il tuo account Telegram per l'accesso automatico
              </p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Il Bot Telegram verificherà la tua identità (tramite il tuo{" "}
                <strong>@username</strong>) non appena entrerai nel gruppo. Se il tuo username non è
                registrato sul tuo profilo, potresti non essere riconosciuto.
              </p>
            </div>
          </div>
        )}

        {groups.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            Al momento non sei abilitato a nessun gruppo Telegram in base ai tuoi ruoli correnti.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((grp: any) => {
              const inviteLink = generatedLinks[grp.id] || grp.lastInviteLink;
              const isMember = grp.isMember || grp.isInside;

              return (
                <div
                  key={grp.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isMember
                      ? "bg-slate-900/70 border-emerald-500/30"
                      : "bg-slate-900/90 border-slate-800 hover:border-sky-500/40"
                  } flex flex-col justify-between gap-3`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          {grp.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          ID: {grp.chat_id}
                        </p>
                      </div>
                      {isMember ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-bold shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Membro Verificato
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-[10px] shrink-0"
                        >
                          Non ancora dentro
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 text-[11px] text-slate-400">
                      {isMember ? (
                        <p className="text-emerald-400/90 font-medium">
                          ✅ Sei già presente nel gruppo con il tuo account Telegram. L'accesso è
                          attivo e verificato.
                        </p>
                      ) : (
                        <p>
                          Genera un link monouso personale per entrare. Una volta entrato, il bot ti
                          confermerà automaticamente e l'accesso risulterà registrato.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
                    {/* If user is ALREADY A MEMBER: no invite generation is allowed under any circumstances */}
                    {isMember ? (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Accesso Confermato · Sei già nel gruppo</span>
                      </div>
                    ) : (
                      <>
                        {inviteLink ? (
                          <div className="p-2 bg-slate-950/80 border border-sky-500/20 rounded-lg flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono text-sky-300 truncate select-all">
                              {inviteLink}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-slate-300 hover:text-white"
                                onClick={() => copyLink(inviteLink)}
                                title="Copia link"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <a
                                href={inviteLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-7 px-2 text-[11px] font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-md transition-colors"
                              >
                                Entra <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full border-sky-500/40 text-sky-300 hover:bg-sky-500/15 hover:text-sky-200 text-xs h-8"
                            disabled={generatingFor === grp.id}
                            onClick={() => generateMutation.mutate(grp.id)}
                          >
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                            {generatingFor === grp.id
                              ? "Generazione in corso..."
                              : "Genera Link di Invito"}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 flex items-center justify-between gap-2">
          <span>
            💡 <em>Controllo automatico:</em> Ogni giorno alle <strong>17:00</strong> il sistema
            verifica automaticamente la corrispondenza tra i ruoli e la presenza nei gruppi
            Telegram. Se perdi il ruolo o lasci lo staff, verrai rimosso dai gruppi associati.
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="text-[10px] h-6 px-2 text-slate-400 hover:text-white shrink-0"
            onClick={() => refetch()}
          >
            Aggiorna stato
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
