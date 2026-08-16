import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Plus,
  Pencil,
  Trash2,
  Send,
  ShieldCheck,
  Users,
  RefreshCw,
  UserX,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { PERMISSIONS } from "@/lib/format";
import { toast } from "sonner";
import {
  listTelegramGroups,
  updateTelegramGroupRoles,
  registerTelegramGroupManual,
  deleteTelegramGroup,
  kickGroupMember,
  reinstateGroupMember,
  syncTelegramGroupsNow,
  checkGroupBotPermissionsFn,
} from "@/lib/telegram-groups.functions";
import { AlertTriangle, XCircle, Shield, Check, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ruoli")({
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
  component: RolesPage,
});

function RolesPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"roles" | "telegram">("roles");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [roleToDelete, setRoleToDelete] = useState<any | null>(null);
  const [addManualGroupOpen, setAddManualGroupOpen] = useState(false);

  const { data: roles = [] } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("custom_roles").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const {
    data: telegramGroups = [],
    isLoading: tgLoading,
    isError: tgError,
    error: tgErrorObj,
    refetch: refetchGroups,
    isFetching: isFetchingGroups,
  } = useQuery({
    queryKey: ["admin-telegram-groups"],
    queryFn: async () => {
      return await listTelegramGroups();
    },
    staleTime: 30000,
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
      toast.success("Ruolo eliminato");
    },
  });

  const runAuditMutation = useMutation({
    mutationFn: async () => {
      return await syncTelegramGroupsNow();
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["admin-telegram-groups"] });
      toast.success(
        `Controllo & Audit completato! Promemoria inviati: ${res?.remindersSent ?? 0}, Espulsi non autorizzati: ${res?.unauthorizedKicked ?? 0}`,
      );
    },
    onError: (err: any) => toast.error(err.message || "Errore durante il controllo."),
  });

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
          DEFINIZIONE RUOLI PERSONALIZZATI, GRUPPI TELEGRAM E PERMESSI STAFF
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setActiveTab("roles")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
            activeTab === "roles"
              ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
              : "bg-[#12141c] text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Ruoli & Permessi Sito
        </button>
        <button
          onClick={() => setActiveTab("telegram")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all relative ${
            activeTab === "telegram"
              ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
              : "bg-[#12141c] text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Send className="h-4 w-4" />
          Gruppi Telegram & Bot
          {telegramGroups.length > 0 && (
            <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] px-1.5 py-0.2 rounded-full ml-1">
              {telegramGroups.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "roles" ? (
        <>
          {/* Control Header Box */}
          <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold uppercase text-white tracking-wider">
                RUOLI & PERMESSI
              </h2>
              <p className="text-xs text-slate-400">
                Crea e gestisci i ruoli personalizzati con permessi e colori identificativi
              </p>
            </div>

            <Button
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider shadow-lg shadow-amber-500/10 w-full sm:w-auto"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Nuovo ruolo
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {roles.length === 0 && (
              <Card className="md:col-span-2">
                <CardContent className="text-center text-muted-foreground py-8">
                  Nessun ruolo personalizzato
                </CardContent>
              </Card>
            )}
            {roles.map((r: any) => (
              <Card key={r.id} className="relative overflow-hidden border border-slate-800">
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: r.staff_color || "#3b82f6" }}
                />
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{r.name}</h3>
                        {r.show_in_staff_list ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                            ⚓ In Ciurma (Peso: {r.staff_weight ?? 50})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 text-[10px]">
                            Nascosto in Ciurma
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{r.description ?? "—"}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(r);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setRoleToDelete(r)}
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(r.permissions ?? []).length === 0 && (
                      <span className="text-xs text-muted-foreground">Nessun permesso</span>
                    )}
                    {(r.permissions ?? []).map((p: string) => (
                      <Badge key={p} variant="secondary" className="text-xs">
                        {PERMISSIONS.find((x) => x.key === p)?.label ?? p}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Dialog for confirming custom role deletion */}
          {roleToDelete && (
            <Dialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
              <DialogContent className="max-w-md bg-[#12141c] border-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-rose-400">
                    <Trash2 className="h-5 w-5" />
                    Elimina Ruolo Personalizzato
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-sm">
                    Sei sicuro di voler eliminare il ruolo <b>"{roleToDelete.name}"</b>? Questa
                    azione rimuoverà i relativi permessi associati agli utenti.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0 mt-3">
                  <Button
                    variant="ghost"
                    onClick={() => setRoleToDelete(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    Annulla
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={del.isPending}
                    onClick={() => {
                      del.mutate(roleToDelete.id, {
                        onSuccess: () => setRoleToDelete(null),
                      });
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                  >
                    {del.isPending ? "Eliminazione..." : "Conferma ed Elimina"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </>
      ) : (
        /* Telegram Groups Management Tab */
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-sky-400" />
                <h2 className="text-lg font-extrabold uppercase text-white tracking-wider">
                  GRUPPI TELEGRAM & ACCESSI PER RUOLO
                </h2>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] flex items-center gap-1 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync Attivo
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Associa ciascun gruppo Telegram del Bot ai ruoli del sito. Il bot gestisce
                automaticamente ammissioni, inviti, verifiche e controlli giornalieri alle 17:00.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchGroups();
                  toast.success("Sincronizzazione gruppi aggiornata!");
                }}
                disabled={isFetchingGroups}
                className="border-slate-800 hover:bg-slate-800 text-xs font-semibold"
                title="Ricarica la lista dei gruppi Telegram dal server"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 mr-1.5 ${isFetchingGroups ? "animate-spin text-sky-400" : ""}`}
                />
                Sincronizza Ora
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runAuditMutation.mutate()}
                disabled={runAuditMutation.isPending}
                className="border-slate-800 hover:bg-slate-800 text-xs font-semibold"
              >
                <ShieldCheck
                  className={`h-3.5 w-3.5 mr-1.5 ${runAuditMutation.isPending ? "animate-spin" : ""}`}
                />
                Audit 17:00
              </Button>
              <Button
                size="sm"
                onClick={() => setAddManualGroupOpen(true)}
                className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Aggiungi Gruppo
              </Button>
            </div>
          </div>

          {/* Quick Guide Card */}
          <div className="bg-sky-500/5 border border-sky-500/20 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start gap-4">
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl shrink-0">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                <span>Come associare un gruppo Telegram in automatico:</span>
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-[10px]">
                  Comando Bot
                </Badge>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed">
                <li>
                  Aggiungi il bot ufficiale <b>@CasinoRevengeStaff_bot</b> nel gruppo Telegram dello
                  Staff.
                </li>
                <li>
                  Rendilo <b>Amministratore</b> con i permessi di <i>Invitare Utenti</i> ed{" "}
                  <i>Espellere Membri</i> (la modalità Userbot monitorerà accessi ed eventi H24).
                </li>
                <li>
                  Un <b>Amministratore del sito</b> (con account Telegram collegato) invia il
                  comando{" "}
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded text-sky-300 font-mono">
                    /registragruppo
                  </code>{" "}
                  nel gruppo. Il gruppo apparirà subito in questa schermata.
                </li>
                <li>Seleziona qui sotto quali ruoli hanno il permesso di accedere al gruppo.</li>
              </ol>
            </div>
          </div>

          {/* Groups Grid */}
          <div className="space-y-4">
            {tgLoading ? (
              <div className="p-8 text-center text-slate-400">Caricamento gruppi Telegram...</div>
            ) : tgError ? (
              <Card className="border border-rose-500/30 bg-rose-950/10">
                <CardContent className="text-center py-8 space-y-3">
                  <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto" />
                  <div className="text-white font-bold">
                    Errore nel caricamento dei gruppi Telegram
                  </div>
                  <p className="text-xs text-rose-300/80 max-w-md mx-auto">
                    {(tgErrorObj as any)?.message ||
                      "Impossibile recuperare i dati dei gruppi in questo momento."}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetchGroups()}
                    className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10 text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Riprova Caricamento
                  </Button>
                </CardContent>
              </Card>
            ) : telegramGroups.length === 0 ? (
              <Card className="border border-slate-800 bg-[#12141c]">
                <CardContent className="text-center py-12 space-y-3">
                  <Send className="h-10 w-10 text-slate-600 mx-auto" />
                  <div className="text-white font-bold">Nessun Gruppo Telegram Collegato</div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Aggiungi il bot in un gruppo e invia il comando <code>/registragruppo</code>,
                    oppure usa il pulsante "Aggiungi Gruppo" per inserire manualmente l'ID Chat.
                  </p>
                </CardContent>
              </Card>
            ) : (
              telegramGroups.map((group: any) => (
                <TelegramGroupCard
                  key={group.id}
                  group={group}
                  allRoles={roles}
                  onUpdated={() => {
                    refetchGroups();
                    qc.invalidateQueries({ queryKey: ["admin-telegram-groups"] });
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}

      {open && <RoleDialog role={editing} onClose={() => setOpen(false)} />}
      {addManualGroupOpen && (
        <AddTelegramGroupDialog
          allRoles={roles}
          onClose={() => {
            setAddManualGroupOpen(false);
            refetchGroups();
          }}
        />
      )}
    </div>
  );
}

function TelegramGroupCard({
  group,
  allRoles,
  onUpdated,
}: {
  group: any;
  allRoles: any[];
  onUpdated: () => void;
}) {
  const qc = useQueryClient();
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(group.allowed_role_ids || []);
  const [isEditingRoles, setIsEditingRoles] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showBotPerms, setShowBotPerms] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [memberToKick, setMemberToKick] = useState<any | null>(null);
  const [memberToReinstate, setMemberToReinstate] = useState<any | null>(null);
  const [localBotPerms, setLocalBotPerms] = useState<any | null>(group.botPermissions || null);

  const checkPermsMutation = useMutation({
    mutationFn: async () => {
      return await checkGroupBotPermissionsFn({
        data: { groupId: group.id, chatId: group.chat_id },
      });
    },
    onSuccess: (res: any) => {
      setLocalBotPerms(res);
      if (res?.allRequiredGranted) {
        toast.success(
          `Tutti i permessi del Bot nel gruppo "${group.title}" sono verificati e operativi!`,
        );
      } else if (res?.isAdmin) {
        toast.warning(`Il bot è amministratore, ma mancano alcuni permessi raccomandati.`);
      } else {
        toast.error(
          `Il bot non è amministratore in questo gruppo! Assegna i permessi admin su Telegram.`,
        );
      }
    },
    onError: (e: any) => toast.error(e.message || "Errore nella verifica permessi bot"),
  });

  const updateRolesMutation = useMutation({
    mutationFn: async (roleIds: string[]) => {
      return await updateTelegramGroupRoles({
        data: { groupId: group.id, allowedRoleIds: roleIds },
      });
    },
    onSuccess: () => {
      toast.success("Ruoli abilitati per il gruppo aggiornati!");
      setIsEditingRoles(false);
      onUpdated();
      qc.invalidateQueries({ queryKey: ["admin-telegram-groups"] });
      qc.invalidateQueries({ queryKey: ["telegram-groups"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await deleteTelegramGroup({ data: { groupId: group.id } });
    },
    onSuccess: () => {
      toast.success("Gruppo scollegato con successo.");
      setConfirmDeleteOpen(false);
      onUpdated();
      qc.invalidateQueries({ queryKey: ["admin-telegram-groups"] });
      qc.invalidateQueries({ queryKey: ["telegram-groups"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const kickMemberMutation = useMutation({
    mutationFn: async (telegramUserId: number | string) => {
      return await kickGroupMember({
        data: { groupId: group.id, telegramUserId },
      });
    },
    onSuccess: () => {
      toast.success("Accesso revocato ed utente espulso dal gruppo Telegram.");
      setMemberToKick(null);
      onUpdated();
      qc.invalidateQueries({ queryKey: ["admin-telegram-groups"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reinstateMemberMutation = useMutation({
    mutationFn: async (telegramUserId: number | string) => {
      return await reinstateGroupMember({
        data: { groupId: group.id, telegramUserId },
      });
    },
    onSuccess: () => {
      toast.success("Utente reintegrato ed abilitato nel gruppo Telegram!");
      setMemberToReinstate(null);
      onUpdated();
      qc.invalidateQueries({ queryKey: ["admin-telegram-groups"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  };

  const membersList = group.members || [];
  const activeMembers = membersList.filter((m: any) => m.status === "member");
  const botPerms = localBotPerms || group.botPermissions;
  const isBotOk = botPerms?.allRequiredGranted;
  const isBotAdmin = botPerms?.isAdmin;

  return (
    <>
      <Card className="border border-slate-800 bg-[#12141c] rounded-2xl overflow-hidden shadow-xl">
        <CardHeader className="pb-3 border-b border-slate-800/80 bg-slate-900/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Send className="h-4 w-4" />
                </div>
                <CardTitle className="text-base md:text-lg font-bold text-white">
                  {group.title}
                </CardTitle>
                <Badge className="bg-sky-500/10 text-sky-300 border-sky-500/30 text-[10px] uppercase font-mono">
                  ID: {group.chat_id}
                </Badge>

                {/* Bot Permission Status Badge */}
                {botPerms && (
                  <>
                    {isBotOk ? (
                      <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        Bot Operativo (Permessi OK)
                      </Badge>
                    ) : isBotAdmin ? (
                      <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-400" />
                        Permessi Parziali
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30 text-[10px] font-semibold flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-rose-400" />
                        Bot Non Admin
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <CardDescription className="text-xs text-slate-400 flex items-center gap-3">
                <span>Tipo: {group.type || "supergroup"}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">
                  {activeMembers.length} membri verificati
                </span>
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowBotPerms(!showBotPerms);
                  if (!localBotPerms) {
                    checkPermsMutation.mutate();
                  }
                }}
                className={`text-xs font-semibold border-slate-800 ${
                  showBotPerms
                    ? "bg-sky-500/10 text-sky-300 border-sky-500/30"
                    : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                <Shield className="h-3.5 w-3.5 mr-1" />
                {showBotPerms ? "Nascondi Permessi" : "Check Permessi Bot"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMembers(!showMembers)}
                className="border-slate-800 hover:bg-slate-800 text-xs font-semibold"
              >
                <Users className="h-3.5 w-3.5 mr-1" />
                {showMembers ? "Nascondi Membri" : `Membri (${membersList.length})`}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirmDeleteOpen(true)}
                title="Scollega Gruppo Telegram"
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Bot Permissions Diagnostics Section if expanded or warning */}
          {showBotPerms && (
            <div className="p-3.5 rounded-xl bg-[#0a0b10] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-sky-400" />
                  Diagnostica Permessi Bot Telegram
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => checkPermsMutation.mutate()}
                  disabled={checkPermsMutation.isPending}
                  className="text-xs text-sky-400 hover:text-sky-300 h-6 px-2"
                >
                  <RefreshCw
                    className={`h-3 w-3 mr-1 ${checkPermsMutation.isPending ? "animate-spin" : ""}`}
                  />
                  {checkPermsMutation.isPending ? "Verifica..." : "Ricarica Verifica"}
                </Button>
              </div>

              {botPerms ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                      botPerms.isAdmin
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                    }`}
                  >
                    {botPerms.isAdmin ? (
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold">Amministratore</div>
                      <div className="text-[10px] opacity-80">
                        {botPerms.isAdmin ? "Confermato" : "Non Admin"}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                      botPerms.canInviteUsers
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                    }`}
                  >
                    {botPerms.canInviteUsers ? (
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold">Invita Utenti</div>
                      <div className="text-[10px] opacity-80">
                        {botPerms.canInviteUsers ? "Abilitato" : "Mancante"}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                      botPerms.canRestrictMembers
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                    }`}
                  >
                    {botPerms.canRestrictMembers ? (
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold">Espelli / Limita</div>
                      <div className="text-[10px] opacity-80">
                        {botPerms.canRestrictMembers ? "Abilitato" : "Disabilitato"}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                      botPerms.canDeleteMessages
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    {botPerms.canDeleteMessages ? (
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Info className="h-4 w-4 text-slate-500 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold">Elimina Messaggi</div>
                      <div className="text-[10px] opacity-80">
                        {botPerms.canDeleteMessages ? "Abilitato" : "Facoltativo"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  Clicca "Ricarica Verifica" per controllare i permessi del bot in tempo reale.
                </div>
              )}

              {!isBotOk && (
                <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                  💡 <b>Suggerimento:</b> Per garantire la gestione automatica degli inviti e delle
                  espulsioni dello staff, apri Telegram, vai nelle impostazioni del gruppo &gt;{" "}
                  <i>Amministratori</i> &gt; seleziona il bot e attiva i permessi di{" "}
                  <b>Invitare Utenti</b> ed <b>Espellere Membri</b>.
                </p>
              )}
            </div>
          )}

          {/* Role Permissions Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ruoli Abilitati all'Accesso ({selectedRoleIds.length})
              </div>
              {!isEditingRoles ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingRoles(true)}
                  className="text-xs text-amber-400 hover:text-amber-300 h-7"
                >
                  <Pencil className="h-3 w-3 mr-1" /> Modifica Ruoli
                </Button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRoleIds(group.allowed_role_ids || []);
                      setIsEditingRoles(false);
                    }}
                    className="text-xs text-slate-400 h-7"
                  >
                    Annulla
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateRolesMutation.mutate(selectedRoleIds)}
                    disabled={updateRolesMutation.isPending}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-7"
                  >
                    Salva Modifiche
                  </Button>
                </div>
              )}
            </div>

            {!isEditingRoles ? (
              <div className="flex flex-wrap gap-1.5">
                {group.allowedRoles && group.allowedRoles.length > 0 ? (
                  group.allowedRoles.map((r: any) => (
                    <Badge
                      key={r.id}
                      className="bg-[#0a0b10] border-slate-700 text-slate-200 text-xs px-2.5 py-1 flex items-center gap-1.5"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: r.staff_color || "#f59e0b" }}
                      />
                      {r.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">
                    Nessun ruolo abilitato (Nessuno può accedere)
                  </span>
                )}
              </div>
            ) : (
              <div className="p-3 bg-[#0a0b10] border border-slate-800 rounded-xl space-y-2">
                <p className="text-[11px] text-slate-400">
                  Seleziona tutti i ruoli che avranno diritto di accedere a questo gruppo Telegram:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {/* Admin built-in role */}
                  <label
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      selectedRoleIds.includes("crole-admin") || selectedRoleIds.includes("admin")
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-300 font-semibold"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedRoleIds.includes("crole-admin") || selectedRoleIds.includes("admin")
                      }
                      onChange={() => toggleRole("crole-admin")}
                      className="rounded text-amber-500"
                    />
                    <span>👑 Amministratore / Capitano</span>
                  </label>

                  {allRoles.map((r: any) => {
                    const isChecked = selectedRoleIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? "bg-sky-500/10 border-sky-500/40 text-sky-300 font-semibold"
                            : "bg-slate-900 border-slate-800 text-slate-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRole(r.id)}
                          className="rounded text-sky-500"
                        />
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: r.staff_color || "#3b82f6" }}
                        />
                        <span className="truncate">{r.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Member list section if expanded */}
          {showMembers && (
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold uppercase tracking-wider">
                  Membri Tracciati nel Gruppo ({membersList.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Verifica automatica @handle e ID Telegram
                </span>
              </div>

              {membersList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-[#0a0b10] rounded-xl border border-slate-800">
                  Nessun membro registrato in questo gruppo al momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {membersList.map((m: any) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl bg-[#0a0b10] border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white truncate">
                            {m.profile_name
                              ? `${m.profile_name} (${m.telegram_handle || `ID: ${m.telegram_user_id}`})`
                              : m.telegram_handle || `ID: ${m.telegram_user_id}`}
                          </span>
                          {m.status === "member" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0">
                              Nel gruppo
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[9px] px-1.5 py-0">
                              Espulso
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {m.joined_at ? new Date(m.joined_at).toLocaleDateString("it-IT") : "—"}
                        </div>
                      </div>

                      {m.status === "member" && m.telegram_user_id ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setMemberToKick(m)}
                          className="text-[10px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-6 px-2 shrink-0"
                        >
                          <UserX className="h-3 w-3 mr-1" /> Revoca / Espelli
                        </Button>
                      ) : m.telegram_user_id ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setMemberToReinstate(m)}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-6 px-2 shrink-0"
                        >
                          <UserCheck className="h-3 w-3 mr-1" /> Reintegra / Riabilita
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Deleting/Unlinking Group */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-md bg-[#12141c] border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <Trash2 className="h-5 w-5" />
              Scollega Gruppo Telegram
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Sei sicuro di voler scollegare il gruppo <b>"{group.title}"</b> (ID:{" "}
              <code>{group.chat_id}</code>)? Il bot non sincronizzerà più i ruoli e i permessi di
              questo gruppo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button
              variant="ghost"
              onClick={() => setConfirmDeleteOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {deleteMutation.isPending ? "Scollegamento in corso..." : "Conferma e Scollega"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Kicking/Revoking Member */}
      {memberToKick && (
        <Dialog open={!!memberToKick} onOpenChange={() => setMemberToKick(null)}>
          <DialogContent className="max-w-md bg-[#12141c] border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-400">
                <UserX className="h-5 w-5" />
                Revoca Accesso ed Espelli
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                Vuoi revocare l'autorizzazione ed espellere{" "}
                <b>
                  {memberToKick.profile_name
                    ? `${memberToKick.profile_name} (${memberToKick.telegram_handle || `ID: ${memberToKick.telegram_user_id}`})`
                    : memberToKick.telegram_handle || `ID: ${memberToKick.telegram_user_id}`}
                </b>{" "}
                dal gruppo <b>"{group.title}"</b>?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 mt-3">
              <Button
                variant="ghost"
                onClick={() => setMemberToKick(null)}
                className="text-slate-400 hover:text-white"
              >
                Annulla
              </Button>
              <Button
                variant="destructive"
                disabled={kickMemberMutation.isPending}
                onClick={() => kickMemberMutation.mutate(memberToKick.telegram_user_id)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {kickMemberMutation.isPending ? "Espulsione..." : "Conferma ed Espelli"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Dialog for Reinstating Member */}
      {memberToReinstate && (
        <Dialog open={!!memberToReinstate} onOpenChange={() => setMemberToReinstate(null)}>
          <DialogContent className="max-w-md bg-[#12141c] border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-400">
                <UserCheck className="h-5 w-5" />
                Reintegra Utente nel Gruppo
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                Vuoi riabilitare e reintegrare{" "}
                <b>
                  {memberToReinstate.profile_name
                    ? `${memberToReinstate.profile_name} (${memberToReinstate.telegram_handle || `ID: ${memberToReinstate.telegram_user_id}`})`
                    : memberToReinstate.telegram_handle ||
                      `ID: ${memberToReinstate.telegram_user_id}`}
                </b>{" "}
                nel gruppo <b>"{group.title}"</b>? L'utente verrà unbannato ed un link di invito
                personalizzato gli verrà inviato direttamente su Telegram dal Bot.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 mt-3">
              <Button
                variant="ghost"
                onClick={() => setMemberToReinstate(null)}
                className="text-slate-400 hover:text-white"
              >
                Annulla
              </Button>
              <Button
                disabled={reinstateMemberMutation.isPending}
                onClick={() => reinstateMemberMutation.mutate(memberToReinstate.telegram_user_id)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {reinstateMemberMutation.isPending
                  ? "Reintegro in corso..."
                  : "Conferma e Reintegra"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function AddTelegramGroupDialog({ allRoles, onClose }: { allRoles: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [chatId, setChatId] = useState("");
  const [title, setTitle] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(["crole-admin"]);

  const createMutation = useMutation({
    mutationFn: async () => {
      return await registerTelegramGroupManual({
        data: {
          chatId,
          title: title || `Gruppo ${chatId}`,
          allowedRoleIds: selectedRoleIds,
        },
      });
    },
    onSuccess: () => {
      toast.success("Gruppo Telegram registrato con successo!");
      qc.invalidateQueries({ queryKey: ["telegram_groups"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message || "Errore nella registrazione del gruppo"),
  });

  const toggleRole = (rId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(rId) ? prev.filter((id) => id !== rId) : [...prev, rId],
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#0f111a] border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Send className="h-5 w-5 text-sky-400" />
            Aggiungi Gruppo Telegram
          </DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <div>
            <Label className="text-slate-300">ID Chat Telegram *</Label>
            <Input
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="-1002489100201"
              required
              className="font-mono bg-slate-900 border-slate-800 text-white"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Inserisci l'ID numerico del gruppo (es. <code>-1002489100201</code>). Puoi ottenerlo
              inviando il comando <code>/id</code> nel gruppo con il bot presente.
            </p>
          </div>

          <div>
            <Label className="text-slate-300">Nome / Titolo Gruppo</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Casinò Revenge — Staff Generale"
              className="bg-slate-900 border-slate-800 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Ruoli Abilitati all'Accesso</Label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl max-h-48 overflow-y-auto">
              <label className="flex items-center gap-2 text-xs text-amber-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes("crole-admin")}
                  onChange={() => toggleRole("crole-admin")}
                  className="rounded text-amber-500"
                />
                👑 Amministratore
              </label>
              {allRoles.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.includes(r.id)}
                    onChange={() => toggleRole(r.id)}
                    className="rounded text-sky-500"
                  />
                  <span className="truncate">{r.name}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              className="border-slate-800 text-slate-300 hover:text-white"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !chatId}
              className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold"
            >
              {createMutation.isPending ? "Registrazione..." : "Registra Gruppo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoleDialog({ role, onClose }: any) {
  const qc = useQueryClient();
  const [perms, setPerms] = useState<string[]>(role?.permissions ?? []);
  const [showInStaff, setShowInStaff] = useState<boolean>(role?.show_in_staff_list ?? true);
  const [staffWeight, setStaffWeight] = useState<number>(role?.staff_weight ?? 50);
  const [staffColor, setStaffColor] = useState<string>(role?.staff_color ?? "#3b82f6");

  const save = useMutation({
    mutationFn: async (v: any) => {
      const payload = {
        name: v.name,
        description: v.description || null,
        permissions: perms,
        show_in_staff_list: showInStaff,
        staff_weight: Number(staffWeight) || 50,
        staff_color: staffColor || "#3b82f6",
      };
      if (role) {
        const { error } = await supabase.from("custom_roles").update(payload).eq("id", role.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("custom_roles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
      toast.success("Salvato");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{role ? "Modifica ruolo" : "Nuovo ruolo"}</DialogTitle>
        </DialogHeader>
        <form
          id="role-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <div>
            <Label>Nome Ruolo *</Label>
            <Input name="name" required defaultValue={role?.name ?? ""} />
          </div>

          <div>
            <Label>Descrizione</Label>
            <Textarea name="description" rows={2} defaultValue={role?.description ?? ""} />
          </div>

          {/* Configurazione "La nostra Ciurma" (Staff List) */}
          <div className="p-3.5 border border-amber-500/20 bg-amber-500/5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInStaff}
                  onChange={(e) => setShowInStaff(e.target.checked)}
                  className="rounded text-amber-500"
                />
                ⚓ Mostra membri di questo ruolo nella Ciurma (Lista Staff)
              </label>
            </div>

            {showInStaff && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs">Peso Gerarchico (Ordina lista)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={staffWeight}
                    onChange={(e) => setStaffWeight(Number(e.target.value))}
                    className="bg-background"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    100 = Capitano, 50 = Operatore
                  </span>
                </div>

                <div>
                  <Label className="text-xs">Colore distintivo Ruolo</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={staffColor}
                      onChange={(e) => setStaffColor(e.target.value)}
                      className="w-10 h-9 p-1 bg-background cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={staffColor}
                      onChange={(e) => setStaffColor(e.target.value)}
                      className="font-mono text-xs bg-background uppercase"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>Permessi</Label>
            <div className="grid grid-cols-1 gap-1.5 mt-2 max-h-56 overflow-y-auto border border-border rounded-md p-3">
              {PERMISSIONS.map((p) => {
                const checked = perms.includes(p.key);
                return (
                  <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setPerms((cur) =>
                          e.target.checked ? [...cur, p.key] : cur.filter((x) => x !== p.key),
                        )
                      }
                    />
                    {p.label}
                    <span className="text-xs text-muted-foreground ml-auto font-mono">{p.key}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button form="role-form" type="submit" disabled={save.isPending}>
            Salva Ruolo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
