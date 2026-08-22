import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Pencil,
  Trash2,
  History,
  Users,
  Search,
  ShieldCheck,
  ChevronRight,
  User,
  Crown,
  Settings2,
  Calendar,
  Send,
  Coins,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AtSign,
  Bell,
  RefreshCw,
  Infinity as InfinityIcon,
  Banknote,
  Lock,
  LayoutTemplate,
  Check,
  Globe,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { MEMBERSHIP_LABEL, formatDate, formatMoney, formatDobloni } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  listMembershipPlans,
  saveMembershipPlan,
  deleteMembershipPlan,
  reorderMembershipPlans,
  assignCitizenMembership,
  checkMembershipExpirationsAndSendReminders,
  getHomepageMembershipConfig,
  saveHomepageMembershipConfig,
  MembershipPlan,
  HomepageMembershipConfig,
  DEFAULT_HOMEPAGE_MEMBERSHIP_CONFIG,
  DEFAULT_MEMBERSHIP_PLANS,
} from "@/lib/membership.functions";

export const Route = createFileRoute("/_authenticated/cittadini")({
  component: CitizensPage,
});

type Citizen = {
  id: string;
  full_name: string;
  nickname: string | null;
  membership: string;
  membership_plan_id?: string | null;
  membership_since: string | null;
  membership_expires_at?: string | null;
  telegram_handle?: string | null;
  notes: string | null;
  created_at: string;
};

