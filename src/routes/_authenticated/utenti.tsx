import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  KeyRound,
  Trash2,
  Shield,
  ShieldOff,
  Pencil,
  AlertTriangle,
  Ban,
  Skull,
  Clock,
  History,
  Check,
  X,
  Calendar,
  Search,
  Database,
  ChevronDown,
  ChevronUp,
  Info,
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  Unlink,
  Wifi,
  Globe,
  RefreshCw,
  Power,
  LogOut,
  Radio,
  Crown,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  createPanelUser,
  updatePanelUser,
  resetPanelUserPassword,
  deletePanelUser,
  setUserAdmin,
  assignCustomRole,
  applySanction,
  updateSanction,
  deleteSanctionCompletely,
} from "@/lib/admin.functions";
import {
  getConnectedDevices,
  disconnectDevice,
  disconnectAllUserDevices,
} from "@/lib/registration.functions";

export const Route = createFileRoute("/_authenticated/utenti")({
  beforeLoad: async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) throw redirect({ to: "/auth" });
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (!roles?.some((r) => r.role === "admin")) throw redirect({ to: "/cittadini" });
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/auth" });
    }
  },
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const createFn = useServerFn(createPanelUser);
  const updateFn = useServerFn(updatePanelUser);
  const resetFn = useServerFn(resetPanelUserPassword);
  const delFn = useServerFn(deletePanelUser);
  const adminFn = useServerFn(setUserAdmin);
  const assignFn = useServerFn(assignCustomRole);
  const updateSanctionFn = useServerFn(updateSanction);
  const getDevicesFn = useServerFn(getConnectedDevices);
  const disconnectFn = useServerFn(disconnectDevice);
  const disconnectAllFn = useServerFn(disconnectAllUserDevices);

  const [activeTab, setActiveTab] = useState<"utenti" | "dispositivi">("utenti");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [rolesTarget, setRolesTarget] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");
  const [deviceFilterStatus, setDeviceFilterStatus] = useState<"all" | "active" | "revoked">("all");
  const [activityTarget, setActivityTarget] = useState<any>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", description: "", onConfirm: () => {} });

  const {
    data: devices = [],
    refetch: refetchDevices,
    isFetching: isFetchingDevices,
  } = useQuery({
    queryKey: ["connected-devices"],
    queryFn: async () => {
      return await getDevicesFn();
    },
    enabled: activeTab === "dispositivi",
    refetchInterval: activeTab === "dispositivi" ? 5000 : false,
  });

  const { data: sanctions = [], refetch: refetchSanctions } = useQuery<any[]>({
    queryKey: ["all-sanctions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sanctions").select("*");
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  const activeExpulsionsMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of sanctions) {
      if (s.is_active && s.type === "espulsione") {
        map.set(s.user_id, s);
      }
    }
    return map;
  }, [sanctions]);

  const handleRemoveExpulsion = async (userId: string) => {
    const s = activeExpulsionsMap.get(userId);
    if (!s) return;
    try {
      await updateSanctionFn({
        data: {
          sanctionId: s.id,
          isActive: false,
        },
      });
      toast.success("Sanzione di espulsione rimossa con successo!");
      refetchSanctions();
      qc.invalidateQueries({ queryKey: ["panel-users"] });
      qc.invalidateQueries({ queryKey: ["all-sanctions"] });
    } catch (err: any) {
      toast.error(err.message || "Errore nella rimozione dell'espulsione");
    }
  };

  const handleDisconnect = async (userId?: string, sessionId?: string) => {
    try {
      await disconnectFn({ data: { userId, sessionId, deviceId: sessionId } });
      toast.success("Sessione/Dispositivo disconnesso con successo.");
      refetchDevices();
    } catch (err: any) {
      toast.error("Errore nella disconnessione: " + err.message);
    }
  };

  const handleDisconnectAll = async (userId: string, username: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: `Disconnetti tutte le sessioni di ${username}`,
      description: `Sei sicuro di voler revocare tutte le sessioni attive per ${username}? L'utente verrà disconnesso forzatamente da tutti i suoi dispositivi.`,
      onConfirm: async () => {
        try {
          await disconnectAllFn({ data: { userId } });
          toast.success(`Tutte le sessioni di ${username} sono state revocate.`);
          refetchDevices();
        } catch (err: any) {
          toast.error("Errore nella disconnessione di massa: " + err.message);
        }
      },
    });
  };

  const filteredDevices = useMemo(() => {
    return devices.filter((dev: any) => {
      const q = deviceSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (dev.username || "").toLowerCase().includes(q) ||
        (dev.displayName || "").toLowerCase().includes(q) ||
        (dev.browser || "").toLowerCase().includes(q) ||
        (dev.ipAddress || "").toLowerCase().includes(q);

      const matchStatus =
        deviceFilterStatus === "all" ||
        (deviceFilterStatus === "active" && !dev.isRevoked) ||
        (deviceFilterStatus === "revoked" && dev.isRevoked);

      return matchSearch && matchStatus;
    });
  }, [devices, deviceSearch, deviceFilterStatus]);

  const deviceStats = useMemo(() => {
    const activeList = devices.filter((d: any) => !d.isRevoked);
    const desktops = activeList.filter(
      (d: any) => (d.deviceType || "desktop") === "desktop",
    ).length;
    const mobiles = activeList.filter(
      (d: any) => d.deviceType === "mobile" || d.deviceType === "tablet",
    ).length;
    const uniqueUsers = new Set(activeList.map((d: any) => d.userId)).size;

    return {
      total: devices.length,
      active: activeList.length,
      revoked: devices.length - activeList.length,
      desktops,
      mobiles,
      uniqueUsers,
    };
  }, [devices]);

  // Query modificata per estrarre correttamente i dati uniti dal client
  const { data: users = [] } = useQuery({
    queryKey: ["panel-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select(`
          *,
          user_roles (role),
          custom_roles (id, name)
        `);

      if (error) {
        console.error("Errore nel caricamento utenti:", error);
        throw error;
      }

      // Adattiamo i dati al formato richiesto dal frontend (.includes e .length)
      return (data ?? []).map((u: any) => ({
        ...u,
        roles: u.user_roles ? u.user_roles.map((r: any) => r.role) : [],
        custom_roles: u.custom_roles ?? [],
      }));
    },
  });

  const { data: customRoles = [] } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("custom_roles").select("*").order("name");
      return data ?? [];
    },
  });

  const filteredUsers = useMemo(() => {
    return users.filter((u: any) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;

      const username = (u.username ?? "").toLowerCase();
      const displayName = (u.display_name ?? "").toLowerCase();
      const roleStr = u.roles?.includes("admin") ? "admin" : "operatore";
      const customRolesStr = (u.custom_roles ?? []).map((r: any) => r.name.toLowerCase()).join(" ");

      return (
        username.includes(q) ||
        displayName.includes(q) ||
        roleStr.includes(q) ||
        customRolesStr.includes(q)
      );
    });
  }, [users, search]);

  return (
    <div className="space-y-8 py-2">
      {/* Title Section (Roleplay Theme) */}
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
          GESTIONE UTENTI, ACCESSI STAFF, DISPOSITIVI E SESSIONI
        </p>
      </div>

      {/* Control Header Box */}
      <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="bg-[#0a0b10] border border-slate-800 p-1 rounded-xl flex items-center gap-1 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("utenti")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all ${
                activeTab === "utenti"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Gestione Utenti ({users.length})
            </button>
            <button
              onClick={() => setActiveTab("dispositivi")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "dispositivi"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Laptop className="h-3.5 w-3.5" /> Sessioni & Dispositivi
            </button>
          </div>

          {activeTab === "utenti" && (
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider shadow-lg shadow-amber-500/10 w-full sm:w-auto"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Nuovo utente
            </Button>
          )}
        </div>
      </div>

      {activeTab === "utenti" ? (
        <>
          <div className="flex items-center gap-2 max-w-sm border border-border bg-card rounded-lg px-3 py-1.5 shadow-sm">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Cerca per username, nome o ruolo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2.5 px-3 h-auto">Username</TableHead>
                    <TableHead className="py-2.5 px-3 h-auto">Telegram</TableHead>
                    <TableHead className="py-2.5 px-3 h-auto">Accesso Pannello</TableHead>
                    <TableHead className="py-2.5 px-3 h-auto">Ciurma / Staff</TableHead>
                    <TableHead className="py-2.5 px-3 h-auto">Ruolo</TableHead>
                    <TableHead className="py-2.5 px-3 h-auto">Ruoli personalizzati</TableHead>
                    <TableHead className="py-2.5 px-3 h-auto w-56"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                        Nessun utente trovato
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono py-2 px-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={`https://mc-heads.net/avatar/${encodeURIComponent(u.username || "Steve")}/24`}
                              alt="Head"
                              className="h-6 w-6 rounded border border-amber-500/30 object-cover shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://minotar.net/helm/Steve/24.png";
                              }}
                            />
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-white">{u.username}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {u.display_name ?? "-"}
                              </span>
                              {activeExpulsionsMap.has(u.id) && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold uppercase tracking-wider w-fit">
                                  <Skull className="h-3 w-3 animate-pulse" /> Espulso Permanente
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-3 font-mono text-xs">
                          {u.telegram_handle ? (
                            <span className="text-sky-400 font-semibold">{u.telegram_handle}</span>
                          ) : (
                            <span className="text-red-400 text-[11px] italic">Non impostato</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          {u.has_employee_access ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              Abilitato
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 text-amber-400 bg-amber-500/10"
                            >
                              Cliente / Attesa
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          {u.show_in_staff_list ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-3 w-3 rounded-full shrink-0 border border-white/20"
                                style={{ backgroundColor: u.staff_color || "#3b82f6" }}
                              />
                              <span className="text-xs font-semibold text-slate-200">
                                Peso: {u.staff_weight ?? 50}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Nascosto</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          {u.roles?.includes("admin") ? (
                            <Badge className="bg-primary">Admin</Badge>
                          ) : (
                            <Badge variant="secondary">Operatore</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2 px-3">
                          {u.custom_roles?.length === 0
                            ? "—"
                            : u.custom_roles?.map((r: any) => r.name).join(", ")}
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <div className="flex gap-1 justify-end flex-wrap">
                            {activeExpulsionsMap.has(u.id) && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 px-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                                onClick={() => handleRemoveExpulsion(u.id)}
                              >
                                <X className="h-3.5 w-3.5 mr-1" /> Rimuovi Espulsione
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-indigo-400 border-indigo-900/40 hover:bg-indigo-950/20 hover:text-indigo-300 font-semibold"
                              onClick={() => setActivityTarget(u)}
                            >
                              <History className="h-3.5 w-3.5 mr-1" /> Attività
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                              onClick={() => setEditTarget(u)}
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Modifica
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                              onClick={() => setRolesTarget(u)}
                            >
                              Ruoli
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                              onClick={() => setResetTarget(u)}
                            >
                              <KeyRound className="h-3 w-3" /> Reset
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title={
                                u.roles?.includes("admin") ? "Rimuovi admin" : "Promuovi ad admin"
                              }
                              onClick={async () => {
                                await adminFn({
                                  data: { userId: u.id, admin: !u.roles?.includes("admin") },
                                });
                                qc.invalidateQueries({ queryKey: ["panel-users"] });
                                toast.success("Aggiornato");
                              }}
                            >
                              {u.roles?.includes("admin") ? (
                                <ShieldOff className="h-4 w-4" />
                              ) : (
                                <Shield className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() =>
                                setDeleteConfirm({
                                  isOpen: true,
                                  title: "Elimina utente",
                                  description: `Sei sicuro di voler eliminare DEFINITIVAMENTE l'utente "${u.username}"? Questa azione rimuoverà il suo account di accesso.`,
                                  onConfirm: async () => {
                                    try {
                                      await delFn({ data: { userId: u.id } });
                                      qc.invalidateQueries({ queryKey: ["panel-users"] });
                                      qc.invalidateQueries({ queryKey: ["profiles"] });
                                      toast.success("Eliminato");
                                    } catch (e: any) {
                                      try {
                                        await supabase.from("profiles").delete().eq("id", u.id);
                                        await supabase
                                          .from("user_roles")
                                          .delete()
                                          .eq("user_id", u.id);
                                        await supabase
                                          .from("user_custom_roles")
                                          .delete()
                                          .eq("user_id", u.id);
                                        await supabase
                                          .from("sanctions")
                                          .delete()
                                          .eq("user_id", u.id);
                                        qc.invalidateQueries({ queryKey: ["panel-users"] });
                                        qc.invalidateQueries({ queryKey: ["profiles"] });
                                        toast.success("Eliminato definitivamente");
                                      } catch (err: any) {
                                        toast.error(
                                          err?.message || "Impossibile eliminare l'utente",
                                        );
                                      }
                                    }
                                  },
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="space-y-6">
          {/* CLOUDFLARE EDGE & NETWORK STATUS BANNER */}
          <div className="bg-gradient-to-r from-[#12141c] via-[#161a26] to-[#12141c] border border-amber-500/20 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
                  <Shield className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-white uppercase tracking-tight">
                      Rete Protetta Cloudflare Edge & DDoS Shield
                    </span>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5">
                      SSL / TLS 1.3 Attivo
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                    I token di autenticazione e gli indirizzi IP sono verificati in tempo reale
                    tramite i nodi Edge di Cloudflare (
                    <span className="text-amber-400 font-mono font-bold">CF-Connecting-IP</span> e{" "}
                    <span className="text-amber-400 font-mono font-bold">CF-IPCountry</span>).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="bg-[#0a0b10]/90 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs">
                  <Globe className="h-3.5 w-3.5 text-sky-400" />
                  <span className="text-slate-400 font-mono text-[11px]">Anycast CDN</span>
                  <span className="text-emerald-400 font-bold font-mono text-[11px]">
                    100% Uptime
                  </span>
                </div>
                <div className="bg-[#0a0b10]/90 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs">
                  <Radio className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-slate-400 font-mono text-[11px]">Sync Sessioni</span>
                  <span className="text-amber-400 font-bold font-mono text-[11px]">Real-Time</span>
                </div>
              </div>
            </div>
          </div>

          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Sessioni Attive
                </span>
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-2xl font-black text-white mt-1">{deviceStats.active}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {deviceStats.uniqueUsers} utent{deviceStats.uniqueUsers === 1 ? "e" : "i"} online
              </div>
            </div>

            <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Desktop & Laptop
                </span>
                <Monitor className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 mt-1">{deviceStats.desktops}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Postazioni fisse</div>
            </div>

            <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Dispositivi Mobile
                </span>
                <Smartphone className="h-3.5 w-3.5 text-sky-400" />
              </div>
              <div className="text-2xl font-black text-sky-400 mt-1">{deviceStats.mobiles}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Smartphone e Tablet</div>
            </div>

            <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Revocate / Chiuse
                </span>
                <Power className="h-3.5 w-3.5 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-400 mt-1">{deviceStats.revoked}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Sessioni terminate</div>
            </div>
          </div>

          {/* FILTER & SEARCH BAR */}
          <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:max-w-md border border-slate-800 bg-[#0a0b10] rounded-xl px-3 py-2">
              <Search className="h-4 w-4 text-slate-500 shrink-0" />
              <Input
                placeholder="Filtra per username, IP, browser o sistema..."
                value={deviceSearch}
                onChange={(e) => setDeviceSearch(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-white"
              />
              {deviceSearch && (
                <button
                  onClick={() => setDeviceSearch("")}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <div className="bg-[#0a0b10] border border-slate-800 p-1 rounded-xl flex items-center gap-1">
                <button
                  onClick={() => setDeviceFilterStatus("all")}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                    deviceFilterStatus === "all"
                      ? "bg-amber-500 text-slate-950 font-black shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Tutte ({devices.length})
                </button>
                <button
                  onClick={() => setDeviceFilterStatus("active")}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                    deviceFilterStatus === "active"
                      ? "bg-emerald-500 text-slate-950 font-black shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Attive ({deviceStats.active})
                </button>
                <button
                  onClick={() => setDeviceFilterStatus("revoked")}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                    deviceFilterStatus === "revoked"
                      ? "bg-rose-500 text-slate-950 font-black shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Revocate ({deviceStats.revoked})
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 border-slate-800 bg-[#0a0b10] text-slate-300 hover:text-amber-400 text-xs font-bold"
                onClick={() => refetchDevices()}
                disabled={isFetchingDevices}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 mr-1.5 ${isFetchingDevices ? "animate-spin" : ""}`}
                />
                Aggiorna
              </Button>
            </div>
          </div>

          {/* MAIN SESSIONS TABLE */}
          <Card className="bg-[#12141c] border-slate-800/90 shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-800/80 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <Laptop className="h-5 w-5 text-amber-400" /> Registro Sessioni & Dispositivi
                    Autorizzati
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Monitoraggio in tempo reale dei token di accesso, indirizzi IP e terminali di
                    gioco o gestione.
                  </CardDescription>
                </div>
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1">
                  Protezione H24 Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 bg-[#0a0b10]/80">
                    <TableHead className="py-3 px-4 text-xs font-mono uppercase tracking-wider text-slate-400">
                      Utente / Ruolo
                    </TableHead>
                    <TableHead className="py-3 px-4 text-xs font-mono uppercase tracking-wider text-slate-400">
                      Dispositivo & Browser
                    </TableHead>
                    <TableHead className="py-3 px-4 text-xs font-mono uppercase tracking-wider text-slate-400">
                      Indirizzo IP
                    </TableHead>
                    <TableHead className="py-3 px-4 text-xs font-mono uppercase tracking-wider text-slate-400">
                      Ultima Attività
                    </TableHead>
                    <TableHead className="py-3 px-4 text-xs font-mono uppercase tracking-wider text-slate-400">
                      Stato
                    </TableHead>
                    <TableHead className="py-3 px-4 text-xs font-mono uppercase tracking-wider text-slate-400 text-right">
                      Azioni di Sicurezza
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-500 text-xs">
                        Nessuna sessione trovata con i filtri correnti.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDevices.map((dev: any) => {
                      const isMobile = dev.deviceType === "mobile";
                      const isTablet = dev.deviceType === "tablet";
                      const lastActiveDate = new Date(dev.lastActive || dev.createdAt);
                      const isRecent = Date.now() - lastActiveDate.getTime() < 1000 * 60 * 10; // active in last 10m

                      return (
                        <TableRow
                          key={dev.id}
                          className={`border-slate-800/80 transition-colors ${
                            dev.isRevoked ? "opacity-50 bg-slate-950/40" : "hover:bg-slate-800/30"
                          }`}
                        >
                          {/* USER INFO */}
                          <TableCell className="py-3 px-4 font-medium">
                            <div className="flex items-center gap-3">
                              <img
                                src={`https://mc-heads.net/avatar/${encodeURIComponent(dev.username || "Steve")}/32`}
                                alt="Skin"
                                className="h-8 w-8 rounded-lg border border-amber-500/30 object-cover shrink-0 bg-slate-900"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "https://minotar.net/helm/Steve/32.png";
                                }}
                              />
                              <div className="flex flex-col">
                                <span className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                                  {dev.username}
                                  {dev.isCurrent && (
                                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono uppercase">
                                      Tu
                                    </span>
                                  )}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {dev.displayName || dev.username}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* DEVICE & BROWSER */}
                          <TableCell className="py-3 px-4 text-xs text-slate-300">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                                {isMobile ? (
                                  <Smartphone className="h-4 w-4 text-sky-400" />
                                ) : isTablet ? (
                                  <Tablet className="h-4 w-4 text-indigo-400" />
                                ) : (
                                  <Monitor className="h-4 w-4 text-amber-400" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-200">{dev.browser}</span>
                                <span className="text-[10px] text-slate-500 uppercase font-mono">
                                  {dev.deviceType || "Desktop"}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* IP ADDRESS & CLOUDFLARE GEOLOCATION */}
                          <TableCell className="py-3 px-4 font-mono text-xs text-slate-300">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="text-base shrink-0 select-none"
                                  title={dev.countryName || dev.countryCode}
                                >
                                  {dev.countryFlag || "🇮🇹"}
                                </span>
                                <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px] font-bold text-slate-200">
                                  {dev.ipAddress}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <span className="text-slate-400 font-sans">
                                  {dev.countryName || "Italia"}
                                </span>
                                {dev.isCloudflare && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-400/90 font-mono font-medium bg-amber-500/10 px-1 rounded border border-amber-500/20">
                                    <Shield className="h-2.5 w-2.5" /> CF Edge
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* LAST ACTIVE */}
                          <TableCell className="py-3 px-4 text-xs text-slate-400">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-300">
                                {lastActiveDate.toLocaleTimeString("it-IT", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {lastActiveDate.toLocaleDateString("it-IT")}
                              </span>
                            </div>
                          </TableCell>

                          {/* STATUS BADGE */}
                          <TableCell className="py-3 px-4">
                            {dev.isRevoked ? (
                              <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px] font-mono uppercase">
                                Revocata
                              </Badge>
                            ) : isRecent ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-mono uppercase flex items-center gap-1 w-fit">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                                Attiva Ora
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-800/80 text-slate-400 border-slate-700 text-[10px] font-mono uppercase">
                                Inattiva
                              </Badge>
                            )}
                          </TableCell>

                          {/* ACTIONS */}
                          <TableCell className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!dev.isRevoked && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 px-2.5 text-xs font-bold rounded-lg uppercase tracking-wider shadow"
                                    onClick={() => handleDisconnect(dev.userId, dev.id)}
                                    title="Disconnetti questa sessione specifica"
                                  >
                                    <Unlink className="h-3 w-3 mr-1" /> Termina
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[11px] border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 rounded-lg"
                                    onClick={() => handleDisconnectAll(dev.userId, dev.username)}
                                    title="Disconnetti tutte le sessioni di questo utente"
                                  >
                                    <LogOut className="h-3 w-3 mr-1" /> Tutte
                                  </Button>
                                </>
                              )}
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
        </div>
      )}

      {createOpen && (
        <CreateUserDialog
          onClose={() => setCreateOpen(false)}
          onSubmit={async (v: any) => {
            await createFn({ data: v });
            qc.invalidateQueries({ queryKey: ["panel-users"] });
            toast.success("Utente creato");
          }}
        />
      )}
      {editTarget && (
        <EditUserDialog
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={async (v: any) => {
            await updateFn({ data: { userId: editTarget.id, ...v } });
            qc.invalidateQueries({ queryKey: ["panel-users"] });
            toast.success("Utente modificato");
          }}
        />
      )}
      {resetTarget && (
        <ResetDialog
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onSubmit={async (pw: string) => {
            await resetFn({ data: { userId: resetTarget.id, newPassword: pw } });
            toast.success("Password reimpostata");
          }}
        />
      )}
      {rolesTarget && (
        <RolesDialog
          user={rolesTarget}
          customRoles={customRoles}
          onClose={() => setRolesTarget(null)}
          onToggle={async (roleId: string, assign: boolean) => {
            await assignFn({ data: { userId: rolesTarget.id, customRoleId: roleId, assign } });
            qc.invalidateQueries({ queryKey: ["panel-users"] });
          }}
        />
      )}
      {activityTarget && (
        <UserActivityDialog user={activityTarget} onClose={() => setActivityTarget(null)} />
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

function CreateUserDialog({ onClose, onSubmit }: any) {
  const [busy, setBusy] = useState(false);
  const [hasEmployeeAccess, setHasEmployeeAccess] = useState(true);
  const [showInStaffList, setShowInStaffList] = useState(true);
  const [staffWeight, setStaffWeight] = useState("50");
  const [staffColor, setStaffColor] = useState("#3b82f6");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo utente</DialogTitle>
        </DialogHeader>
        <form
          id="new-user"
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const fd = new FormData(e.currentTarget);
            try {
              await onSubmit({
                username: String(fd.get("username")),
                password: String(fd.get("password")),
                displayName: String(fd.get("displayName") || ""),
                telegramHandle: String(fd.get("telegramHandle") || ""),
                isAdmin: fd.get("isAdmin") === "on",
                hasEmployeeAccess,
                showInStaffList,
                staffWeight: Number(staffWeight) || 50,
                staffColor,
              });
              onClose();
            } catch (err: any) {
              toast.error(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <Label>Username Minecraft *</Label>
            <Input
              name="username"
              required
              minLength={3}
              pattern="[a-zA-Z0-9_.\-]+"
              placeholder="es. Mario"
            />
          </div>
          <div>
            <Label>Nome visualizzato</Label>
            <Input name="displayName" placeholder="es. Mario Rossi" />
          </div>
          <div>
            <Label>Username Telegram (@)</Label>
            <Input name="telegramHandle" placeholder="@username_telegram" />
          </div>
          <div>
            <Label>Password iniziale *</Label>
            <Input name="password" type="password" required minLength={6} />
          </div>

          <div className="pt-2 border-t border-border space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAdmin"
                name="isAdmin"
                className="rounded border-slate-700"
              />
              <Label htmlFor="isAdmin">Ruolo Amministratore Totale</Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasEmployeeAccess"
                checked={hasEmployeeAccess}
                onChange={(e) => setHasEmployeeAccess(e.target.checked)}
                className="rounded border-slate-700"
              />
              <Label htmlFor="hasEmployeeAccess" className="text-emerald-400 font-medium">
                Abilita Accesso al Pannello Dipendenti
              </Label>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showInStaffList"
                  checked={showInStaffList}
                  onChange={(e) => setShowInStaffList(e.target.checked)}
                  className="rounded border-slate-700"
                />
                <Label htmlFor="showInStaffList" className="font-semibold text-primary">
                  Mostra nella Ciurma (Lista Staff)
                </Label>
              </div>

              {showInStaffList && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-xs">Peso Gerarchico (Ordine)</Label>
                    <Input
                      type="number"
                      value={staffWeight}
                      onChange={(e) => setStaffWeight(e.target.value)}
                      placeholder="es. 100 per Capitano, 50 Croupier"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Più è alto, più appare in alto nella lista staff.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">Colore Distintivo / Badge</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={staffColor}
                        onChange={(e) => setStaffColor(e.target.value)}
                        className="h-9 w-12 rounded cursor-pointer border border-slate-700 bg-slate-950"
                      />
                      <Input
                        value={staffColor}
                        onChange={(e) => setStaffColor(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button form="new-user" type="submit" disabled={busy}>
            Crea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({ user, onClose, onSubmit }: any) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password — {user.username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Nuova password</Label>
          <Input type="text" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Comunica questa password all'utente. Verrà cifrata e non sarà più visibile.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button
            disabled={busy || pw.length < 6}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit(pw);
                onClose();
              } catch (e: any) {
                toast.error(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Conferma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RolesDialog({ user, customRoles, onClose, onToggle }: any) {
  const assignedIds = new Set(user.custom_roles?.map((r: any) => r.id) ?? []);
  const baseRoles = (customRoles || []).filter((r: any) => !r.is_reparto);
  const reparti = (customRoles || []).filter((r: any) => r.is_reparto === true);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#12141c] border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-400" />
            Ruoli & Reparti di {user.username}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Assegna un ruolo base o i reparti (extrapex) per concedere permessi cumulativi
            all'utente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
          {/* Ruoli Base Section */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5" /> Ruoli Base Sito
            </div>
            {baseRoles.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Nessun ruolo base disponibile.</p>
            ) : (
              baseRoles.map((r: any) => {
                const checked = assignedIds.has(r.id);
                return (
                  <label
                    key={r.id}
                    className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      defaultChecked={checked}
                      onChange={(e) => onToggle(r.id, e.target.checked)}
                      className="mt-1 rounded text-amber-500"
                    />
                    <div>
                      <div className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: r.staff_color || "#f59e0b" }}
                        />
                        {r.name}
                      </div>
                      <div className="text-xs text-slate-400">{r.description ?? "—"}</div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Reparti & Extrapex Section */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Reparti & Extrapex
            </div>
            {reparti.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                Nessun reparto (extrapex) configurato.
              </p>
            ) : (
              reparti.map((r: any) => {
                const checked = assignedIds.has(r.id);
                return (
                  <label
                    key={r.id}
                    className="flex items-start gap-3 p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      defaultChecked={checked}
                      onChange={(e) => onToggle(r.id, e.target.checked)}
                      className="mt-1 rounded text-purple-500"
                    />
                    <div>
                      <div className="font-semibold text-sm text-purple-200 flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: r.staff_color || "#8b5cf6" }}
                        />
                        {r.name}
                        <Badge className="text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30">
                          Extrapex
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400">{r.description ?? "—"}</div>
                      <div className="text-[10px] text-purple-300/80 mt-0.5">
                        +{(r.permissions ?? []).length} permessi extra
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
          >
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user, onClose, onSubmit }: any) {
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.display_name ?? "");
  const [telegramHandle, setTelegramHandle] = useState(user.telegram_handle ?? "");
  const [hasEmployeeAccess, setHasEmployeeAccess] = useState(user.has_employee_access ?? true);
  const [showInStaffList, setShowInStaffList] = useState(user.show_in_staff_list ?? true);
  const [staffWeight, setStaffWeight] = useState(String(user.staff_weight ?? 50));
  const [staffColor, setStaffColor] = useState(user.staff_color ?? "#3b82f6");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica utente — {user.username}</DialogTitle>
        </DialogHeader>
        <form
          id="edit-user"
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await onSubmit({
                username: username,
                displayName: displayName,
                telegramHandle: telegramHandle,
                hasEmployeeAccess: hasEmployeeAccess,
                showInStaffList: showInStaffList,
                staffWeight: Number(staffWeight) || 50,
                staffColor: staffColor,
              });
              onClose();
            } catch (err: any) {
              toast.error(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <Label>Username Minecraft *</Label>
            <Input
              name="username"
              required
              minLength={3}
              pattern="[a-zA-Z0-9_.\-]+"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <Label>Nome visualizzato</Label>
            <Input
              name="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <Label>Username Telegram (@)</Label>
            <Input
              name="telegramHandle"
              placeholder="@username_telegram"
              value={telegramHandle}
              onChange={(e) => setTelegramHandle(e.target.value)}
            />
          </div>

          <div className="pt-2 border-t border-border space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editHasEmployeeAccess"
                checked={hasEmployeeAccess}
                onChange={(e) => setHasEmployeeAccess(e.target.checked)}
                className="rounded border-slate-700"
              />
              <Label htmlFor="editHasEmployeeAccess" className="text-emerald-400 font-medium">
                Abilita Accesso al Pannello Dipendenti
              </Label>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editShowInStaffList"
                  checked={showInStaffList}
                  onChange={(e) => setShowInStaffList(e.target.checked)}
                  className="rounded border-slate-700"
                />
                <Label htmlFor="editShowInStaffList" className="font-semibold text-primary">
                  Mostra nella Ciurma (Lista Staff)
                </Label>
              </div>

              {showInStaffList && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-xs">Peso Gerarchico (Ordine)</Label>
                    <Input
                      type="number"
                      value={staffWeight}
                      onChange={(e) => setStaffWeight(e.target.value)}
                      placeholder="es. 100 per Capitano, 50 Croupier"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Maggiore peso = Posizione più in alto nella ciurma.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">Colore Ruolo / Distintivo</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={staffColor}
                        onChange={(e) => setStaffColor(e.target.value)}
                        className="h-9 w-12 rounded cursor-pointer border border-slate-700 bg-slate-950"
                      />
                      <Input
                        value={staffColor}
                        onChange={(e) => setStaffColor(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button form="edit-user" type="submit" disabled={busy}>
            Salva modifiche
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserActivityDialog({ user, onClose }: { user: any; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedTable, setSelectedTable] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Fetch audit logs for this user specifically
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at" as any, { ascending: false });

      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  // Unique tables for filter
  const uniqueTables = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.table_name) set.add(l.table_name);
    });
    return Array.from(set);
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchesSearch =
        search === "" ||
        l.details?.toLowerCase().includes(search.toLowerCase()) ||
        l.table_name?.toLowerCase().includes(search.toLowerCase());

      const matchesAction = selectedAction === "all" || l.action === selectedAction;
      const matchesTable = selectedTable === "all" || l.table_name === selectedTable;

      return matchesSearch && matchesAction && matchesTable;
    });
  }, [logs, search, selectedAction, selectedTable]);

  // Stats calculation
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayLogs = logs.filter((l) => l.created_at?.startsWith(todayStr));

    return {
      total: logs.length,
      today: todayLogs.length,
      writes: logs.filter((l) => ["insert", "update", "delete", "upsert"].includes(l.action))
        .length,
    };
  }, [logs]);

  const renderActionBadge = (action: string) => {
    switch (action) {
      case "insert":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase font-bold text-[10px] tracking-wide px-2 py-0.5">
            Inserimento
          </Badge>
        );
      case "update":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase font-bold text-[10px] tracking-wide px-2 py-0.5">
            Modifica
          </Badge>
        );
      case "delete":
        return (
          <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 uppercase font-bold text-[10px] tracking-wide px-2 py-0.5">
            Eliminazione
          </Badge>
        );
      case "rpc":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase font-bold text-[10px] tracking-wide px-2 py-0.5">
            Funzione
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500/10 text-slate-400 border border-slate-500/20 uppercase font-bold text-[10px] tracking-wide px-2 py-0.5">
            {action}
          </Badge>
        );
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden bg-slate-950 text-white border-slate-800">
        <DialogHeader className="pb-4 border-b border-slate-800 shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <History className="h-5 w-5 text-indigo-400 animate-pulse" /> Registro Attività —{" "}
            {user.display_name || user.username}
          </DialogTitle>
          <p className="text-xs text-slate-400 mt-1">
            Storico completo e in tempo reale di tutte le operazioni eseguite dall'utente{" "}
            <strong>@{user.username}</strong>.
          </p>
        </DialogHeader>

        {/* Stats Row inside Dialog */}
        <div className="grid gap-3 md:grid-cols-3 my-4 shrink-0">
          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-indigo-500" />
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
              Operazioni Totali
            </p>
            <p className="text-xl font-bold text-white mt-1">{isLoading ? "..." : stats.total}</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-emerald-500" />
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
              Operazioni Oggi
            </p>
            <p className="text-xl font-bold text-white mt-1">{isLoading ? "..." : stats.today}</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-amber-500" />
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
              Modifiche Dati
            </p>
            <p className="text-xl font-bold text-white mt-1">{isLoading ? "..." : stats.writes}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-2 md:grid-cols-12 mb-4 shrink-0">
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Cerca per descrizione..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:ring-primary/50 text-xs h-9"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tutti i tipi</option>
              <option value="insert">Inserimento</option>
              <option value="update">Modifica</option>
              <option value="delete">Eliminazione</option>
              <option value="rpc">Funzione</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase text-[10px] font-bold"
            >
              <option value="all">Tutte le tabelle</option>
              {uniqueTables.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-slate-800/60 rounded-lg bg-slate-900/20 divide-y divide-slate-900">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 italic space-y-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <p className="text-[11px]">Caricamento attività...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 space-y-2">
              <Info className="h-10 w-10 text-slate-700 animate-pulse" />
              <p className="text-xs font-semibold">Nessuna attività trovata</p>
              <p className="text-[10px] text-slate-600 max-w-xs">
                Nessun record corrisponde ai criteri di ricerca impostati.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const date = new Date(log.created_at);
              const isExpanded = expandedLogId === log.id;

              return (
                <div
                  key={log.id}
                  className={`transition-colors hover:bg-slate-900/40 ${
                    isExpanded ? "bg-slate-900/60" : ""
                  }`}
                >
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-3 flex items-center justify-between gap-3 cursor-pointer text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="shrink-0 mt-0.5">{renderActionBadge(log.action)}</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 leading-normal">{log.details}</p>
                        <span className="font-mono text-[9px] text-slate-500 uppercase flex items-center gap-1 mt-0.5">
                          <Database className="h-2.5 w-2.5" /> {log.table_name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <span className="text-[10px] font-mono text-slate-400">
                        {date.toLocaleDateString("it-IT")}{" "}
                        <span className="text-indigo-400 font-semibold">
                          {date.toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                      )}
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden bg-slate-950/80 border-t border-slate-900"
                      >
                        <div className="p-3 text-[11px] text-slate-400 space-y-2">
                          <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                            <span>Dettagli Operazione</span>
                            <span>ID: {log.id}</span>
                          </div>
                          <div className="grid gap-2 grid-cols-2 bg-slate-900/30 p-2.5 rounded border border-slate-800/40">
                            <div>
                              <p>
                                Azione:{" "}
                                <span className="font-mono text-slate-200 capitalize">
                                  {log.action}
                                </span>
                              </p>
                              <p>
                                Tabella:{" "}
                                <span className="font-mono text-slate-200 uppercase font-semibold">
                                  {log.table_name}
                                </span>
                              </p>
                            </div>
                            <div>
                              <p>
                                Data ISO:{" "}
                                <span className="font-mono text-slate-200">{log.created_at}</span>
                              </p>
                              <p>
                                Dispositivo:{" "}
                                <span className="font-mono text-slate-200">Sessione attiva</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="mt-4 shrink-0">
          <Button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9"
          >
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
