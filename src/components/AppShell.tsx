import { useState, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { requestTelegramVerificationCode, verifyTelegramCode } from "@/lib/registration.functions";
import { TelegramVerificationGuard } from "@/components/TelegramVerificationGuard";
import { toast } from "sonner";
import {
  Users,
  CalendarDays,
  Tag,
  Trophy,
  Lock,
  ShieldCheck,
  UserCog,
  LogOut,
  Clock,
  ArrowLeftRight,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  UserCheck,
  Palmtree,
  History,
  Sparkles,
  Banknote,
  Send,
  MessageCircle,
  ExternalLink,
  Globe,
  Anchor,
  Check,
  Copy,
  ClipboardList,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cittadini", label: "Cittadini", icon: Users },
  { to: "/candidature", label: "Candidature", icon: ClipboardList },
  { to: "/serate", label: "Serate", icon: CalendarDays },
  { to: "/conversioni", label: "Conversioni", icon: ArrowLeftRight },
  { to: "/servizi", label: "Catalogo Servizi", icon: Tag },
  { to: "/eventi", label: "Gestione Eventi", icon: Sparkles },
  // { to: "/badge", label: "Badge & Timbrature", icon: Clock },
  { to: "/dipendenti", label: "Dipendenti", icon: UserCheck },
  { to: "/stipendi", label: "Stipendi & Payroll", icon: Banknote },
  { to: "/congedi", label: "Congedi", icon: Palmtree },
  { to: "/attivita", label: "Registro Attività", icon: History, adminOnly: true },
  { to: "/utenti", label: "Utenti", icon: UserCog, adminOnly: true },
  { to: "/ruoli", label: "Ruoli & Permessi", icon: ShieldCheck, adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    profile,
    isAdmin,
    customRoleNames,
    activeSuspension,
    activeLeave,
    permissions = [],
    loading,
  } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const [bypassedLeave, setBypassedLeave] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("bypassed-leave") === "true";
    }
    return false;
  });

  const handleBypass = () => {
    setBypassedLeave(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("bypassed-leave", "true");
    }
  };

  const { data: maintenanceData } = useQuery({
    queryKey: ["maintenance-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("maintenance_settings")
        .select("*")
        .eq("id", "global")
        .maybeSingle();
      return data ?? null;
    },
    refetchInterval: 60000,
  });

  const isMaintenanceActive = !!maintenanceData?.is_maintenance;

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "1";
  });

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const nv = !c;
      if (typeof window !== "undefined") localStorage.setItem("sidebar-collapsed", nv ? "1" : "0");
      return nv;
    });
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const isStaffMember =
    isAdmin ||
    permissions.length > 0 ||
    customRoleNames.length > 0 ||
    profile?.has_employee_access === true ||
    !!profile?.show_in_staff_list;

  const items = NAV.filter((n) => {
    if (isAdmin) return true;
    if (n.adminOnly) return false;

    if (n.to === "/dashboard") {
      return true;
    }
    if (n.to === "/cittadini") {
      return true;
    }
    if (n.to === "/candidature") {
      return true;
    }

    // Citizen-only without employee access cannot view internal employee tools
    if (!isStaffMember) {
      return false;
    }

    if (n.to === "/serate") {
      return (
        permissions.includes("serate.crea") ||
        permissions.includes("serate.gestisci") ||
        permissions.includes("serate.consulta") ||
        permissions.includes("serate.incassi")
      );
    }
    if (n.to === "/conversioni") {
      return (
        permissions.includes("conversioni.esegui") || permissions.includes("conversioni.storico")
      );
    }
    if (n.to === "/servizi") {
      return permissions.includes("servizi.read");
    }
    if (n.to === "/eventi") {
      return permissions.includes("eventi.gestisci");
    }
    if (n.to === "/corse-cavalli") {
      return permissions.includes("corse.read");
    }
    if (n.to === "/badge") {
      return (
        permissions.includes("badge.timbra") ||
        permissions.includes("badge.visualizza") ||
        permissions.includes("badge.settimane") ||
        permissions.includes("badge.gestisci")
      );
    }
    if (n.to === "/dipendenti") {
      return (
        permissions.includes("badge.visualizza") || permissions.includes("dipendenti.sanzioni")
      );
    }
    if (n.to === "/stipendi") {
      return (
        permissions.includes("stipendi.visualizza") || permissions.includes("stipendi.gestisci")
      );
    }
    if (n.to === "/congedi") {
      return true; // accessible to any logged in employee
    }
    return true;
  }).map((n) => {
    if (n.to === "/cittadini") {
      return {
        ...n,
        label: isStaffMember ? "Anagrafica Cittadini" : "Pannello Cittadino",
      };
    }
    return n;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Verifica credenziali...</p>
        </div>
      </div>
    );
  }

  // Telegram Verification Enforcer: forces user to link & verify Telegram before accessing panel
  if (profile && (!profile.telegram_connected || !profile.telegram_handle)) {
    return <TelegramVerificationGuard profile={profile} signOut={signOut} />;
  }

  // 1. Check if user is trying to access an internal employee-only route without employee access
  const isCitizenOnly = !isStaffMember;
  const isAllowedCitizenRoute =
    path === "/cittadini" ||
    path === "/candidature" ||
    path === "/dashboard" ||
    path === "/" ||
    path.startsWith("/candidature");

  if (isCitizenOnly && !isAllowedCitizenRoute) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-2xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          <div className="flex flex-col items-center text-center space-y-3">
            <img
              src={`https://mc-heads.net/avatar/${encodeURIComponent(profile?.username || "Steve")}/80`}
              alt="Avatar Minecraft"
              className="h-20 w-20 rounded-xl border-2 border-amber-500/50 shadow-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://minotar.net/helm/Steve/80.png";
              }}
            />
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase mt-2">
              Area Riservata allo Staff
            </h1>
            <p className="text-sm text-slate-400">
              Benvenuto,{" "}
              <strong className="text-amber-400">
                {profile?.display_name || profile?.username}
              </strong>
              !
            </p>
          </div>

          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              Questa sezione interna è riservata ai dipendenti del Casinò. Come cittadino
              registrato, puoi consultare la tua <strong>Tessera & Storico</strong> o inviare una{" "}
              <strong>Candidatura</strong> per entrare nello Staff.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              onClick={() => navigate({ to: "/cittadini" })}
            >
              Apri il tuo Pannello Cittadino
            </Button>
            <Button
              variant="outline"
              className="w-full border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
              onClick={() => navigate({ to: "/candidature" })}
            >
              Invia una Candidatura Staff
            </Button>
            <Button
              variant="ghost"
              className="w-full text-slate-400 hover:text-white text-xs"
              onClick={() => navigate({ to: "/" })}
            >
              Torna alla Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Maintenance Mode check (for staff members)
  if (isMaintenanceActive && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-2xl p-8 space-y-6 shadow-2xl shadow-amber-500/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center animate-pulse">
              <span className="text-3xl">⚙️</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
              Modalità Manutenzione
            </h1>
            <p className="text-sm text-slate-400">
              Il pannello è attualmente in manutenzione per l'aggiornamento dei sistemi.
            </p>
          </div>

          <div className="border-t border-slate-800 pt-5 space-y-4 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400 font-medium">Stato:</span>
              <span className="font-semibold text-amber-400 uppercase">Manutenzione Attiva</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400 font-medium">Nota:</span>
              <span className="font-semibold text-slate-200 text-right">
                Il tuo account non è stato ristretto
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white" onClick={signOut}>
              Scollegati
            </Button>
            <p className="text-[10px] text-center text-slate-500">
              Torna più tardi quando la manutenzione sarà completata.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (activeSuspension) {
    const isPermanent = activeSuspension.type === "espulsione" || !activeSuspension.expires_at;
    const expiryDate = activeSuspension.expires_at
      ? new Date(activeSuspension.expires_at).toLocaleString("it-IT", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 space-y-6 shadow-2xl shadow-red-500/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />

          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center animate-pulse">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
              {activeSuspension.type === "espulsione"
                ? "Espulsione Permanente"
                : "Sospensione Attiva"}
            </h1>
            <p className="text-sm text-slate-400">
              Il tuo account è temporaneamente o permanentemente sospeso dall'accesso al gestionale.
            </p>
          </div>

          <div className="border-t border-slate-800 pt-5 space-y-4 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400 font-medium">Stato:</span>
              <span className="font-semibold text-red-400 uppercase">
                {activeSuspension.type === "espulsione" ? "Espulso dalla Ciurma" : "Sospeso"}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400 font-medium">Assegnata da:</span>
              <span className="font-semibold text-slate-200">
                {activeSuspension.created_by_name || "Amministratore"}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400 font-medium">Scadenza:</span>
              <span className="font-semibold text-slate-200">
                {isPermanent ? "Permanente" : expiryDate}
              </span>
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-slate-400 font-medium block">Motivazione sanzione:</span>
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-300 italic text-xs leading-relaxed">
                "{activeSuspension.reason || "Nessuna sanzione specificata."}"
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={signOut}>
              Scollegati
            </Button>
            <p className="text-[10px] text-center text-slate-500">
              Contatta un amministratore o il Vice Capitano se ritieni che si tratti di un errore.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (activeLeave && !bypassedLeave) {
    const startDateFormatted = new Date(activeLeave.start_date).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const endDateFormatted = new Date(activeLeave.end_date).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-2xl p-8 space-y-6 shadow-2xl shadow-amber-500/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center animate-pulse">
              <span className="text-3xl">🌴</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase">In Congedo</h1>
            <p className="text-sm text-slate-400">
              Il tuo account è temporaneamente in congedo approvato.
            </p>
          </div>

          <div className="border-t border-slate-800 pt-5 space-y-4 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400 font-medium">Stato:</span>
              <span className="font-semibold text-amber-400 uppercase">Congedo Attivo</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400 font-medium">Periodo:</span>
              <span className="font-semibold text-slate-200">
                Dal {startDateFormatted} al {endDateFormatted}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400 font-medium">Approvato da:</span>
              <span className="font-semibold text-slate-200">
                {activeLeave.approved_by_name || "Amministratore"}
              </span>
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-slate-400 font-medium block">Motivazione congedo:</span>
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-300 italic text-xs leading-relaxed">
                "{activeLeave.reason || "Nessuna motivazione specificata."}"
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {isAdmin && (
              <Button
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold"
                onClick={handleBypass}
              >
                Bypass (Amministratore)
              </Button>
            )}
            <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white" onClick={signOut}>
              Scollegati
            </Button>
            <p className="text-[10px] text-center text-slate-500">
              Il tuo accesso verrà ripristinato automaticamente al termine del periodo di congedo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Enforce Telegram Bot Verification if not connected
  if (
    profile &&
    (!profile.telegram_connected ||
      !profile.telegram_handle ||
      profile.telegram_handle.trim() === "")
  ) {
    return <TelegramVerificationGuard profile={profile} signOut={signOut} />;
  }

  return (
    <div className="min-h-screen flex">
      <aside
        className={cn(
          "shrink-0 hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-200",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div
          className={cn(
            "border-b border-sidebar-border flex items-center",
            collapsed ? "px-2 py-4 justify-center" : "px-4 py-4 justify-between",
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black text-sm shrink-0 shadow-inner">
                ◆
              </div>
              <div className="min-w-0">
                <div className="font-extrabold leading-tight text-amber-400 tracking-wider text-xs uppercase truncate">
                  GESTIONALE
                </div>
                <div className="text-[10px] font-bold text-slate-400 truncate tracking-widest uppercase">
                  ROLEPLAY
                </div>
              </div>
            </div>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleCollapsed}
            title={collapsed ? "Espandi" : "Riduci"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {/* Quick link back to public homepage & guide */}
          <Link
            to="/"
            title={collapsed ? "Torna alla Guida / Sito" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md text-sm font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors mb-3",
              collapsed ? "justify-center h-10 w-full" : "px-3 py-2",
            )}
          >
            <Globe className="h-4 w-4 shrink-0 text-amber-500" />
            {!collapsed && <span className="truncate">🌐 Torna alla Guida</span>}
          </Link>

          <Link
            to="/ciurma"
            title={collapsed ? "La nostra Ciurma" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md text-sm font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20 hover:bg-sky-500/20 transition-colors mb-3",
              collapsed ? "justify-center h-10 w-full" : "px-3 py-2",
            )}
          >
            <Anchor className="h-4 w-4 shrink-0 text-sky-400" />
            {!collapsed && <span className="truncate">⚓ La nostra Ciurma</span>}
          </Link>

          <div className="pt-1 pb-1 border-t border-sidebar-border/50" />

          {items.map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                title={collapsed ? n.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                  collapsed ? "justify-center h-10 w-full" : "px-3.5 py-2.5",
                  active
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#12141c]",
                )}
              >
                <Icon
                  className={cn("h-4 w-4 shrink-0", active ? "text-amber-400" : "text-slate-500")}
                />
                {!collapsed && <span className="truncate">{n.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-4")}>
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <img
                  src={`https://mc-heads.net/avatar/${encodeURIComponent(profile?.username || "Steve")}/40`}
                  alt="Skin Minecraft"
                  className="h-10 w-10 rounded-lg border border-amber-500/40 object-cover shrink-0 shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://minotar.net/helm/Steve/40.png";
                  }}
                />
                <div className="text-sm min-w-0 flex-1">
                  <div className="font-semibold truncate text-slate-100">
                    {profile?.display_name ?? profile?.username}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    {isAdmin && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                        Admin
                      </Badge>
                    )}
                    {customRoleNames.map((n) => (
                      <Badge key={n} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {n}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
                <LogOut className="h-4 w-4" /> Esci
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="icon" className="w-full" onClick={signOut} title="Esci">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar/60 backdrop-blur">
          <div className="font-semibold text-primary flex items-center gap-2">
            <span>Revenge</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
              Pannello
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button
                size="sm"
                variant="outline"
                className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-300 h-8 px-2.5"
              >
                <Globe className="h-3.5 w-3.5 mr-1" /> Guida
              </Button>
            </Link>
            <Link to="/ciurma">
              <Button
                size="sm"
                variant="outline"
                className="text-xs bg-sky-500/10 border-sky-500/30 text-sky-300 h-8 px-2.5"
              >
                <Anchor className="h-3.5 w-3.5 mr-1" /> Ciurma
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut} className="h-8 px-2">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="md:hidden overflow-x-auto border-b border-border">
          <div className="flex gap-1 px-2 py-2">
            {items.map((n) => {
              const active = path === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "text-xs whitespace-nowrap rounded px-3 py-1.5",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
