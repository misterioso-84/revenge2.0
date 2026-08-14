import { createFileRoute } from "@tanstack/react-router";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  History,
  Users,
  Search,
  Coins,
  Euro,
  Sparkles,
  Shield,
  Calendar,
  Lock,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  ShoppingBag,
  ArrowLeftRight,
  Crown,
  User,
  Info,
} from "lucide-react";
import {
  MEMBERSHIP_LABEL,
  formatDate,
  formatDateTime,
  formatMoney,
  formatDobloni,
} from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/cittadini")({
  component: CitizensPage,
});

type Citizen = {
  id: string;
  full_name: string;
  nickname: string | null;
  membership: "standard" | "exclusive" | "elite" | "vip";
  membership_since: string | null;
  notes: string | null;
  created_at: string;
};

type SafeBox = {
  id: string;
  box_number: number;
  citizen_id: string | null;
  activated_at: string | null;
  expires_at: string | null;
  active: boolean;
  notes: string | null;
};

function CitizensPage() {
  const qc = useQueryClient();
  const { user, profile, isAdmin, permissions = [] } = useAuth();

  const isStaff =
    isAdmin ||
    permissions.includes("cittadini.read") ||
    permissions.includes("cittadini.visualizza") ||
    permissions.includes("cittadini.gestisci") ||
    permissions.includes("cittadini.write");

  const canWrite =
    isAdmin ||
    permissions.includes("cittadini.write") ||
    permissions.includes("cittadini.gestisci");

  // Tab switch for staff members: 'my-card' vs 'registry'
  const [activeMainView, setActiveMainView] = useState<"my-card" | "registry">("my-card");

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Citizen | null>(null);
  const [open, setOpen] = useState(false);

  const [historyCitizen, setHistoryCitizen] = useState<Citizen | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", description: "", onConfirm: () => {} });

  // Fetch all citizens (always accessible to match user nickname)
  const {
    data: citizens = [],
    refetch: refetchCitizens,
    isFetching: isFetchingCitizens,
  } = useQuery({
    queryKey: ["citizens"],
    queryFn: async () => {
      const { data, error } = await supabase.from("citizens").select("*").order("full_name");
      if (error) throw error;
      return (data || []) as Citizen[];
    },
  });

  // Fetch all profiles for operator lookup
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, username, display_name");
      return (data || []) as any[];
    },
  });

  const profileMap = useMemo(() => {
    return Object.fromEntries(profiles.map((p) => [p.id, p]));
  }, [profiles]);

  // Resolve current user's citizen card synchronized with Minecraft Nickname
  const myCitizen = useMemo(() => {
    const userNick = (profile?.username || user?.user_metadata?.username || "")
      .trim()
      .toLowerCase();
    const userDisplay = (profile?.display_name || user?.user_metadata?.display_name || "")
      .trim()
      .toLowerCase();

    if (!userNick && !userDisplay) {
      return null;
    }

    // Match in citizens database by nickname or full name
    const found = citizens.find((c) => {
      const fn = c.full_name?.trim().toLowerCase();
      const nn = c.nickname?.trim().toLowerCase();
      return (
        (userNick && (fn === userNick || nn === userNick)) ||
        (userDisplay && (fn === userDisplay || nn === userDisplay))
      );
    });

    if (found) return found;

    // Fallback virtual representation synchronized with logged-in user
    const resolvedName =
      profile?.display_name || profile?.username || user?.user_metadata?.username || "Cittadino";
    const resolvedNick = profile?.username || user?.user_metadata?.username || "Utente";

    return {
      id: `virtual-${profile?.id || "user"}`,
      full_name: resolvedName,
      nickname: resolvedNick,
      membership: "standard" as const,
      membership_since: profile?.created_at || new Date().toISOString(),
      notes: "Account registrato e sincronizzato con il Nickname Minecraft.",
      created_at: profile?.created_at || new Date().toISOString(),
      isVirtual: true,
    };
  }, [citizens, profile, user]);

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
      const fn = c.full_name?.toLowerCase() || "";
      const nn = c.nickname?.toLowerCase() || "";
      return fn.includes(s) || nn.includes(s);
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
          ANAGRAFICA CITTAGINI, MEMBERSHIP E STORICO OPERAZIONI
        </p>
      </div>

      {/* Main Mode Switcher for Staff / Single View for Regular Citizens */}
      {isStaff && (
        <div className="flex items-center justify-center">
          <div className="bg-[#0e1017] p-1.5 rounded-2xl border border-slate-800/90 shadow-xl flex items-center gap-1.5">
            <Button
              variant="ghost"
              onClick={() => setActiveMainView("my-card")}
              className={`rounded-xl px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                activeMainView === "my-card"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <User className="h-4 w-4 mr-2" /> La Mia Scheda Cittadino
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveMainView("registry")}
              className={`rounded-xl px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                activeMainView === "registry"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Users className="h-4 w-4 mr-2" /> Registro Generale ({citizens.length})
            </Button>
          </div>
        </div>
      )}

      {/* VIEW 1: LA MIA SCHEDA CITTADINO (Disponibile per TUTTI gli utenti) */}
      {(!isStaff || activeMainView === "my-card") && (
        <MyCitizenDashboard
          citizen={myCitizen}
          profile={profile}
          user={user}
          profileMap={profileMap}
          onRefresh={() => refetchCitizens()}
          isRefreshing={isFetchingCitizens}
        />
      )}

      {/* VIEW 2: REGISTRO GENERALE CITTAGINI (Per Staff & Amministratori) */}
      {isStaff && activeMainView === "registry" && (
        <div className="space-y-6">
          {/* Control Header Box */}
          <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold uppercase text-white tracking-wider">
                  REGISTRO GENERALE CLIENTI
                </h2>
                <p className="text-xs text-slate-400">
                  Gestione anagrafica generale, assegnazione membership e storico transazioni
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-2 bg-[#0a0b10] border border-slate-800 rounded-xl px-3.5 py-2 w-full sm:w-64 shadow-inner">
                <Search className="h-4 w-4 text-amber-400 shrink-0" />
                <Input
                  placeholder="Cerca cittadino o nickname…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-0 bg-transparent text-white p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-500 text-xs font-medium"
                />
              </div>

              {canWrite && (
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
                  <Plus className="h-4 w-4 mr-1.5" /> Nuovo cittadino
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
                    Cittadino / Nickname Minecraft
                  </TableHead>
                  <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5">
                    Livello Membership
                  </TableHead>
                  <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5">
                    Membro Dal
                  </TableHead>
                  <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5 w-36 text-right">
                    Azioni
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCitizens.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-slate-400 py-10 text-xs font-medium"
                    >
                      Nessun cittadino trovato nel registro.
                    </TableCell>
                  </TableRow>
                )}
                {filteredCitizens.map((c) => {
                  const mcNick = c.nickname || c.full_name;
                  return (
                    <TableRow
                      key={c.id}
                      className="border-b border-slate-800/60 hover:bg-[#0a0b10]/60 transition-colors"
                    >
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://mc-heads.net/avatar/${encodeURIComponent(mcNick)}/32`}
                            alt={mcNick}
                            className="h-8 w-8 rounded-lg border border-slate-800 bg-slate-900 shrink-0 shadow-sm"
                            onError={(e) => {
                              // Fallback if avatar fails
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-1.5">
                              <span>{c.full_name}</span>
                              {c.nickname && c.nickname !== c.full_name && (
                                <span className="text-[11px] text-amber-400/90 font-mono font-normal">
                                  (@{c.nickname})
                                </span>
                              )}
                            </div>
                            {c.notes && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">
                                {c.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <MembershipBadge tier={c.membership} />
                      </TableCell>
                      <TableCell className="py-3.5 text-xs text-slate-400 font-mono">
                        {c.membership_since
                          ? formatDate(c.membership_since)
                          : formatDate(c.created_at)}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setHistoryCitizen(c);
                              setHistoryOpen(true);
                            }}
                            title="Storico Operazioni"
                            className="h-8 w-8 text-sky-400 hover:text-sky-300 hover:bg-sky-950/30 rounded-xl"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          {canWrite && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
                                onClick={() => {
                                  setEditing(c);
                                  setOpen(true);
                                }}
                                title="Modifica"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl"
                                onClick={() =>
                                  setDeleteConfirm({
                                    isOpen: true,
                                    title: "Elimina cittadino",
                                    description: `Sei sicuro di voler eliminare DEFINITIVAMENTE il cittadino "${c.full_name}"? Tutti i dati e lo storico collegati verranno persi.`,
                                    onConfirm: () => del.mutate(c.id),
                                  })
                                }
                                title="Elimina"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* MODAL CREAZIONE / MODIFICA CITTADINO */}
      {open && (
        <CitizenDialog
          open={open}
          onOpenChange={setOpen}
          citizen={editing}
          createdTodayCount={createdTodayCount}
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
/*                 MY CITIZEN DASHBOARD & PERSONAL HISTORY VIEW                */
/* -------------------------------------------------------------------------- */

function MyCitizenDashboard({
  citizen,
  profile,
  profileMap,
  onRefresh,
  isRefreshing,
}: {
  citizen: any;
  profile: any;
  user: any;
  profileMap: Record<string, any>;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const [copiedNick, setCopiedNick] = useState(false);
  const [selectedNightId, setSelectedNightId] = useState<string>("all");

  const mcNickname = profile?.username || citizen?.nickname || citizen?.full_name || "Ospite";
  const fullName = citizen?.full_name || profile?.display_name || mcNickname;
  const membershipTier = citizen?.membership || "standard";
  const citizenId = citizen?.id;

  // 1. Fetch Conversions for this citizen
  const { data: conversions = [] } = useQuery({
    queryKey: ["my-citizen-conversions", citizenId, mcNickname],
    queryFn: async () => {
      if (!citizenId) return [];
      const { data, error } = await supabase
        .from("conversions")
        .select("*, nights(night_date, title)")
        .eq("citizen_id", citizenId)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Could not fetch citizen conversions by ID:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!citizenId,
  });

  // 2. Fetch Night Items (Purchases & Consumptions)
  const { data: nightItems = [] } = useQuery({
    queryKey: ["my-citizen-night-items", citizenId, mcNickname],
    queryFn: async () => {
      if (!citizenId) return [];
      const { data, error } = await supabase
        .from("night_items")
        .select("*, nights(night_date, title)")
        .eq("citizen_id", citizenId)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Could not fetch citizen night items by ID:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!citizenId,
  });

  // 3. Fetch Safe Box if assigned
  const { data: safeBox } = useQuery({
    queryKey: ["my-safe-box", citizenId],
    queryFn: async () => {
      if (!citizenId) return null;
      const { data, error } = await supabase
        .from("safe_boxes")
        .select("*")
        .eq("citizen_id", citizenId)
        .maybeSingle();
      if (error) return null;
      return (data || null) as SafeBox | null;
    },
    enabled: !!citizenId,
  });

  // Copy Minecraft Nickname Helper
  const copyNickname = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(mcNickname);
      setCopiedNick(true);
      toast.success("Nickname Minecraft copiato negli appunti!");
      setTimeout(() => setCopiedNick(false), 2000);
    }
  };

  // Group operations by night
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

  // Aggregate stats
  const totalDobloniBought = useMemo(() => {
    return conversions
      .filter((c: any) => c.direction === "cash_to_dobloni")
      .reduce((sum: number, c: any) => sum + (Number(c.dobloni_amount) || 0), 0);
  }, [conversions]);

  const totalDobloniCashedOut = useMemo(() => {
    return conversions
      .filter((c: any) => c.direction === "dobloni_to_cash")
      .reduce((sum: number, c: any) => sum + (Number(c.dobloni_amount) || 0), 0);
  }, [conversions]);

  const totalEurMoved = useMemo(() => {
    return conversions.reduce((sum: number, c: any) => sum + (Number(c.eur_amount) || 0), 0);
  }, [conversions]);

  const totalPurchasesEur = useMemo(() => {
    return nightItems.reduce((sum: number, item: any) => sum + (Number(item.subtotal) || 0), 0);
  }, [nightItems]);

  return (
    <div className="space-y-6">
      {/* SYNCHRONIZED MINECRAFT CITIZEN PASSPORT CARD */}
      <div className="bg-gradient-to-br from-[#131622] via-[#171c2b] to-[#10121a] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* AVATAR & BASIC DETAILS */}
          <div className="flex items-center gap-5 sm:gap-6 flex-wrap sm:flex-nowrap">
            <div className="relative group">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-amber-500/20 to-slate-900 border-2 border-amber-500/40 p-1 flex items-center justify-center shrink-0 shadow-2xl overflow-hidden">
                <img
                  src={`https://mc-heads.net/avatar/${encodeURIComponent(mcNickname)}/96`}
                  alt={mcNickname}
                  className="h-full w-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
              <div
                className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 rounded-full p-1 border-2 border-[#12141c] shadow-lg"
                title="Sincronizzato e Attivo"
              >
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  {fullName}
                </span>
                <MembershipBadge tier={membershipTier} />
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                <div
                  onClick={copyNickname}
                  className="inline-flex items-center gap-1.5 bg-[#0a0b10]/90 hover:bg-slate-800 text-amber-400 border border-slate-800 px-2.5 py-1 rounded-lg font-mono font-bold cursor-pointer transition-colors"
                  title="Clicca per copiare il nickname"
                >
                  <span>MC: {mcNickname}</span>
                  {copiedNick ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 opacity-70" />
                  )}
                </div>

                <span className="text-slate-600">•</span>
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" /> Membro dal{" "}
                  <strong className="text-slate-300 font-mono">
                    {citizen?.membership_since
                      ? formatDate(citizen.membership_since)
                      : formatDate(citizen?.created_at || new Date().toISOString())}
                  </strong>
                </span>
              </div>

              {citizen?.notes && (
                <p className="text-xs text-slate-400/90 italic pt-1 max-w-xl">"{citizen.notes}"</p>
              )}
            </div>
          </div>

          {/* RIGHT CONTROLS & SYNC BUTTON */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="bg-[#0a0b10] border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold gap-2 shadow-inner"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-amber-400 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Aggiorna Dati
            </Button>

            <div className="bg-[#0a0b10]/90 border border-amber-500/30 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-inner">
              <Shield className="h-6 w-6 text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono tracking-widest">
                  Tessera Roleplay
                </div>
                <div className="text-xs font-black text-amber-300 font-mono uppercase tracking-wider">
                  {citizen?.isVirtual ? "IN ATTESA SINCRONIZZAZIONE" : "VERIFICATA & ATTIVA"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* DOBLONI CONVERTITI */}
        <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Dobloni Acquisiti
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-black text-amber-400 font-mono">
              {formatDobloni(totalDobloniBought)}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500">
            Incassati in EUR: {formatDobloni(totalDobloniCashedOut)}
          </div>
        </div>

        {/* VOLUME EURO SCAMBIATO */}
        <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Volume Euro Cassa
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Euro className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-black text-emerald-400 font-mono">
              {formatMoney(totalEurMoved)}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500">
            Transazioni totali: {conversions.length}
          </div>
        </div>

        {/* CONSUMAZIONI & SERVIZI */}
        <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Servizi & Spese
            </span>
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-black text-sky-400 font-mono">
              {formatMoney(totalPurchasesEur)}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500">
            Articoli acquistati: {nightItems.length}
          </div>
        </div>

        {/* CASSETTA DI SICUREZZA */}
        <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cassetta Caveau
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-black text-white font-mono">
              {safeBox ? `Box #${safeBox.box_number}` : "Nessuna"}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500">
            {safeBox?.active ? "🟢 Assegnata & Attiva" : "Richiedi al gestore"}
          </div>
        </div>
      </div>

      {/* OPERATIONS HISTORY & DETAILS TABS */}
      <div className="bg-[#12141c] border border-slate-800/90 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6">
        <Tabs defaultValue="conversions" className="w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <TabsList className="bg-[#0a0b10] border border-slate-800 p-1 rounded-2xl">
              <TabsTrigger
                value="conversions"
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 rounded-xl font-bold text-xs uppercase tracking-wider px-4 py-2"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Conversioni Cassa (
                {conversions.length})
              </TabsTrigger>
              <TabsTrigger
                value="purchases"
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 rounded-xl font-bold text-xs uppercase tracking-wider px-4 py-2"
              >
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> Servizi Usufruiti (
                {nightItems.length})
              </TabsTrigger>
              <TabsTrigger
                value="membership-perks"
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 rounded-xl font-bold text-xs uppercase tracking-wider px-4 py-2"
              >
                <Crown className="h-3.5 w-3.5 mr-1.5" /> Vantaggi Membership
              </TabsTrigger>
            </TabsList>

            {groupedNights.length > 0 && (
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="my-night-filter"
                  className="text-xs text-slate-400 shrink-0 font-medium"
                >
                  Filtra Serata:
                </Label>
                <Select value={selectedNightId} onValueChange={setSelectedNightId}>
                  <SelectTrigger
                    id="my-night-filter"
                    className="bg-[#0a0b10] border-slate-800 text-white text-xs h-9 w-48 rounded-xl"
                  >
                    <SelectValue placeholder="Tutte le serate" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#12141c] border-slate-800 text-white">
                    <SelectItem value="all">Tutte le serate</SelectItem>
                    {groupedNights.map((n) => (
                      <SelectItem key={n.night_id} value={n.night_id}>
                        {n.title} ({n.date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* TAB 1: CONVERSIONI CASSA */}
          <TabsContent value="conversions" className="mt-4 space-y-4">
            {conversions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-[#0a0b10]/40 space-y-2">
                <Coins className="h-10 w-10 text-amber-500/40 mx-auto" />
                <p className="text-sm font-bold text-slate-300">Nessuna conversione registrata</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Le tue conversioni di denaro in Dobloni (o viceversa) compariranno qui
                  automaticamente dopo che un cassiere le avrà registrate al banco cassa.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <Table>
                  <TableHeader className="bg-[#0a0b10]">
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3">
                        Data & Serata
                      </TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3">
                        Tipo Operazione
                      </TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3 text-right">
                        Importo Euro
                      </TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3 text-right">
                        Dobloni Ricevuti / Ceduti
                      </TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3 text-right">
                        Cassiere / Operatore
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversions
                      .filter(
                        (c: any) => selectedNightId === "all" || c.night_id === selectedNightId,
                      )
                      .map((c: any) => {
                        const isCashToDobloni = c.direction === "cash_to_dobloni";
                        const op = c.created_by ? profileMap[c.created_by] : null;
                        const opName = op?.display_name || op?.username || "Staff Cassa";
                        const nightTitle = c.nights?.title || "Serata Casinò";

                        return (
                          <TableRow
                            key={c.id}
                            className="border-b border-slate-800/60 hover:bg-[#0a0b10]/60 transition-colors"
                          >
                            <TableCell className="py-3">
                              <div className="font-bold text-white text-xs">{nightTitle}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {formatDateTime(c.created_at)}
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <Badge
                                variant="secondary"
                                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 ${
                                  isCashToDobloni
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                }`}
                              >
                                {isCashToDobloni ? "Soldi → Dobloni" : "Dobloni → Soldi"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 text-right font-mono font-bold text-slate-200 text-xs">
                              {formatMoney(c.eur_amount)}
                            </TableCell>
                            <TableCell className="py-3 text-right font-mono font-bold text-amber-400 text-xs">
                              {isCashToDobloni ? "+" : "-"}
                              {formatDobloni(c.dobloni_amount)}
                            </TableCell>
                            <TableCell className="py-3 text-right text-xs text-slate-400 font-medium">
                              {opName}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: SERVIZI & ACQUISTI */}
          <TabsContent value="purchases" className="mt-4 space-y-4">
            {nightItems.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-[#0a0b10]/40 space-y-2">
                <ShoppingBag className="h-10 w-10 text-sky-500/40 mx-auto" />
                <p className="text-sm font-bold text-slate-300">Nessun servizio usufruito</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Le consumazioni al lounge bar, cene o servizi speciali addebitati durante le
                  serate compariranno in questa sezione.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <Table>
                  <TableHeader className="bg-[#0a0b10]">
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3">
                        Data & Serata
                      </TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3">
                        Servizio / Consumazione
                      </TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3 text-center">
                        Quantità
                      </TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3 text-right">
                        Prezzo Unitario
                      </TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3 text-right">
                        Subtotale
                      </TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3 text-right">
                        Operatore
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nightItems
                      .filter(
                        (p: any) => selectedNightId === "all" || p.night_id === selectedNightId,
                      )
                      .map((p: any) => {
                        const op = p.created_by ? profileMap[p.created_by] : null;
                        const opName = op?.display_name || op?.username || "Staff";
                        const nightTitle = p.nights?.title || "Serata Casinò";

                        return (
                          <TableRow
                            key={p.id}
                            className="border-b border-slate-800/60 hover:bg-[#0a0b10]/60 transition-colors"
                          >
                            <TableCell className="py-3">
                              <div className="font-bold text-white text-xs">{nightTitle}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {formatDateTime(p.created_at)}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 font-bold text-slate-200 text-xs">
                              {p.service_name}
                            </TableCell>
                            <TableCell className="py-3 text-center font-mono text-xs font-bold text-slate-300">
                              {p.qty}
                            </TableCell>
                            <TableCell className="py-3 text-right font-mono text-slate-400 text-xs">
                              {formatMoney(p.unit_price)}
                            </TableCell>
                            <TableCell className="py-3 text-right font-mono font-bold text-sky-400 text-xs">
                              {formatMoney(p.subtotal)}
                            </TableCell>
                            <TableCell className="py-3 text-right text-xs text-slate-400 font-medium">
                              {opName}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: MEMBERSHIP PERKS & BENEFITS */}
          <TabsContent value="membership-perks" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* STANDARD */}
              <div
                className={`p-5 rounded-2xl border transition-all ${membershipTier === "standard" ? "bg-slate-800/40 border-slate-500 shadow-xl ring-2 ring-slate-400" : "bg-[#0a0b10] border-slate-800/80 opacity-70"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge
                    variant="outline"
                    className="text-slate-300 border-slate-600 font-mono uppercase text-[10px]"
                  >
                    Standard
                  </Badge>
                  {membershipTier === "standard" && (
                    <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase bg-emerald-500/10 px-2 py-0.5 rounded">
                      Il Tuo Piano
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-white mb-2">Tessera Base</h3>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>Accesso alla sala giochi standard</li>
                  <li>Tasso di conversione standard 1:1</li>
                  <li>Accesso agli eventi aperti al pubblico</li>
                </ul>
              </div>

              {/* EXCLUSIVE */}
              <div
                className={`p-5 rounded-2xl border transition-all ${membershipTier === "exclusive" ? "bg-blue-950/20 border-blue-500 shadow-xl ring-2 ring-blue-400" : "bg-[#0a0b10] border-slate-800/80 opacity-70"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-mono uppercase text-[10px]">
                    Exclusive
                  </Badge>
                  {membershipTier === "exclusive" && (
                    <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase bg-emerald-500/10 px-2 py-0.5 rounded">
                      Il Tuo Piano
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-blue-300 mb-2">Tessera Exclusive</h3>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>Sconto del 5% su tutti i servizi</li>
                  <li>Priorità d'ingresso nelle serate piene</li>
                  <li>Invito ad anteprime ed eventi a tema</li>
                </ul>
              </div>

              {/* ELITE */}
              <div
                className={`p-5 rounded-2xl border transition-all ${membershipTier === "elite" ? "bg-purple-950/20 border-purple-500 shadow-xl ring-2 ring-purple-400" : "bg-[#0a0b10] border-slate-800/80 opacity-70"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 font-mono uppercase text-[10px]">
                    Elite
                  </Badge>
                  {membershipTier === "elite" && (
                    <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase bg-emerald-500/10 px-2 py-0.5 rounded">
                      Il Tuo Piano
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-purple-300 mb-2">Tessera Elite</h3>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>Sconto del 10% sui servizi lounge</li>
                  <li>+15% Dobloni promozionali alle serate di gala</li>
                  <li>Tavolo riservato su prenotazione anticipata</li>
                </ul>
              </div>

              {/* VIP */}
              <div
                className={`p-5 rounded-2xl border transition-all ${membershipTier === "vip" ? "bg-amber-950/30 border-amber-500 shadow-xl ring-2 ring-amber-400" : "bg-[#0a0b10] border-slate-800/80 opacity-70"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-amber-500 text-slate-950 font-black border-amber-400 font-mono uppercase text-[10px]">
                    VIP Gold
                  </Badge>
                  {membershipTier === "vip" && (
                    <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase bg-emerald-500/10 px-2 py-0.5 rounded">
                      Il Tuo Piano
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-amber-300 mb-2">Tessera VIP Gold</h3>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>Accesso esclusivo Area Privè & Sala Alta Quota</li>
                  <li>Cassetta di sicurezza caveau inclusa</li>
                  <li>+25% Dobloni bonus su grandi ricariche</li>
                  <li>Assistenza concierge dedicata</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            MEMBERSHIP BADGE                                */
/* -------------------------------------------------------------------------- */

function MembershipBadge({ tier }: { tier: string }) {
  const cls =
    tier === "vip"
      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black border border-amber-300 shadow-md shadow-amber-500/20"
      : tier === "elite"
        ? "bg-purple-600/90 text-white font-bold border border-purple-400"
        : tier === "exclusive"
          ? "bg-sky-600/90 text-white font-bold border border-sky-400"
          : "bg-slate-800 text-slate-300 font-medium border border-slate-700";

  return (
    <Badge className={`${cls} text-[10px] uppercase font-mono tracking-wider px-2.5 py-0.5`}>
      {MEMBERSHIP_LABEL[tier] || tier}
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/*                            CITIZEN EDIT DIALOG                             */
/* -------------------------------------------------------------------------- */

function CitizenDialog({
  open,
  onOpenChange,
  citizen,
  createdTodayCount,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  citizen: Citizen | null;
  createdTodayCount: number;
}) {
  const qc = useQueryClient();
  const isEdit = !!citizen;
  const [membership, setMembership] = useState<"standard" | "exclusive" | "elite" | "vip">(
    citizen?.membership ?? "standard",
  );

  const initial = citizen ?? {
    full_name: "",
    nickname: "",
    membership: "standard" as const,
    membership_since: null,
    notes: "",
  };

  const save = useMutation({
    mutationFn: async (values: any) => {
      if (isEdit && citizen) {
        const { error } = await supabase.from("citizens").update(values).eq("id", citizen.id);
        if (error) throw error;
      } else {
        if (createdTodayCount >= 5) {
          throw new Error(
            "Limite giornaliero raggiunto: non puoi creare più di 5 cittadini al giorno nella sezione Cittadini!",
          );
        }
        const { error } = await supabase.from("citizens").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["citizens"] });
      qc.invalidateQueries({ queryKey: ["citizens-mini"] });
      toast.success(isEdit ? "Cittadino aggiornato" : "Cittadino creato");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#12141c] border-slate-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase tracking-wider text-white">
            {isEdit ? "Modifica Cittadino" : "Nuovo Cittadino"}
          </DialogTitle>
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
          key={citizen?.id ?? "new"}
          id="citizen-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isEdit && createdTodayCount >= 5) {
              toast.error(
                "Limite giornaliero raggiunto: non puoi creare più di 5 cittadini al giorno nella sezione Cittadini!",
              );
              return;
            }
            const fd = new FormData(e.currentTarget);
            const v = Object.fromEntries(fd) as any;

            const trimmedName = v.full_name?.trim() || "";
            if (!trimmedName) {
              toast.error("Il nome completo è obbligatorio");
              return;
            }

            const existingCitizens = qc.getQueryData<Citizen[]>(["citizens"]) || [];
            const isDuplicate = existingCitizens.some((c) => {
              if (citizen && c.id === citizen.id) return false;
              return c.full_name?.trim().toLowerCase() === trimmedName.toLowerCase();
            });

            if (isDuplicate) {
              toast.error(`Esiste già un cittadino registrato con il nome "${trimmedName}"!`);
              return;
            }

            save.mutate(v);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="membership" value={membership} />

          <div>
            <Label className="text-xs font-bold text-slate-300">Nome Completo / Ruolo *</Label>
            <Input
              name="full_name"
              required
              defaultValue={initial.full_name ?? ""}
              className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1.5"
              placeholder="Es: Mario Rossi o Nickname Giocatore"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-300">Nickname Minecraft</Label>
            <Input
              name="nickname"
              defaultValue={initial.nickname ?? ""}
              className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1.5"
              placeholder="Es: Steve123"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-300">Livello Membership</Label>
            <Select value={membership} onValueChange={(val: any) => setMembership(val)}>
              <SelectTrigger className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#12141c] border-slate-800 text-white">
                {Object.entries(MEMBERSHIP_LABEL).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-300">Note Speciali</Label>
            <Textarea
              name="notes"
              defaultValue={initial.notes ?? ""}
              rows={3}
              className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1.5"
              placeholder="Informazioni o preferenze del cliente..."
            />
          </div>
        </form>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-slate-800 text-slate-300 hover:text-white rounded-xl"
          >
            Annulla
          </Button>
          <Button
            form="citizen-form"
            type="submit"
            disabled={save.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl"
          >
            {isEdit ? "Salva Modifiche" : "Crea Cittadino"}
          </Button>
        </DialogFooter>
      </DialogContent>
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

  const hasOperations = groupedNights.length > 0;

  const filteredGroupedNights = useMemo(() => {
    if (selectedNightId === "all") return groupedNights;
    return groupedNights.filter((g) => g.night_id === selectedNightId);
  }, [groupedNights, selectedNightId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-[#12141c] border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-wider text-white">
            <History className="h-5 w-5 text-amber-400" /> Storico Operazioni:{" "}
            <span className="text-amber-400">{citizen.full_name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {hasOperations && (
            <div className="flex items-center gap-3 bg-[#0a0b10] p-3 rounded-2xl border border-slate-800 max-w-md">
              <Label htmlFor="night-filter" className="text-xs font-bold text-slate-400 shrink-0">
                Filtra per serata:
              </Label>
              <Select value={selectedNightId} onValueChange={setSelectedNightId}>
                <SelectTrigger
                  id="night-filter"
                  className="bg-[#12141c] border-slate-800 text-white text-xs h-9 rounded-xl"
                >
                  <SelectValue placeholder="Tutte le serate" />
                </SelectTrigger>
                <SelectContent className="bg-[#12141c] border-slate-800 text-white">
                  <SelectItem value="all">Tutte le serate</SelectItem>
                  {groupedNights.map((n) => (
                    <SelectItem key={n.night_id} value={n.night_id}>
                      {n.title} ({n.date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!hasOperations ? (
            <div className="text-center text-slate-400 py-12 border border-dashed border-slate-800 rounded-2xl bg-[#0a0b10]/40">
              Nessuna operazione registrata per questo cittadino.
            </div>
          ) : filteredGroupedNights.length === 0 ? (
            <div className="text-center text-slate-400 py-12 border border-dashed border-slate-800 rounded-2xl bg-[#0a0b10]/40">
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
