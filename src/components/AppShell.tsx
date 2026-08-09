import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
      return data;
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

  const items = NAV.filter((n) => {
    if (isAdmin) return true;
    if (n.adminOnly) return false;

    if (n.to === "/cittadini") {
      return permissions.includes("cittadini.read");
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
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center font-bold shrink-0">
                ♠
              </div>
              <div className="min-w-0">
                <div className="font-semibold leading-tight text-primary truncate">Revenge</div>
                <div className="text-xs text-muted-foreground truncate">Pannello gestione</div>
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
          {items.map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                title={collapsed ? n.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md text-sm transition-colors",
                  collapsed ? "justify-center h-10 w-full" : "px-3 py-2",
                  active
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{n.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-4")}>
          {!collapsed ? (
            <div className="space-y-2">
              <div className="text-sm">
                <div className="font-medium truncate">
                  {profile?.display_name ?? profile?.username}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {isAdmin && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                      Amministratore
                    </Badge>
                  )}
                  {customRoleNames.map((n) => (
                    <Badge key={n} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {n}
                    </Badge>
                  ))}
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
          <div className="font-semibold text-primary">Revenge</div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
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