function CitizensPage() {
  const qc = useQueryClient();
  const { profile, isAdmin, permissions = [] } = useAuth();

  const isStaff =
    isAdmin ||
    permissions.includes("cittadini.read") ||
    permissions.includes("cittadini.visualizza") ||
    permissions.includes("cittadini.gestisci") ||
    permissions.includes("cittadini.write") ||
    permissions.includes("cittadini.membership") ||
    profile?.has_employee_access === true ||
    profile?.show_in_staff_list === true;

  // Separate permissions as requested:
  // 1. Modificare anagrafica cittadino (nome, note, eliminazione)
  const canEditCitizen =
    isAdmin ||
    permissions.includes("cittadini.write") ||
    permissions.includes("cittadini.gestisci");

  // 2. Assegnare / Rinnovare membership ad un cittadino
  const canAssignMembership =
    isAdmin ||
    permissions.includes("cittadini.membership") ||
    permissions.includes("cittadini.gestisci");

  // 3. Creare / Modificare i piani membership (costo rinnovo in soldi o dobloni, giorni di rinnovo)
  const canManagePlans = isAdmin || permissions.includes("membership.gestisci");

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Citizen | null>(null);
  const [open, setOpen] = useState(false);

  const [membershipCitizen, setMembershipCitizen] = useState<Citizen | null>(null);
  const [membershipOpen, setMembershipOpen] = useState(false);

  const [plansOpen, setPlansOpen] = useState(false);

  const [historyCitizen, setHistoryCitizen] = useState<Citizen | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", description: "", onConfirm: () => {} });

  // Fetch all citizens
  const { data: citizens = [] } = useQuery({
    queryKey: ["citizens"],
    queryFn: async () => {
      const { data, error } = await supabase.from("citizens").select("*").order("full_name");
      if (error) throw error;
      return (data || []) as Citizen[];
    },
  });

  // Fetch membership plans
  const { data: membershipPlans = DEFAULT_MEMBERSHIP_PLANS } = useQuery({
    queryKey: ["membership-plans"],
    queryFn: async () => {
      return await listMembershipPlans();
    },
  });

  // Fetch all profiles for operator and telegram lookup
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, telegram_handle, telegram_connected");
      return (data || []) as any[];
    },
  });

  const profileMap = useMemo(() => {
    return Object.fromEntries(profiles.map((p) => [p.id, p]));
  }, [profiles]);

  const plansMap = useMemo(() => {
    const map = new Map<string, MembershipPlan>();
    membershipPlans.forEach((p) => {
      map.set(p.code, p);
      map.set(p.id, p);
    });
    return map;
  }, [membershipPlans]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("citizens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["citizens"] });
      toast.success("Cittadino eliminato dal registro");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredCitizens = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return citizens;
    return citizens.filter((c) => {
      const name = (c.full_name || c.nickname || "").toLowerCase();
      const notes = (c.notes || "").toLowerCase();
      const mem = (c.membership || "").toLowerCase();
      const tg = (c.telegram_handle || "").toLowerCase();
      return name.includes(s) || notes.includes(s) || mem.includes(s) || tg.includes(s);
    });
  }, [citizens, search]);

  const createdTodayCount = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return citizens.filter((c) => {
      if (!c.created_at) return false;
      return new Date(c.created_at) >= startOfDay;
    }).length;
  }, [citizens]);

  if (!isStaff) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="h-16 w-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-2xl">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">
            Accesso Riservato allo Staff
          </h2>
          <p className="text-slate-400 text-sm">
            Il registro clienti del gestionale è riservato esclusivamente al personale autorizzato
            del Casinò Revenge. La tua Scheda Cittadino personale è disponibile sul sito principale.
          </p>
        </div>
        <div className="pt-2">
          <Button
            asChild
            size="lg"
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl px-6"
          >
            <Link to="/scheda-cittadino">
              <User className="h-4 w-4 mr-2" />
              Apri La Mia Scheda Cittadino
              <ChevronRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

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
          ANAGRAFICA CITTADINI, MEMBERSHIP E GESTIONE RINNOVI TELEGRAM
        </p>
      </div>

      {/* REGISTRO GENERALE CITTAGINI */}
      <div className="space-y-6">
        {/* Control Header Box */}
        <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold flex items-center justify-center shrink-0 shadow-inner">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold uppercase text-white tracking-wider">
                  REGISTRO CLIENTI ({citizens.length})
                </h2>
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px] font-mono"
                >
                  {membershipPlans.length} Piani Attivi
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Anagrafica unificata, assegnazione membership con notifica Telegram e avviso
                scadenze
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <div className="flex items-center gap-2 bg-[#0a0b10] border border-slate-800 rounded-xl px-3.5 py-2 w-full sm:w-64 shadow-inner">
              <Search className="h-4 w-4 text-amber-400 shrink-0" />
              <Input
                placeholder="Cerca cittadino o @telegram…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 bg-transparent text-white p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-500 text-xs font-medium"
              />
            </div>

            {/* Piani Membership Configurator (Admin / membership.gestisci) */}
            {canManagePlans && (
              <Button
                variant="outline"
                className="bg-[#0a0b10] border-amber-500/30 text-amber-300 hover:bg-amber-500/10 font-bold text-xs rounded-xl uppercase tracking-wider shrink-0"
                onClick={() => setPlansOpen(true)}
              >
                <Settings2 className="h-4 w-4 mr-1.5 text-amber-400" />
                Piani Membership
              </Button>
            )}

            {/* Nuovo Cittadino (canEditCitizen) */}
            {canEditCitizen && (
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider shadow-lg shadow-amber-500/10 shrink-0"
                onClick={() => {
                  if (createdTodayCount >= 5) {
                    toast.error(
                      "Limite giornaliero raggiunto: non puoi creare più di 5 cittadini al giorno nella sezione Cittadini!",
                      { duration: 5000 },
                    );
                    return;
                  }
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" /> Nuovo Cittadino
              </Button>
            )}
          </div>
        </div>

        {/* TABLE OF CITIZENS */}
        <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl overflow-hidden">
          <Table>
            <TableHeader className="bg-[#0a0b10] border-b border-slate-800">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5">
                  Cittadino / Giocatore
                </TableHead>
                <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5">
                  Livello Membership & Scadenza
                </TableHead>
                <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5">
                  Contatto Telegram
                </TableHead>
                <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5">
                  Note & Informazioni
                </TableHead>
                <TableHead className="text-right text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5">
                  Azioni
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCitizens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500 text-sm">
                    {search
                      ? "Nessun cittadino corrisponde ai criteri di ricerca."
                      : "Nessun cittadino registrato nel sistema."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCitizens.map((c) => {
                  const displayName = c.full_name || c.nickname || "Cittadino";
                  const plan =
                    plansMap.get(c.membership) || plansMap.get(c.membership_plan_id || "") || null;

                  // Compute expiration status
                  let expStatus: "active" | "expiring_soon" | "expired" | "none" = "none";
                  let daysLeft = 0;
                  if (c.membership_expires_at && c.membership !== "standard") {
                    const exp = new Date(c.membership_expires_at);
                    exp.setHours(0, 0, 0, 0);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    {
                      const diffTime = exp.getTime() - now.getTime();
                      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      if (daysLeft < 0) expStatus = "expired";
                      else if (daysLeft <= 3) expStatus = "expiring_soon";
                      else expStatus = "active";
                    }
                  }

                  const tgInfo = getAssociatedTelegramInfo(c, profiles);

                  return (
                    <TableRow
                      key={c.id}
                      className="border-slate-800 hover:bg-slate-800/30 transition-colors"
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://mc-heads.net/avatar/${encodeURIComponent(displayName)}/36`}
                            alt="Minecraft Avatar"
                            className="h-10 w-10 rounded-xl border border-amber-500/30 bg-[#0a0b10] object-cover shadow-sm shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://minotar.net/helm/Steve/36.png";
                            }}
                          />
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-white text-sm">{displayName}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <span>
                                Membro dal {formatDate(c.membership_since || c.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <DynamicMembershipBadge plan={plan} fallbackTier={c.membership} />
                          {!c.membership_expires_at || c.membership === "standard" ? (
                            <div className="text-[11px] font-mono flex items-center gap-1.5 text-slate-400">
                              <InfinityIcon className="h-3.5 w-3.5 text-slate-400" />
                              <span>Permanente • Gratuita</span>
                            </div>
                          ) : (
                            <div className="text-[11px] font-mono flex items-center gap-1.5">
                              {expStatus === "expiring_soon" ? (
                                <span className="text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                                  <AlertTriangle className="h-3 w-3" /> Scade{" "}
                                  {daysLeft === 0 ? "Oggi" : `tra ${daysLeft}gg`} (
                                  {formatDate(c.membership_expires_at)})
                                </span>
                              ) : expStatus === "expired" ? (
                                <span className="text-red-400 font-bold flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30">
                                  <Clock className="h-3 w-3" /> Scaduta il{" "}
                                  {formatDate(c.membership_expires_at)}
                                </span>
                              ) : (
                                <span className="text-slate-400">
                                  Scadenza: {formatDate(c.membership_expires_at)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-4 font-mono text-xs">
                        {tgInfo ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20 font-bold">
                              <AtSign className="h-3 w-3" />
                              {tgInfo.handle.replace(/^@/, "")}
                            </span>
                            {tgInfo.isVerified && (
                              <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-sans font-semibold">
                                <CheckCircle2 className="h-3 w-3" /> Registrato / Bot
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">Non associato</span>
                        )}
                      </TableCell>

                      <TableCell className="py-4 text-xs text-slate-400 max-w-xs truncate">
                        {c.notes || <span className="text-slate-600 italic">Nessuna nota</span>}
                      </TableCell>

                      <TableCell className="text-right py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Storico Operazioni */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                            onClick={() => {
                              setHistoryCitizen(c);
                              setHistoryOpen(true);
                            }}
                          >
                            <History className="h-3.5 w-3.5 mr-1" /> Storico
                          </Button>

                          {/* Pulsante Separato: Assegna / Rinnova Membership */}
                          {canAssignMembership && (
                            <Button
                              size="sm"
                              className="h-8 px-2.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black shadow-sm"
                              onClick={() => {
                                setMembershipCitizen(c);
                                setMembershipOpen(true);
                              }}
                              title="Assegna o Rinnova Membership"
                            >
                              <Crown className="h-3.5 w-3.5 mr-1 text-amber-400" /> Membership
                            </Button>
                          )}

                          {/* Pulsanti Modifica / Elimina Anagrafica */}
                          {canEditCitizen && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl"
                                onClick={() => {
                                  setEditing(c);
                                  setOpen(true);
                                }}
                                title="Modifica Anagrafica"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl"
                                onClick={() => {
                                  setDeleteConfirm({
                                    isOpen: true,
                                    title: "Elimina Cittadino",
                                    description: `Sei sicuro di voler eliminare dal registro il cittadino "${displayName}"? L'azione non è reversibile.`,
                                    onConfirm: () => del.mutate(c.id),
                                  });
                                }}
                                title="Elimina Cittadino"
                              >
                                <Trash2 className="h-4 w-4" />
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
        </div>
      </div>

      {/* MODAL CREAZIONE / MODIFICA ANAGRAFICA CITTADINO (UNICO CAMPO NOME) */}
      {open && (
        <CitizenDialog
          open={open}
          onOpenChange={setOpen}
          citizen={editing}
          createdTodayCount={createdTodayCount}
          profiles={profiles}
        />
      )}

      {/* MODAL ASSEGNAZIONE / RINNOVO MEMBERSHIP (CON NOTIFICA TELEGRAM) */}
      {membershipOpen && membershipCitizen && (
        <AssignMembershipModal
          open={membershipOpen}
          onOpenChange={setMembershipOpen}
          citizen={membershipCitizen}
          plans={membershipPlans}
          profiles={profiles}
        />
      )}

      {/* MODAL GESTIONE PIANI MEMBERSHIP (PER ADMIN) */}
      {plansOpen && (
        <MembershipPlansModal
          open={plansOpen}
          onOpenChange={setPlansOpen}
          plans={membershipPlans}
        />
      )}

      {/* MODAL STORICO OPERAZIONI CITTADINO */}
      {historyOpen && historyCitizen && (
        <CitizenHistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          citizen={historyCitizen}
          profileMap={profileMap}
        />
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

/* -------------------------------------------------------------------------- */
/*                            DYNAMIC MEMBERSHIP BADGE                        */
/* -------------------------------------------------------------------------- */

function DynamicMembershipBadge({
  plan,
  fallbackTier,
}: {
  plan: MembershipPlan | null;
  fallbackTier: string;
}) {
  const tier = (plan?.code || fallbackTier || "standard").toLowerCase();
  const label = plan?.name || MEMBERSHIP_LABEL[tier] || tier.toUpperCase();

  const color =
    plan?.badge_color ||
    (tier === "vip"
      ? "#f59e0b"
      : tier === "elite"
        ? "#a855f7"
        : tier === "exclusive"
          ? "#38bdf8"
          : "#64748b");

  return (
    <Badge
      style={{
        backgroundColor: `${color}25`,
        borderColor: `${color}60`,
        color: color === "#64748b" ? "#cbd5e1" : color,
      }}
      className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-0.5 border font-bold shadow-sm"
    >
      {label}
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/*                  HELPER RISOLUZIONE TELEGRAM DALLA REGISTRAZIONE          */
/* -------------------------------------------------------------------------- */

function getAssociatedTelegramInfo(citizen: Citizen, profiles: any[]) {
  const citName = (citizen.full_name || citizen.nickname || "").trim().toLowerCase();
  const citHandleRaw = (citizen.telegram_handle || "").trim().toLowerCase().replace("@", "");

  const matched = profiles.find((p) => {
    const pUser = (p.username || "").trim().toLowerCase();
    const pDisplay = (p.display_name || "").trim().toLowerCase();
    const pHandle = (p.telegram_handle || "").trim().toLowerCase().replace("@", "");

    return (
      (pUser && pUser === citName) ||
      (pDisplay && pDisplay === citName) ||
      (pHandle && citHandleRaw && pHandle === citHandleRaw)
    );
  });

  if (matched && matched.telegram_connected && matched.telegram_handle) {
    const h = matched.telegram_handle.trim();
    return {
      handle: h.startsWith("@") ? h : `@${h}`,
      isVerified: true,
      source: "registration" as const,
      profile: matched,
    };
  }

  if (citizen.telegram_handle) {
    const h = citizen.telegram_handle.trim();
    return {
      handle: h.startsWith("@") ? h : `@${h}`,
      isVerified: false,
      source: "manual" as const,
      profile: null,
    };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*                  CITIZEN ANAGRAFICA DIALOG (UNIFIED FIELD)                 */
/* -------------------------------------------------------------------------- */

function CitizenDialog({
  open,
  onOpenChange,
  citizen,
  createdTodayCount,
  profiles = [],
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  citizen: Citizen | null;
  createdTodayCount: number;
  profiles?: any[];
}) {
  const qc = useQueryClient();
  const isEdit = !!citizen;

  const currentName = citizen?.full_name || citizen?.nickname || "";
  const [name, setName] = useState(currentName);
  const [notes, setNotes] = useState(citizen?.notes || "");

  const autoTelegramInfo = useMemo(() => {
    if (!name.trim()) return null;
    const dummyCit = {
      full_name: name.trim(),
      nickname: name.trim(),
      telegram_handle: citizen?.telegram_handle,
    } as Citizen;
    return getAssociatedTelegramInfo(dummyCit, profiles);
  }, [name, citizen, profiles]);

  const save = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("Il nome del cittadino / nickname Minecraft è obbligatorio");
      }

      // Auto-detect handle from site registration / /associa flow, or preserve existing
      const effectiveTg = autoTelegramInfo?.handle || citizen?.telegram_handle || null;
      const cleanTelegram = effectiveTg
        ? effectiveTg.startsWith("@")
          ? effectiveTg
          : `@${effectiveTg}`
        : null;

      const payload: any = {
        full_name: trimmedName,
        nickname: trimmedName, // Unified into single space
        telegram_handle: cleanTelegram,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (isEdit && citizen) {
        const { error } = await supabase.from("citizens").update(payload).eq("id", citizen.id);
        if (error) throw error;
      } else {
        if (createdTodayCount >= 5) {
          throw new Error(
            "Limite giornaliero raggiunto: non puoi creare più di 5 cittadini al giorno nella sezione Cittadini!",
          );
        }
        payload.membership = "standard";
        payload.membership_expires_at = null; // Standard is permanent by default
        payload.created_at = new Date().toISOString();
        const { error } = await supabase.from("citizens").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["citizens"] });
      qc.invalidateQueries({ queryKey: ["citizens-mini"] });
      toast.success(isEdit ? "Anagrafica cittadino aggiornata" : "Cittadino creato con successo");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#12141c] border-slate-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase tracking-wider text-white">
            {isEdit ? "Modifica Anagrafica Cittadino" : "Nuovo Cittadino"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Unico campo identificativo per nome cittadino e nickname Minecraft
          </DialogDescription>
        </DialogHeader>

        {!isEdit && createdTodayCount >= 5 && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
            <span>
              ⚠️ Limite giornaliero raggiunto: sono già stati creati {createdTodayCount} cittadini
              oggi.
            </span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4 pt-1"
        >
          <div>
            <Label className="text-xs font-bold text-slate-300">
              Nome Cittadino / Nickname Minecraft *
            </Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1.5 font-medium"
              placeholder="Es: Mario Rossi oppure Steve123"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Inserisci il nome visualizzato o nickname Minecraft utilizzato nel server.
            </p>
          </div>

          {/* Banner Stato Associazione Telegram con /associa */}
          {autoTelegramInfo?.isVerified ? (
            <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-sky-300">
                    Account Telegram Collegato: {autoTelegramInfo.handle}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Verificato tramite registrazione o comando <code>/associa</code> sul Bot
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                /associa Attivo
              </Badge>
            </div>
          ) : (
            <div className="bg-[#0a0b10] border border-slate-800 rounded-xl p-3 text-xs flex items-center gap-2.5 text-slate-400">
              <Send className="h-4 w-4 text-sky-400 shrink-0" />
              <p className="text-[11px]">
                L'account Telegram viene associato automaticamente tramite il comando{" "}
                <code>/associa</code> sul Bot al momento della registrazione.
              </p>
            </div>
          )}

          <div>
            <Label className="text-xs font-bold text-slate-300">Note & Preferenze</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1.5 text-xs"
              placeholder="Preferenze tavoli, recapiti o note interne..."
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-transparent border-slate-800 text-slate-300 hover:text-white rounded-xl"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={save.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl"
            >
              {save.isPending ? "Salvataggio..." : isEdit ? "Salva Modifiche" : "Crea Cittadino"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*            MODAL ASSEGNAZIONE / RINNOVO MEMBERSHIP AL CITTADINO            */
/* -------------------------------------------------------------------------- */

function AssignMembershipModal({
  open,
  onOpenChange,
  citizen,
  plans,
  profiles = [],
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  citizen: Citizen;
  plans: MembershipPlan[];
  profiles?: any[];
}) {
  const qc = useQueryClient();

  const tgInfo = useMemo(() => getAssociatedTelegramInfo(citizen, profiles), [citizen, profiles]);

  const [selectedPlanCode, setSelectedPlanCode] = useState<string>(
    citizen.membership || "standard",
  );
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const selectedPlan = useMemo(() => {
    return (
      plans.find((p) => p.code === selectedPlanCode) || plans[0] || DEFAULT_MEMBERSHIP_PLANS[0]
    );
  }, [plans, selectedPlanCode]);

  const isStandard =
    selectedPlan.code === "standard" ||
    selectedPlan.is_permanent ||
    (selectedPlan.renewal_days === 0 && (selectedPlan.cost_eur === 0 || !selectedPlan.cost_eur));

  // Payment Method States (EUR, DOBLONI, or FREE)
  const [paymentMethod, setPaymentMethod] = useState<"EUR" | "DOBLONI" | "FREE">(
    isStandard ? "FREE" : "EUR",
  );

  // Sync pricing defaults when plan changes
  const handlePlanChange = (code: string) => {
    setSelectedPlanCode(code);
    const plan =
      plans.find((p) => p.code === code) || DEFAULT_MEMBERSHIP_PLANS.find((p) => p.code === code);
    const isStd =
      plan?.code === "standard" ||
      plan?.is_permanent ||
      (plan?.renewal_days === 0 && (plan?.cost_eur === 0 || !plan?.cost_eur));

    if (isStd) {
      setPaymentMethod("FREE");
    } else {
      setPaymentMethod("EUR");
    }
  };

  // Compute calculated expiration (strictly locked for employees)
  const calculatedExpiration = useMemo(() => {
    if (isStandard || !startDate) return null;
    const d = new Date(startDate);
    const days = selectedPlan.renewal_days || 30;
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }, [startDate, selectedPlan, isStandard]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      let finalEur = 0;
      let finalDobloni = 0;

      if (paymentMethod === "EUR") {
        finalEur = Number(selectedPlan.cost_eur || selectedPlan.renewal_cost || 0);
        finalDobloni = 0;
      } else if (paymentMethod === "DOBLONI") {
        finalEur = 0;
        finalDobloni = Number(selectedPlan.cost_dobloni || 0);
      } else {
        // FREE
        finalEur = 0;
        finalDobloni = 0;
      }

      return await assignCitizenMembership({
        data: {
          citizenId: citizen.id,
          membershipCode: selectedPlan.code,
          planId: selectedPlan.id,
          startDate: startDate,
          paymentMethod: paymentMethod,
          amountEur: finalEur,
          amountDobloni: finalDobloni,
        },
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["citizens"] });
      qc.invalidateQueries({ queryKey: ["all-membership-sales-stipendi"] });
      if (res.telegramSent) {
        toast.success(
          `Membership "${selectedPlan.name}" attivata! Notifica Telegram inviata con successo a ${res.targetHandle}.`,
        );
      } else if (res.targetHandle) {
        toast.success(
          `Membership "${selectedPlan.name}" attivata. (In attesa di connessione bot Telegram per ${res.targetHandle})`,
        );
      } else {
        toast.success(`Membership "${selectedPlan.name}" assegnata al cittadino.`);
      }
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Errore durante l'assegnazione della membership");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#12141c] border-slate-800 text-white max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black uppercase tracking-wider text-white">
                Assegna / Rinnova Membership
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Cliente:{" "}
                <span className="text-white font-bold">
                  {citizen.full_name || citizen.nickname}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Plan Selector */}
          <div>
            <Label className="text-xs font-bold text-slate-300">Seleziona Piano Membership</Label>
            <Select value={selectedPlanCode} onValueChange={handlePlanChange}>
              <SelectTrigger className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1.5 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#12141c] border-slate-800 text-white">
                {plans.map((p) => {
                  const isStd = p.code === "standard" || p.is_permanent || p.renewal_days === 0;
                  const priceLabel = isStd
                    ? "Gratuita • Permanente"
                    : `${formatMoney(p.cost_eur || p.renewal_cost || 0)} / ${formatDobloni(p.cost_dobloni || 0)}`;

                  return (
                    <SelectItem key={p.code} value={p.code}>
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span className="font-bold">{p.name}</span>
                        <span className="text-xs font-mono text-amber-400">{priceLabel}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Plan Details Card */}
          <div className="bg-[#0a0b10] border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Listino & Valute Accettate:</span>
              <span className="font-mono font-bold text-amber-400">
                {isStandard ? (
                  <span className="text-emerald-400 font-bold">Gratuita (0€ / 0⛃)</span>
                ) : (
                  <span>
                    {formatMoney(selectedPlan.cost_eur || selectedPlan.renewal_cost || 0)}{" "}
                    <span className="text-slate-500 font-normal">oppure</span>{" "}
                    {formatDobloni(selectedPlan.cost_dobloni || 0)}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Durata Validità:</span>
              <span className="font-mono font-bold text-sky-400 flex items-center gap-1">
                {isStandard ? (
                  <>
                    <InfinityIcon className="h-3.5 w-3.5 text-slate-400" />
                    <span>Permanente (Senza Scadenza)</span>
                  </>
                ) : (
                  `${selectedPlan.renewal_days} Giorni`
                )}
              </span>
            </div>
            {selectedPlan.description && (
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                {selectedPlan.description}
              </p>
            )}

            {/* List of advantages with checkmarks */}
            {selectedPlan.advantages && selectedPlan.advantages.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Vantaggi Inclusi nel Piano:
                </span>
                <div className="grid grid-cols-1 gap-1">
                  {selectedPlan.advantages.map((adv, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>{adv}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Selector (Only for paid plans: EUR or DOBLONI) */}
          {!isStandard ? (
            <div className="bg-[#0a0b10] border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div>
                <Label className="text-xs font-bold text-slate-300">
                  Modalità di Pagamento Rinnovo
                </Label>
                <div className="grid grid-cols-2 gap-2.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("EUR")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      paymentMethod === "EUR"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm"
                        : "bg-[#12141c] border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Banknote className="h-4 w-4" />
                    <span>In Soldi EUR (€)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("DOBLONI")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      paymentMethod === "DOBLONI"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm"
                        : "bg-[#12141c] border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Coins className="h-4 w-4" />
                    <span>In Dobloni (⛃)</span>
                  </button>
                </div>
              </div>

              {/* Locked Read-only Pricing Card taken directly from plan configuration */}
              {paymentMethod === "EUR" && (
                <div className="bg-[#12141c] border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Banknote className="h-3.5 w-3.5 text-amber-400" />
                      Importo Incassato in Soldi EUR
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Lock className="h-3 w-3 text-amber-400 shrink-0" />
                      Importo fisso da listino piano (non modificabile manualmente).
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
                      {formatMoney(selectedPlan.cost_eur || selectedPlan.renewal_cost || 0)}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === "DOBLONI" && (
                <div className="bg-[#12141c] border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-amber-400" />
                      Importo Incassato in Dobloni
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Lock className="h-3 w-3 text-amber-400 shrink-0" />
                      Importo fisso da listino piano (non modificabile manualmente).
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
                      {formatDobloni(selectedPlan.cost_dobloni || 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs flex items-center gap-2.5 text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                La membership <b>Standard</b> è il livello base permanente e gratuito incluso di
                default alla registrazione.
              </span>
            </div>
          )}

          {/* Start Date & Expiration (Expiration is strictly locked and cannot be edited by employees) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-300">Data Attivazione</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1.5 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-300">Data Scadenza Calcolata</Label>
              <div className="bg-[#0a0b10]/70 border border-slate-800 rounded-xl mt-1.5 h-9 px-3 flex items-center text-xs font-mono text-amber-300 select-none">
                {isStandard ? (
                  <span className="text-slate-400 flex items-center gap-1">
                    <InfinityIcon className="h-3.5 w-3.5" /> Permanente (Nessuna scadenza)
                  </span>
                ) : (
                  <span>
                    {formatDate(calculatedExpiration!)} (+{selectedPlan.renewal_days}gg)
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Calcolata automaticamente dal sistema (non modificabile dai dipendenti).
              </p>
            </div>
          </div>

          {/* Telegram Association Info Banner (Automatic via /associa) */}
          {tgInfo?.isVerified ? (
            <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Account Telegram Collegato Ufficiale
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-500/30">
                  /associa attivo
                </span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Handle: <span className="font-bold text-white font-mono">{tgInfo.handle}</span>. La
                notifica di attivazione e i promemoria di scadenza verranno inviati automaticamente
                a questo account.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <AlertTriangle className="h-3.5 w-3.5" />
                Telegram non ancora associato
              </div>
              <p className="text-slate-400 text-[11px]">
                Il cittadino non ha ancora collegato il proprio account Telegram sul Bot tramite{" "}
                <code>/associa</code>. Le notifiche si attiveranno automaticamente non appena
                completerà l'associazione.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-slate-800 text-slate-300 hover:text-white rounded-xl"
          >
            Annulla
          </Button>
          <Button
            type="button"
            disabled={assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20"
          >
            {assignMutation.isPending ? "Salvataggio..." : "Conferma Assegnazione"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*             MODAL GESTIONE PIANI MEMBERSHIP & HOMEPAGE (ADMIN)             */
/* -------------------------------------------------------------------------- */

function MembershipPlansModal({
  open,
  onOpenChange,
  plans,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  plans: MembershipPlan[];
}) {
  const qc = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [activeTab, setActiveTab] = useState<"plans" | "homepage">("plans");

  // Plan editor states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [costEur, setCostEur] = useState<number>(10000);
  const [costDobloni, setCostDobloni] = useState<number>(1000);
  const [renewalDays, setRenewalDays] = useState<number>(30);
  const [description, setDescription] = useState("");
  const [advantagesText, setAdvantagesText] = useState("");
  const [highlightTag, setHighlightTag] = useState("");
  const [showInHomepage, setShowInHomepage] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [badgeColor, setBadgeColor] = useState("#f59e0b");
  const [planToDelete, setPlanToDelete] = useState<MembershipPlan | null>(null);

  // Homepage customizer states
  const { data: homepageConfig = DEFAULT_HOMEPAGE_MEMBERSHIP_CONFIG } = useQuery({
    queryKey: ["homepage-membership-config"],
    queryFn: async () => await getHomepageMembershipConfig(),
    enabled: open,
  });

  const [hpBadge, setHpBadge] = useState("");
  const [hpTitle, setHpTitle] = useState("");
  const [hpSubtitle, setHpSubtitle] = useState("");
  const [hpVisible, setHpVisible] = useState(true);
  const [hpShowDobloni, setHpShowDobloni] = useState(true);
  const [hpCtaText, setHpCtaText] = useState("");
  const [hpCtaLink, setHpCtaLink] = useState("");

  // Sync homepage form state when config loads
  useMemo(() => {
    if (homepageConfig) {
      setHpBadge(homepageConfig.badge_text || "Livelli di Abbonamento");
      setHpTitle(homepageConfig.section_title || "Membership & Privilege Cards");
      setHpSubtitle(
        homepageConfig.section_subtitle ||
          "Sblocca vantaggi esclusivi, accessi riservati, maggiordomo e cassetta di sicurezza.",
      );
      setHpVisible(homepageConfig.is_section_visible ?? true);
      setHpShowDobloni(homepageConfig.show_dobloni_price ?? true);
      setHpCtaText(homepageConfig.cta_button_text || "Richiedi in Cassa");
      setHpCtaLink(homepageConfig.cta_button_link || "#valute");
    }
  }, [homepageConfig]);

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      return await reorderMembershipPlans({ data: { orderedIds } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["membership-plans"] });
      qc.invalidateQueries({ queryKey: ["public-membership-plans"] });
      toast.success("Ordinamento membership aggiornato con successo!");
    },
    onError: (err: any) => toast.error(err?.message || "Errore ordinamento piani"),
  });

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newPlans = [...plans];
    const temp = newPlans[index];
    newPlans[index] = newPlans[index - 1];
    newPlans[index - 1] = temp;
    reorderMutation.mutate(newPlans.map((p) => p.id));
  };

  const handleMoveDown = (index: number) => {
    if (index >= plans.length - 1) return;
    const newPlans = [...plans];
    const temp = newPlans[index];
    newPlans[index] = newPlans[index + 1];
    newPlans[index + 1] = temp;
    reorderMutation.mutate(newPlans.map((p) => p.id));
  };

  const handleSortByPrestige = () => {
    const sorted = [...plans].sort((a, b) => {
      const costA = a.cost_eur ?? a.renewal_cost ?? 0;
      const costB = b.cost_eur ?? b.renewal_cost ?? 0;
      if (costB !== costA) return costB - costA;
      const dobloniA = a.cost_dobloni ?? 0;
      const dobloniB = b.cost_dobloni ?? 0;
      return dobloniB - dobloniA;
    });
    reorderMutation.mutate(sorted.map((p) => p.id));
  };

  const handleSortAscending = () => {
    const sorted = [...plans].sort((a, b) => {
      const costA = a.cost_eur ?? a.renewal_cost ?? 0;
      const costB = b.cost_eur ?? b.renewal_cost ?? 0;
      if (costA !== costB) return costA - costB;
      const dobloniA = a.cost_dobloni ?? 0;
      const dobloniB = b.cost_dobloni ?? 0;
      return dobloniA - dobloniB;
    });
    reorderMutation.mutate(sorted.map((p) => p.id));
  };

  const openEdit = (p: MembershipPlan) => {
    if (p.code === "standard" || p.id === "plan-standard" || p.is_permanent) {
      toast.error("Il piano Standard è il piano base permanente e non può essere modificato.");
      return;
    }
    setEditingPlan(p);
    setIsCreating(false);
    setName(p.name);
    setCode(p.code);
    setCostEur(p.cost_eur ?? p.renewal_cost ?? 10000);
    setCostDobloni(p.cost_dobloni ?? 1000);
    setRenewalDays(p.renewal_days ?? 30);
    setDescription(p.description || "");
    setAdvantagesText(
      p.advantages && p.advantages.length > 0 ? p.advantages.join("\n") : p.description || "",
    );
    setHighlightTag(p.highlight_tag || "");
    setShowInHomepage(p.show_in_homepage ?? true);
    setDisplayOrder(p.display_order ?? 1);
    setBadgeColor(p.badge_color || "#f59e0b");
  };

  const openNew = () => {
    setEditingPlan(null);
    setIsCreating(true);
    setName("");
    setCode("");
    setCostEur(15000);
    setCostDobloni(1500);
    setRenewalDays(30);
    setDescription("");
    setAdvantagesText(
      "Ingresso prioritario senza code\nSconto 10% sui servizi interni\n1 Consumazione omaggio",
    );
    setHighlightTag("");
    setShowInHomepage(true);
    setDisplayOrder((plans.length || 0) + 1);
    setBadgeColor("#f59e0b");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsedAdvantages = advantagesText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      return await saveMembershipPlan({
        data: {
          id: editingPlan?.id,
          name: name.trim(),
          code: code.trim().toLowerCase().replace(/\s+/g, "_"),
          cost_eur: Number(costEur),
          cost_dobloni: Number(costDobloni),
          renewal_days: Number(renewalDays),
          description: description.trim(),
          advantages: parsedAdvantages,
          highlight_tag: highlightTag.trim(),
          show_in_homepage: showInHomepage,
          display_order: Number(displayOrder),
          badge_color: badgeColor,
          is_active: true,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["membership-plans"] });
      qc.invalidateQueries({ queryKey: ["public-membership-plans"] });
      toast.success("Piano Membership e Vantaggi salvati con successo!");
      setEditingPlan(null);
      setIsCreating(false);
    },
    onError: (err: any) => toast.error(err?.message || "Errore salvataggio piano"),
  });

  const saveHomepageConfigMutation = useMutation({
    mutationFn: async () => {
      return await saveHomepageMembershipConfig({
        data: {
          badge_text: hpBadge.trim(),
          section_title: hpTitle.trim(),
          section_subtitle: hpSubtitle.trim(),
          is_section_visible: hpVisible,
          show_dobloni_price: hpShowDobloni,
          cta_button_text: hpCtaText.trim(),
          cta_button_link: hpCtaLink.trim(),
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["homepage-membership-config"] });
      qc.invalidateQueries({ queryKey: ["public-membership-plans"] });
      toast.success("Personalizzazione Homepage salvata con successo!");
    },
    onError: (err: any) => toast.error(err?.message || "Errore salvataggio homepage"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteMembershipPlan({ data: { id } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["membership-plans"] });
      qc.invalidateQueries({ queryKey: ["public-membership-plans"] });
      toast.success("Piano eliminato");
      if (editingPlan) {
        setEditingPlan(null);
        setIsCreating(false);
      }
    },
    onError: (err: any) => toast.error(err?.message || "Errore eliminazione"),
  });

  const triggerReminders = async () => {
    setIsSendingReminders(true);
    try {
      const res = await checkMembershipExpirationsAndSendReminders();
      if (res.remindedCount > 0) {
        toast.success(`Inviati ${res.remindedCount} promemoria Telegram ai cittadini in scadenza!`);
      } else {
        toast.info(
          "Nessuna membership in scadenza (nei prossimi 3 giorni) con account Telegram collegato.",
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Errore durante l'invio promemoria");
    } finally {
      setIsSendingReminders(false);
    }
  };

  const parsedAdvantagesPreview = useMemo(() => {
    return advantagesText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }, [advantagesText]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#12141c] border-slate-800 text-white max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black uppercase tracking-wider text-white">
                  Gestione Membership & Vetrina Homepage
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Definisci vantaggi con spunta, prezzi fissi e personalizza la homepage
                </DialogDescription>
              </div>
            </div>

            {activeTab === "plans" && (
              <Button
                size="sm"
                onClick={openNew}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20"
              >
                <Plus className="h-4 w-4 mr-1" /> Nuovo Piano
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Tab switchers */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab("plans")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "plans"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Crown className="h-3.5 w-3.5" />
            <span>Piani & Vantaggi Membership</span>
            <Badge className="bg-slate-800 text-slate-300 text-[10px] ml-1">{plans.length}</Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("homepage")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "homepage"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Personalizza Sezione Homepage</span>
            <Badge className="bg-amber-500/20 text-amber-400 text-[10px] ml-1">Live</Badge>
          </button>
        </div>

        {/* TAB 1: PLANS & ADVANTAGES */}
        {activeTab === "plans" && (
          <div className="space-y-4 pt-1">
            {/* Action bar for manual expiration check */}
            <div className="bg-[#0a0b10] border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Bell className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  Promemoria automatico Telegram attivo (da 3 giorni prima della scadenza).
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={isSendingReminders}
                onClick={triggerReminders}
                className="bg-[#12141c] border-slate-700 text-amber-300 hover:bg-amber-500/10 text-xs font-bold shrink-0"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 mr-1 ${isSendingReminders ? "animate-spin" : ""}`}
                />
                Verifica Scadenze Ora
              </Button>
            </div>

            {/* Plan Editor Form */}
            {(isCreating || editingPlan) && (
              <div className="bg-[#0f1118] border border-amber-500/30 rounded-xl p-4 space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                      {isCreating
                        ? "Crea Nuovo Piano Membership"
                        : `Modifica Piano: ${editingPlan?.name}`}
                    </h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-slate-400 hover:text-white"
                    onClick={() => {
                      setEditingPlan(null);
                      setIsCreating(false);
                    }}
                  >
                    Chiudi Modifica
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-300">Nome Piano *</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Es: VIP Diamante"
                      className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Codice Univoco *</Label>
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Es: vip_diamante"
                      className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">
                      Tag in Evidenza (Badge)
                    </Label>
                    <Input
                      value={highlightTag}
                      onChange={(e) => setHighlightTag(e.target.value)}
                      placeholder="Es: Consigliata, Più Popolare..."
                      className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">
                      Costo in Soldi EUR (€)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={costEur}
                      onChange={(e) => setCostEur(Number(e.target.value))}
                      placeholder="Es: 25000"
                      className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Costo in Dobloni (⛃)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={costDobloni}
                      onChange={(e) => setCostDobloni(Number(e.target.value))}
                      placeholder="Es: 2500"
                      className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1 text-xs font-mono text-amber-400"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">
                      Durata Validità (Giorni)
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={renewalDays}
                      onChange={(e) => setRenewalDays(Number(e.target.value))}
                      placeholder="Es: 30"
                      className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-300">
                      Colore Identificativo
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={badgeColor}
                        onChange={(e) => setBadgeColor(e.target.value)}
                        className="h-8 w-10 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <Input
                        value={badgeColor}
                        onChange={(e) => setBadgeColor(e.target.value)}
                        className="bg-[#0a0b10] border-slate-800 text-white rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Ordine in Homepage</Label>
                    <Input
                      type="number"
                      min="1"
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(Number(e.target.value))}
                      placeholder="Es: 1, 2, 3..."
                      className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1 text-xs font-mono"
                    />
                  </div>

                  <div className="flex flex-col justify-center">
                    <Label className="text-xs font-bold text-slate-300 mb-2">Visibilità</Label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-[#0a0b10] border border-slate-800 px-3 py-2 rounded-xl">
                      <input
                        type="checkbox"
                        checked={showInHomepage}
                        onChange={(e) => setShowInHomepage(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                      />
                      <span>Mostra nella Homepage</span>
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-300">Descrizione Breve</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Sottotitolo o descrizione breve del piano..."
                    className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1 text-xs"
                  />
                </div>

                {/* ADVANTAGES (ONE PER LINE WITH CHECKMARK PREVIEW) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Definisci i Vantaggi Inclusi (Un vantaggio per riga)
                    </Label>
                    <span className="text-[10px] text-slate-400">
                      Ogni riga a capo genera una spunta ✓
                    </span>
                  </div>
                  <Textarea
                    value={advantagesText}
                    onChange={(e) => setAdvantagesText(e.target.value)}
                    rows={4}
                    placeholder={
                      "Ingresso Privé VIP riservato\nMaggiordomo dedicato per la serata\nCassetta di sicurezza personale\n5% Bonus cambio dobloni in cassa"
                    }
                    className="bg-[#0a0b10] border-slate-800 text-white rounded-xl text-xs font-mono"
                  />

                  {/* Real-time Checkmark Preview Box */}
                  {parsedAdvantagesPreview.length > 0 && (
                    <div className="bg-[#0a0b10] border border-emerald-500/20 rounded-xl p-3 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                        <Check className="h-3 w-3" /> Anteprima Spunte Vantaggi (
                        {parsedAdvantagesPreview.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {parsedAdvantagesPreview.map((adv, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-slate-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{adv}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  {editingPlan && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-400 hover:bg-red-500/20 text-xs rounded-xl"
                      onClick={() => deleteMutation.mutate(editingPlan.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Elimina Piano
                    </Button>
                  )}
                  <Button
                    type="button"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20"
                  >
                    {saveMutation.isPending ? "Salvataggio..." : "Salva Piano & Vantaggi"}
                  </Button>
                </div>
              </div>
            )}

            {/* List of Plans with Reordering and Delete Controls */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Piani e Ordine di Visualizzazione ({plans.length})
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    disabled={reorderMutation.isPending || plans.length <= 1}
                    onClick={handleSortByPrestige}
                    className="h-7 px-2.5 bg-[#0a0b10] border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-[11px] font-bold rounded-lg"
                    title="Mette automaticamente in cima le tessere di costo e prestigio maggiore (VIP -> Èlite -> Exclusive -> Standard)"
                  >
                    <Crown className="h-3 w-3 mr-1 text-amber-400" />
                    👑 Più Prestigiose in Alto
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    disabled={reorderMutation.isPending || plans.length <= 1}
                    onClick={handleSortAscending}
                    className="h-7 px-2.5 bg-[#0a0b10] border-slate-700 text-slate-300 hover:text-white text-[11px] font-bold rounded-lg"
                    title="Ordina per costo crescente (Standard -> Exclusive -> Èlite -> VIP)"
                  >
                    📈 Base in Alto
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {plans.map((p, idx) => {
                  const isStd = p.code === "standard" || p.id === "plan-standard" || p.is_permanent;
                  const advs = p.advantages && p.advantages.length > 0 ? p.advantages : [];

                  return (
                    <div
                      key={p.id}
                      className="bg-[#0a0b10] border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      {/* Left: Reorder position & plan info */}
                      <div className="flex items-start gap-3 flex-1">
                        {/* Position Badge & Move Up/Down Controls */}
                        <div className="flex flex-col items-center justify-center bg-[#12141c] border border-slate-800 rounded-lg p-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={idx === 0 || reorderMutation.isPending}
                            onClick={() => handleMoveUp(idx)}
                            className="h-5 w-5 text-slate-400 hover:text-amber-400 disabled:opacity-20 p-0"
                            title="Sposta in su (Mostra prima)"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <span className="text-[10px] font-black text-amber-400 px-1 font-mono">
                            #{idx + 1}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={idx === plans.length - 1 || reorderMutation.isPending}
                            onClick={() => handleMoveDown(idx)}
                            className="h-5 w-5 text-slate-400 hover:text-amber-400 disabled:opacity-20 p-0"
                            title="Sposta in giù (Mostra dopo)"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <DynamicMembershipBadge plan={p} fallbackTier={p.code} />
                            <span className="font-extrabold text-white text-sm truncate">
                              {p.name}
                            </span>
                            {p.highlight_tag && (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] font-bold">
                                ✨ {p.highlight_tag}
                              </Badge>
                            )}
                            {p.show_in_homepage ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px]">
                                In Homepage
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[9px]">
                                Nascosto
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 sm:gap-3 font-mono">
                            {isStd ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <InfinityIcon className="h-3.5 w-3.5" /> Gratuita • Illimitata
                              </span>
                            ) : (
                              <>
                                <span>
                                  EUR:{" "}
                                  <b className="text-amber-400">
                                    {formatMoney(p.cost_eur || p.renewal_cost || 0)}
                                  </b>
                                </span>
                                <span>•</span>
                                <span>
                                  Dobloni:{" "}
                                  <b className="text-amber-400">
                                    {formatDobloni(p.cost_dobloni || 0)}
                                  </b>
                                </span>
                                <span>•</span>
                                <span>
                                  Durata: <b className="text-sky-400">{p.renewal_days} giorni</b>
                                </span>
                              </>
                            )}
                          </div>

                          {/* Advantages preview list */}
                          {advs.length > 0 && (
                            <div className="pt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-300">
                              {advs.map((adv, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                                  <span>{adv}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-3 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Modifica
                        </Button>
                        {!isStd && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl text-xs font-bold"
                            onClick={() => setPlanToDelete(p)}
                            title="Elimina Piano Membership"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HOMEPAGE CUSTOMIZATION */}
        {activeTab === "homepage" && (
          <div className="space-y-4 pt-1">
            <div className="bg-[#0a0b10] border border-amber-500/20 rounded-xl p-4 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Globe className="h-4 w-4 text-amber-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Personalizzazione Sezione Membership sulla Homepage
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs font-bold text-slate-300">Badge Superiore</Label>
                  <Input
                    value={hpBadge}
                    onChange={(e) => setHpBadge(e.target.value)}
                    placeholder="Es: Livelli di Abbonamento"
                    className="bg-[#12141c] border-slate-800 text-white rounded-xl mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-300">Titolo Sezione *</Label>
                  <Input
                    value={hpTitle}
                    onChange={(e) => setHpTitle(e.target.value)}
                    placeholder="Es: Membership & Privilege Cards"
                    className="bg-[#12141c] border-slate-800 text-white rounded-xl mt-1 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-300">
                    Sottotitolo Descrittivo
                  </Label>
                  <Input
                    value={hpSubtitle}
                    onChange={(e) => setHpSubtitle(e.target.value)}
                    placeholder="Es: Sblocca vantaggi esclusivi, accessi riservati e maggiordomo dedicato."
                    className="bg-[#12141c] border-slate-800 text-white rounded-xl mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-300">Testo Pulsante CTA</Label>
                  <Input
                    value={hpCtaText}
                    onChange={(e) => setHpCtaText(e.target.value)}
                    placeholder="Es: Richiedi in Cassa / Crea Account"
                    className="bg-[#12141c] border-slate-800 text-white rounded-xl mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-300">Link Pulsante CTA</Label>
                  <Input
                    value={hpCtaLink}
                    onChange={(e) => setHpCtaLink(e.target.value)}
                    placeholder="Es: #valute oppure /candidature"
                    className="bg-[#12141c] border-slate-800 text-white rounded-xl mt-1 text-xs font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-[#12141c] border border-slate-800 p-2.5 rounded-xl w-full">
                    <input
                      type="checkbox"
                      checked={hpVisible}
                      onChange={(e) => setHpVisible(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    />
                    <span>Mostra Sezione Membership sulla Homepage</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-[#12141c] border border-slate-800 p-2.5 rounded-xl w-full">
                    <input
                      type="checkbox"
                      checked={hpShowDobloni}
                      onChange={(e) => setHpShowDobloni(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    />
                    <span>Mostra anche Prezzo in Dobloni oltre a EUR</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  disabled={saveHomepageConfigMutation.isPending}
                  onClick={() => saveHomepageConfigMutation.mutate()}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20"
                >
                  {saveHomepageConfigMutation.isPending
                    ? "Salvataggio..."
                    : "Salva Configurazione Homepage"}
                </Button>
              </div>
            </div>

            {/* Quick Helper Note */}
            <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 text-xs space-y-1 text-sky-200">
              <span className="font-bold flex items-center gap-1.5 text-sky-300">
                <Sparkles className="h-4 w-4 text-sky-400" />
                Come organizzare i piani mostrati in Homepage:
              </span>
              <p className="text-[11px] text-slate-300">
                Per scegliere quali tessere mostrare e in che ordine, apri la scheda{" "}
                <b>"Piani & Vantaggi Membership"</b>, clicca su <b>Modifica</b> sul piano desiderato
                e imposta <b>"Mostra nella Homepage"</b> e il numero di <b>"Ordine in Homepage"</b>.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-[#0a0b10] border-slate-800 text-slate-300 hover:text-white rounded-xl"
          >
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Delete Plan Confirmation Dialog */}
      <ConfirmDialog
        open={!!planToDelete}
        onOpenChange={(open) => {
          if (!open) setPlanToDelete(null);
        }}
        title="Elimina Piano Membership"
        description={`Sei sicuro di voler eliminare definitivamente il piano "${planToDelete?.name}"?`}
        confirmText="Elimina Piano"
        variant="destructive"
        onConfirm={() => {
          if (planToDelete) {
            deleteMutation.mutate(planToDelete.id);
            setPlanToDelete(null);
          }
        }}
      />
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                    CITIZEN OPERATION HISTORY (ADMIN DIALOG)                */
/* -------------------------------------------------------------------------- */

function CitizenHistoryDialog({
  open,
  onOpenChange,
  citizen,
  profileMap,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  citizen: Citizen;
  profileMap: Record<string, any>;
}) {
  const [selectedNightId, setSelectedNightId] = useState<string>("all");

  const displayName = citizen.full_name || citizen.nickname || "Cittadino";

  const { data: conversions = [] } = useQuery({
    queryKey: ["citizen-conversions", citizen.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversions")
        .select("*, nights(night_date, title)")
        .eq("citizen_id", citizen.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: nightItems = [] } = useQuery({
    queryKey: ["citizen-night-items", citizen.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("night_items")
        .select("*, nights(night_date, title)")
        .eq("citizen_id", citizen.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const groupedNights = useMemo(() => {
    const nightsObj: Record<
      string,
      {
        night_id: string;
        title: string;
        date: string;
        purchases: any[];
        conversions: any[];
      }
    > = {};

    const initNightGroup = (nightId: string, rawNight: any) => {
      if (!nightsObj[nightId]) {
        const d = rawNight?.night_date ? new Date(rawNight.night_date) : null;
        const formattedDate = d ? d.toLocaleDateString("it-IT") : "Data non definita";
        nightsObj[nightId] = {
          night_id: nightId,
          title: rawNight?.title ?? `Serata del ${formattedDate}`,
          date: formattedDate,
          purchases: [],
          conversions: [],
        };
      }
    };

    nightItems.forEach((item: any) => {
      const nid = item.night_id || "other";
      initNightGroup(nid, item.nights);
      nightsObj[nid].purchases.push(item);
    });

    conversions.forEach((conv: any) => {
      const nid = conv.night_id || "other";
      initNightGroup(nid, conv.nights);
      nightsObj[nid].conversions.push(conv);
    });

    return Object.values(nightsObj).sort((a, b) => {
      if (a.night_id === "other") return 1;
      if (b.night_id === "other") return -1;
      return b.date.localeCompare(a.date);
    });
  }, [nightItems, conversions]);

  const filteredGroupedNights = useMemo(() => {
    if (selectedNightId === "all") return groupedNights;
    return groupedNights.filter((g) => g.night_id === selectedNightId);
  }, [groupedNights, selectedNightId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#12141c] border-slate-800 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <img
              src={`https://mc-heads.net/avatar/${encodeURIComponent(displayName)}/40`}
              alt="Avatar"
              className="h-10 w-10 rounded-xl border border-amber-500/40 bg-[#0a0b10] object-cover shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://minotar.net/helm/Steve/40.png";
              }}
            />
            <div>
              <DialogTitle className="text-base font-black uppercase tracking-wider text-white">
                Storico Operazioni: {displayName}
              </DialogTitle>
              <div className="text-xs text-slate-400 font-mono">
                {citizen.telegram_handle
                  ? `@${citizen.telegram_handle.replace(/^@/, "")}`
                  : "Nessun Telegram"}{" "}
                • Membership{" "}
                <span className="text-amber-400 uppercase font-bold">
                  {MEMBERSHIP_LABEL[citizen.membership] || citizen.membership}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* NIGHT FILTER SELECTOR */}
        {groupedNights.length > 1 && (
          <div className="flex items-center gap-3 bg-[#0a0b10] p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase">Filtra per Serata:</span>
            <Select value={selectedNightId} onValueChange={setSelectedNightId}>
              <SelectTrigger className="w-64 bg-[#12141c] border-slate-700 text-white text-xs h-8">
                <SelectValue placeholder="Tutte le serate" />
              </SelectTrigger>
              <SelectContent className="bg-[#12141c] border-slate-800 text-white text-xs">
                <SelectItem value="all">Tutte le Serate ({groupedNights.length})</SelectItem>
                {groupedNights.map((g) => (
                  <SelectItem key={g.night_id} value={g.night_id}>
                    {g.title} ({g.date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-4 pt-2">
          {filteredGroupedNights.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Nessuna operazione registrata per la serata selezionata.
            </div>
          ) : (
            filteredGroupedNights.map((g) => (
              <div
                key={g.night_id}
                className="border border-slate-800 rounded-2xl overflow-hidden bg-[#0a0b10]/80"
              >
                <div className="bg-[#0f1118] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                    {g.title}
                  </h3>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] text-slate-400 border-slate-800"
                  >
                    {g.date}
                  </Badge>
                </div>

                <div className="p-4 space-y-4">
                  {g.purchases.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                        Acquisti / Servizi Usufruiti
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-transparent h-8">
                            <TableHead className="h-8 py-1 text-slate-400 text-[11px]">
                              Prodotto/Servizio
                            </TableHead>
                            <TableHead className="h-8 py-1 text-center text-slate-400 text-[11px]">
                              Quantità
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right text-slate-400 text-[11px]">
                              Prezzo Unitario
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right text-slate-400 text-[11px]">
                              Subtotale
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right text-slate-400 text-[11px]">
                              Operatore
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {g.purchases.map((p) => {
                            const op = p.created_by ? profileMap[p.created_by] : null;
                            const opName = op?.username || "-";
                            return (
                              <TableRow key={p.id} className="h-9 border-b border-slate-800/50">
                                <TableCell className="py-1.5 font-bold text-slate-200 text-xs">
                                  {p.service_name}
                                </TableCell>
                                <TableCell className="py-1.5 text-center font-mono text-xs">
                                  {p.qty}
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-400">
                                  {formatMoney(p.unit_price)}
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono font-bold text-sky-400 text-xs">
                                  {formatMoney(p.subtotal)}
                                </TableCell>
                                <TableCell className="py-1.5 text-right text-xs text-slate-400">
                                  {opName}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {g.conversions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Conversioni Cassa
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-transparent h-8">
                            <TableHead className="h-8 py-1 text-slate-400 text-[11px]">
                              Tipo Conversione
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right text-slate-400 text-[11px]">
                              Importo EUR
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right text-slate-400 text-[11px]">
                              Importo Dobloni
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right text-slate-400 text-[11px]">
                              Operatore
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {g.conversions.map((c) => {
                            const op = c.created_by ? profileMap[c.created_by] : null;
                            const opName = op?.username || "-";
                            const isCashToDobloni = c.direction === "cash_to_dobloni";
                            return (
                              <TableRow key={c.id} className="h-9 border-b border-slate-800/50">
                                <TableCell className="py-1.5">
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] font-bold ${
                                      isCashToDobloni
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    }`}
                                  >
                                    {isCashToDobloni ? "Soldi → Dobloni" : "Dobloni → Soldi"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono font-bold text-slate-200 text-xs">
                                  {formatMoney(c.eur_amount)}
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono font-bold text-amber-400 text-xs">
                                  {formatDobloni(c.dobloni_amount)}
                                </TableCell>
                                <TableCell className="py-1.5 text-right text-xs text-slate-400">
                                  {opName}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-[#0a0b10] border-slate-800 text-slate-300 hover:text-white rounded-xl"
          >
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
