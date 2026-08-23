import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SiteFooter } from "@/components/Footer";
import { SiteNavbar } from "@/components/SiteNavbar";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Coins,
  Euro,
  ShoppingBag,
  Lock,
  ArrowLeftRight,
  Crown,
  Calendar,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Shield,
  Send,
  Sparkles,
  User,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  QrCode,
  CreditCard,
  Flame,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatDobloni,
  usernameToEmail,
} from "@/lib/format";
import { getPublicMembershipPlans, MembershipPlan } from "@/lib/membership.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/scheda-cittadino")({
  head: () => ({
    meta: [
      { title: "Tessera Giocatore & Profilo — Casinò Revenge" },
      {
        name: "description",
        content:
          "Consulta la tua tessera ufficiale di giocatore del Casinò Revenge, saldo conversioni Dobloni, cassetta di sicurezza e vantaggi della tua Membership.",
      },
    ],
  }),
  component: SchedaCittadinoPage,
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
  isVirtual?: boolean;
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

function SchedaCittadinoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, profile, hasEmployeeAccess, isAdmin, loading: authLoading } = useAuth();

  // Auth Dialog state (for visitors not logged in)
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Copied Nick state
  const [copiedNick, setCopiedNick] = useState(false);
  const [copiedSerial, setCopiedSerial] = useState(false);

  // Fetch all citizens to match current user's profile
  const {
    data: citizens = [],
    refetch: refetchCitizens,
    isFetching: isFetchingCitizens,
  } = useQuery({
    queryKey: ["citizens-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("citizens").select("*").order("full_name");
      if (error) {
        console.warn("Error fetching citizens list:", error);
        return [];
      }
      return (data || []) as Citizen[];
    },
  });

  // Fetch profiles for operator names
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-public-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, username, display_name");
      return (data || []) as any[];
    },
  });

  const profileMap = useMemo(() => {
    return Object.fromEntries(profiles.map((p) => [p.id, p]));
  }, [profiles]);

  // Fetch dynamic Membership Plans configured by employees / staff
  const { data: membershipPlans = [] } = useQuery({
    queryKey: ["public-membership-plans"],
    queryFn: async () => await getPublicMembershipPlans(),
  });

  // Match current user's citizen card
  const myCitizen = useMemo(() => {
    if (!profile && !user) return null;
    const userNick = (profile?.username || user?.user_metadata?.username || "")
      .trim()
      .toLowerCase();
    const userDisplay = (profile?.display_name || user?.user_metadata?.display_name || "")
      .trim()
      .toLowerCase();

    if (!userNick && !userDisplay) return null;

    const found = citizens.find((c) => {
      const fn = c.full_name?.trim().toLowerCase();
      const nn = c.nickname?.trim().toLowerCase();
      return (
        (userNick && (fn === userNick || nn === userNick)) ||
        (userDisplay && (fn === userDisplay || nn === userDisplay))
      );
    });

    if (found) return { ...found, isVirtual: false };

    // Fallback virtual representation
    const resolvedName =
      profile?.display_name || profile?.username || user?.user_metadata?.username || "Cittadino";
    const resolvedNick = profile?.username || user?.user_metadata?.username || "Utente";

    return {
      id: `virtual-${profile?.id || "user"}`,
      full_name: resolvedName,
      nickname: resolvedNick,
      membership: "standard" as const,
      membership_since: profile?.created_at || new Date().toISOString(),
      notes: "Tessera registrata e sincronizzata con il Nickname Minecraft.",
      created_at: profile?.created_at || new Date().toISOString(),
      isVirtual: true,
    };
  }, [citizens, profile, user]);

  // Match active membership plan based on staff database settings
  const activePlan = useMemo<MembershipPlan | null>(() => {
    if (!membershipPlans || membershipPlans.length === 0) return null;

    // 1. Exact match by membership_plan_id
    if (myCitizen?.membership_plan_id) {
      const found = membershipPlans.find((p) => p.id === myCitizen.membership_plan_id);
      if (found) return found;
    }

    // 2. Match by membership code or name
    if (myCitizen?.membership) {
      const codeOrName = myCitizen.membership.toLowerCase().trim();
      const found = membershipPlans.find(
        (p) =>
          p.code?.toLowerCase().trim() === codeOrName ||
          p.name?.toLowerCase().trim() === codeOrName ||
          p.id?.toLowerCase().trim() === codeOrName,
      );
      if (found) return found;
    }

    // 3. Fallback to default or standard plan
    return (
      membershipPlans.find((p) => p.is_default) ||
      membershipPlans.find((p) => p.code === "standard") ||
      membershipPlans[0]
    );
  }, [membershipPlans, myCitizen]);

  // Expiration and renewal validity calculations set by employees
  const membershipExpirationInfo = useMemo(() => {
    if (
      !myCitizen?.membership_expires_at ||
      activePlan?.is_permanent ||
      activePlan?.renewal_days === 0
    ) {
      return {
        isPermanent: true,
        isExpired: false,
        daysRemaining: null,
        formattedDate: null,
        statusText: "Accesso Permanente",
        statusColor: "emerald",
      };
    }

    const expDate = new Date(myCitizen.membership_expires_at);
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const formattedDate = formatDate(myCitizen.membership_expires_at);

    if (daysRemaining < 0) {
      return {
        isPermanent: false,
        isExpired: true,
        daysRemaining,
        formattedDate,
        statusText: `Scaduta il ${formattedDate}`,
        statusColor: "rose",
      };
    } else if (daysRemaining <= 7) {
      return {
        isPermanent: false,
        isExpired: false,
        daysRemaining,
        formattedDate,
        statusText: `In scadenza tra ${daysRemaining} ${daysRemaining === 1 ? "giorno" : "giorni"} (${formattedDate})`,
        statusColor: "amber",
      };
    } else {
      return {
        isPermanent: false,
        isExpired: false,
        daysRemaining,
        formattedDate,
        statusText: `Attiva fino al ${formattedDate} (${daysRemaining} gg rimanenti)`,
        statusColor: "emerald",
      };
    }
  }, [myCitizen?.membership_expires_at, activePlan]);

  const citizenId = myCitizen?.id;
  const mcNickname = profile?.username || myCitizen?.nickname || myCitizen?.full_name || "Ospite";
  const fullName = myCitizen?.full_name || profile?.display_name || mcNickname;
  const membershipTier = myCitizen?.membership || "standard";

  // Fetch Conversions for this citizen
  const {
    data: conversions = [],
    refetch: refetchConversions,
    isFetching: isFetchingConversions,
  } = useQuery({
    queryKey: ["my-public-conversions", citizenId, mcNickname],
    queryFn: async () => {
      if (!citizenId || citizenId.startsWith("virtual-")) return [];
      const { data, error } = await supabase
        .from("conversions")
        .select("*")
        .eq("citizen_id", citizenId)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Could not fetch conversions:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!citizenId && !citizenId.startsWith("virtual-"),
  });

  // Fetch Night Items (Purchases & Consumptions)
  const {
    data: nightItems = [],
    refetch: refetchNightItems,
    isFetching: isFetchingNightItems,
  } = useQuery({
    queryKey: ["my-public-night-items", citizenId, mcNickname],
    queryFn: async () => {
      if (!citizenId || citizenId.startsWith("virtual-")) return [];
      const { data, error } = await supabase
        .from("night_items")
        .select("*")
        .eq("citizen_id", citizenId)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Could not fetch night items:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!citizenId && !citizenId.startsWith("virtual-"),
  });

  // Fetch Safe Box if assigned
  const { data: safeBox, refetch: refetchSafeBox } = useQuery({
    queryKey: ["my-public-safe-box", citizenId],
    queryFn: async () => {
      if (!citizenId || citizenId.startsWith("virtual-")) return null;
      const { data, error } = await supabase
        .from("safe_boxes")
        .select("*")
        .eq("citizen_id", citizenId)
        .maybeSingle();
      if (error) return null;
      return (data || null) as SafeBox | null;
    },
    enabled: !!citizenId && !citizenId.startsWith("virtual-"),
  });

  const isRefreshingAll = isFetchingCitizens || isFetchingConversions || isFetchingNightItems;

  const handleRefresh = async () => {
    await Promise.all([
      refetchCitizens(),
      refetchConversions(),
      refetchNightItems(),
      refetchSafeBox(),
    ]);
    toast.success("Dati aggiornati con successo");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      toast.error("Inserisci username e password");
      return;
    }
    setLoginLoading(true);
    try {
      const email = usernameToEmail(loginUsername);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });
      if (error) throw error;
      toast.success("Accesso effettuato con successo!");
      setLoginOpen(false);
      qc.invalidateQueries();
    } catch (err: any) {
      toast.error(err?.message || "Credenziali non valide");
    } finally {
      setLoginLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.info("Scollegato con successo");
    navigate({ to: "/" });
  };

  const copyNickname = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(mcNickname);
      setCopiedNick(true);
      toast.success("Nickname Minecraft copiato negli appunti!");
      setTimeout(() => setCopiedNick(false), 2000);
    }
  };

  const passSerial = `REV-${(myCitizen?.id || profile?.id || "0000").slice(0, 8).toUpperCase()}`;

  const copySerial = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(passSerial);
      setCopiedSerial(true);
      toast.success("Codice seriale tessera copiato!");
      setTimeout(() => setCopiedSerial(false), 2000);
    }
  };

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
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 font-sans antialiased">
      {/* UNIFIED FLOATING NAVBAR */}
      <SiteNavbar onOpenLogin={() => setLoginOpen(true)} />

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:py-8 space-y-8 sm:space-y-10">
        {/* BREADCRUMB / BACK LINK */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Torna al portale principale
          </Link>
          {user && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshingAll}
              className="bg-[#0e111a] border-slate-800 text-slate-300 hover:text-white text-xs h-8 rounded-xl font-bold gap-2"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-amber-400 ${isRefreshingAll ? "animate-spin" : ""}`}
              />
              Aggiorna Dati
            </Button>
          )}
        </div>

        {/* NOT LOGGED IN STATE */}
        {!user && !authLoading && (
          <div className="relative rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#111420] via-[#141824] to-[#0c0e17] p-8 md:p-12 text-center shadow-2xl overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-xl mx-auto space-y-4 relative z-10">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-3xl shadow-xl">
                <CreditCard className="h-8 w-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase">
                Tessera Giocatore Casinò Revenge
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Accedi per consultare in tempo reale la tua tessera ufficiale di gioco del Casinò
                Revenge, verificare il saldo Dobloni, visualizzare lo storico delle conversioni
                registrate alla cassa e usufruire dei privilegi della tua Membership.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="lg"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm px-8 rounded-xl shadow-xl shadow-amber-500/20"
                  onClick={() => setLoginOpen(true)}
                >
                  Accedi per visualizzare la Scheda
                </Button>
                <Link to="/">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-slate-800 text-slate-300 hover:text-white rounded-xl text-sm"
                  >
                    Scopri di più sul Casinò
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* LOGGED IN CITIZEN PASSPORT VIEW */}
        {user && (
          <div className="space-y-8">
            {/* HERO PASSPORT CARD */}
            <div className="relative rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-[#121624] via-[#161c2d] to-[#0c0e18] p-6 sm:p-8 shadow-[0_0_50px_-10px_rgba(245,158,11,0.2)] overflow-hidden">
              {/* Background ambient lights & patterns */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-4 right-6 text-[80px] font-black text-amber-500/5 select-none pointer-events-none">
                ♠
              </div>

              {/* CARD TOP BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-amber-500/20 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-400 animate-pulse shadow-md shadow-amber-500" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-400">
                    CASINÒ REVENGE • PASSAPORTO UFFICIALE GIOCATORE
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span>SERIALE:</span>
                  <div
                    onClick={copySerial}
                    className="cursor-pointer bg-[#090b12] hover:bg-slate-800 text-amber-300 font-bold px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1.5 transition-colors"
                    title="Clicca per copiare il seriale"
                  >
                    <span>{passSerial}</span>
                    {copiedSerial ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 opacity-60" />
                    )}
                  </div>
                </div>
              </div>

              {/* CARD BODY: AVATAR & MAIN DETAILS */}
              <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
                {/* AVATAR & INFO (8 cols) */}
                <div className="lg:col-span-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="relative group shrink-0">
                    <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-gradient-to-br from-amber-500/30 via-slate-900 to-amber-950 border-2 border-amber-500/60 p-1.5 flex items-center justify-center shadow-2xl overflow-hidden">
                      <img
                        src={`https://mc-heads.net/avatar/${encodeURIComponent(mcNickname)}/112`}
                        alt={mcNickname}
                        className="h-full w-full object-cover rounded-xl shadow-inner"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div
                      className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 rounded-full p-1.5 border-2 border-[#121624] shadow-lg"
                      title="Account Attivo e Sincronizzato"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
                        {fullName}
                      </h2>
                      <MembershipBadge plan={activePlan} tier={membershipTier} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-300 font-medium">
                      <div
                        onClick={copyNickname}
                        className="inline-flex items-center gap-1.5 bg-[#090b12] hover:bg-slate-800 text-amber-400 border border-slate-800 px-3 py-1 rounded-lg font-mono font-bold cursor-pointer transition-colors shadow-inner"
                        title="Clicca per copiare il nickname"
                      >
                        <span>MC: {mcNickname}</span>
                        {copiedNick ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 opacity-60" />
                        )}
                      </div>

                      <span className="text-slate-600">•</span>
                      <span className="inline-flex items-center gap-1.5 text-slate-400 font-mono">
                        <Calendar className="h-3.5 w-3.5 text-amber-500/70" /> Membro dal{" "}
                        <strong className="text-slate-200">
                          {myCitizen?.membership_since
                            ? formatDate(myCitizen.membership_since)
                            : formatDate(myCitizen?.created_at || new Date().toISOString())}
                        </strong>
                      </span>
                    </div>

                    {/* DYNAMIC MEMBERSHIP STATUS & EXPIRATION BAR */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md ${
                          membershipExpirationInfo.statusColor === "rose"
                            ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
                            : membershipExpirationInfo.statusColor === "amber"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                        }`}
                      >
                        {membershipExpirationInfo.statusText}
                      </Badge>

                      {activePlan && !activePlan.is_permanent && activePlan.renewal_days > 0 && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          Rinnovo:{" "}
                          <strong className="text-amber-300 font-bold">
                            {formatMoney(activePlan.renewal_cost || activePlan.cost_eur || 0)}
                          </strong>{" "}
                          ogni {activePlan.renewal_days} giorni
                        </span>
                      )}
                    </div>

                    {myCitizen?.notes && (
                      <p className="text-xs text-slate-400 italic pt-1 max-w-xl">
                        "{myCitizen.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* TELEGRAM & PASS STATUS (4 cols) */}
                <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
                  {/* Status Badge Box */}
                  <div className="bg-[#090b12]/90 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3">
                      <Shield className="h-6 w-6 text-amber-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-mono tracking-widest">
                          Stato Registrazione
                        </div>
                        <div className="text-xs font-black text-amber-300 font-mono uppercase tracking-wider">
                          {myCitizen?.isVirtual ? "IN ATTESA ASSEGNAZIONE" : "VERIFICATO & ATTIVO"}
                        </div>
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      ♠
                    </div>
                  </div>

                  {/* Telegram Link Box */}
                  <div className="bg-[#090b12]/90 border border-sky-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3">
                      <Send className="h-5 w-5 text-sky-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-mono tracking-widest">
                          Canale Notifiche Telegram
                        </div>
                        <div className="text-xs font-bold text-sky-300 font-mono">
                          {profile?.telegram_handle
                            ? `@${profile.telegram_handle.replace(/^@/, "")}`
                            : "Non collegato"}
                        </div>
                      </div>
                    </div>
                    {profile?.telegram_connected ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                        Attivo
                      </Badge>
                    ) : (
                      <a
                        href="https://t.me/CasinoRevengeBot"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 px-2 py-1 rounded-lg font-bold transition-colors"
                      >
                        Collega
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* KEY METRICS BENTO GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {/* DOBLONI CONVERTITI */}
              <div className="bg-[#0f121d] border border-amber-500/20 hover:border-amber-500/40 transition-colors rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Dobloni Acquisiti
                  </span>
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                    <Coins className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl md:text-3xl font-black text-amber-400 font-mono tracking-tight">
                    {formatDobloni(totalDobloniBought)}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400 font-medium">
                  Incassati in EUR:{" "}
                  <strong className="text-slate-300 font-mono">
                    {formatDobloni(totalDobloniCashedOut)}
                  </strong>
                </div>
              </div>

              {/* VOLUME EURO SCAMBIATO */}
              <div className="bg-[#0f121d] border border-emerald-500/20 hover:border-emerald-500/40 transition-colors rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Volume Euro Cassa
                  </span>
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <Euro className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl md:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                    {formatMoney(totalEurMoved)}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400 font-medium">
                  Operazioni registrate:{" "}
                  <strong className="text-slate-300 font-mono">{conversions.length}</strong>
                </div>
              </div>

              {/* CONSUMAZIONI & SERVIZI */}
              <div className="bg-[#0f121d] border border-sky-500/20 hover:border-sky-500/40 transition-colors rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Servizi & Spese Bar
                  </span>
                  <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl md:text-3xl font-black text-sky-400 font-mono tracking-tight">
                    {formatMoney(totalPurchasesEur)}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400 font-medium">
                  Articoli consumati:{" "}
                  <strong className="text-slate-300 font-mono">{nightItems.length}</strong>
                </div>
              </div>

              {/* CASSETTA DI SICUREZZA */}
              <div className="bg-[#0f121d] border border-purple-500/20 hover:border-purple-500/40 transition-colors rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Cassetta Caveau
                  </span>
                  <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                    <Lock className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl md:text-3xl font-black text-white font-mono tracking-tight">
                    {safeBox ? `Box #${safeBox.box_number}` : "Nessuna"}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400 font-medium">
                  {safeBox?.active ? (
                    <span className="text-emerald-400 font-bold">🟢 Assegnata & Attiva</span>
                  ) : (
                    "Richiedi al gestore del Casinò"
                  )}
                </div>
              </div>
            </div>

            {/* OPERATIONS HISTORY & DETAILS TABS */}
            <div className="bg-[#0f121d] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
              <Tabs defaultValue="conversions" className="w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <TabsList className="bg-[#090b12] border border-slate-800 p-1.5 rounded-2xl">
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
                      <ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> Servizi & Bar (
                      {nightItems.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="perks"
                      className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 rounded-xl font-bold text-xs uppercase tracking-wider px-4 py-2"
                    >
                      <Crown className="h-3.5 w-3.5 mr-1.5" /> Vantaggi Membership
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* TAB 1: CONVERSIONI CASSA */}
                <TabsContent value="conversions" className="mt-5 space-y-4">
                  {conversions.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-[#090b12]/50 space-y-2">
                      <Coins className="h-10 w-10 text-amber-500/40 mx-auto" />
                      <p className="text-sm font-bold text-slate-200">
                        Nessuna conversione registrata
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Le tue conversioni di denaro in Dobloni o viceversa compariranno qui non
                        appena effettuate al banco cassa del Casinò.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-inner">
                      <Table>
                        <TableHeader className="bg-[#090b12]">
                          <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3.5">
                              Data & Ora
                            </TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3.5">
                              Tipo Operazione
                            </TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3.5 text-right">
                              Importo Euro
                            </TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3.5 text-right">
                              Dobloni Movimentati
                            </TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3.5 text-right">
                              Operatore Cassa
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {conversions.map((c: any) => {
                            const isCashToDobloni = c.direction === "cash_to_dobloni";
                            const op = c.created_by ? profileMap[c.created_by] : null;
                            const opName = op?.display_name || op?.username || "Staff Cassa";

                            return (
                              <TableRow
                                key={c.id}
                                className="border-b border-slate-800/60 hover:bg-[#090b12]/70 transition-colors"
                              >
                                <TableCell className="py-3.5">
                                  <div className="text-xs font-mono font-bold text-slate-200">
                                    {formatDateTime(c.created_at)}
                                  </div>
                                </TableCell>
                                <TableCell className="py-3.5">
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 ${
                                      isCashToDobloni
                                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                        : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                    }`}
                                  >
                                    {isCashToDobloni ? "Acquisto Dobloni" : "Incasso in Contanti"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-3.5 text-right font-mono font-bold text-slate-200 text-xs">
                                  {formatMoney(c.eur_amount)}
                                </TableCell>
                                <TableCell className="py-3.5 text-right font-mono font-bold text-amber-400 text-xs">
                                  {isCashToDobloni ? "+" : "-"}
                                  {formatDobloni(c.dobloni_amount)}
                                </TableCell>
                                <TableCell className="py-3.5 text-right text-xs text-slate-300 font-medium">
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

                {/* TAB 2: SERVIZI & ACQUISTI BAR */}
                <TabsContent value="purchases" className="mt-5 space-y-4">
                  {nightItems.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-[#090b12]/50 space-y-2">
                      <ShoppingBag className="h-10 w-10 text-sky-500/40 mx-auto" />
                      <p className="text-sm font-bold text-slate-200">
                        Nessun servizio o consumazione registrata
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Le tue consumazioni al lounge bar, cene o servizi riservati addebitati
                        compariranno in questa sezione.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-inner">
                      <Table>
                        <TableHeader className="bg-[#090b12]">
                          <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3.5">
                              Data & Ora
                            </TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3.5">
                              Articolo / Servizio
                            </TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3.5 text-center">
                              Quantità
                            </TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3.5 text-right">
                              Prezzo Unitario
                            </TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3.5 text-right">
                              Subtotale
                            </TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[11px] py-3.5 text-right">
                              Staff Bar
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {nightItems.map((p: any) => {
                            const op = p.created_by ? profileMap[p.created_by] : null;
                            const opName = op?.display_name || op?.username || "Staff";

                            return (
                              <TableRow
                                key={p.id}
                                className="border-b border-slate-800/60 hover:bg-[#090b12]/70 transition-colors"
                              >
                                <TableCell className="py-3.5">
                                  <div className="text-xs font-mono font-bold text-slate-200">
                                    {formatDateTime(p.created_at)}
                                  </div>
                                </TableCell>
                                <TableCell className="py-3.5 font-bold text-slate-200 text-xs">
                                  {p.service_name}
                                </TableCell>
                                <TableCell className="py-3.5 text-center font-mono text-xs font-bold text-slate-300">
                                  {p.qty}
                                </TableCell>
                                <TableCell className="py-3.5 text-right font-mono text-slate-400 text-xs">
                                  {formatMoney(p.unit_price)}
                                </TableCell>
                                <TableCell className="py-3.5 text-right font-mono font-bold text-sky-400 text-xs">
                                  {formatMoney(p.subtotal)}
                                </TableCell>
                                <TableCell className="py-3.5 text-right text-xs text-slate-300 font-medium">
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

                {/* TAB 3: PRIVILEGI & VANTAGGI MEMBERSHIP */}
                <TabsContent value="perks" className="mt-5 space-y-6">
                  {membershipPlans.length === 0 ? (
                    <div className="text-center py-10 bg-[#090b12] border border-slate-800 rounded-2xl p-6">
                      <p className="text-slate-400 text-xs">
                        Nessun livello di membership configurato al momento.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {membershipPlans.map((plan) => {
                        const isActive =
                          activePlan?.id === plan.id ||
                          activePlan?.code?.toLowerCase() === plan.code?.toLowerCase();
                        const isPermanent = plan.is_permanent || plan.renewal_days === 0;
                        const advs =
                          plan.advantages && plan.advantages.length > 0 ? plan.advantages : [];
                        const color = plan.badge_color || "#f59e0b";

                        return (
                          <div
                            key={plan.id}
                            className={`rounded-2xl p-5 border transition-all relative flex flex-col justify-between ${
                              isActive
                                ? "shadow-xl"
                                : "bg-[#090b12] border-slate-800/80 opacity-80 hover:opacity-100"
                            }`}
                            style={{
                              borderColor: isActive ? color : undefined,
                              backgroundColor: isActive ? `${color}10` : undefined,
                              boxShadow: isActive ? `0 10px 25px -5px ${color}20` : undefined,
                            }}
                          >
                            {plan.highlight_tag && (
                              <div className="absolute -top-3 right-3 z-10">
                                <Badge
                                  className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 shadow-md"
                                  style={{ backgroundColor: color, color: "#020617" }}
                                >
                                  ✨ {plan.highlight_tag}
                                </Badge>
                              </div>
                            )}

                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-extrabold uppercase px-2 py-0.5 tracking-wider"
                                  style={{
                                    color: color,
                                    borderColor: `${color}60`,
                                    backgroundColor: `${color}15`,
                                  }}
                                >
                                  {plan.name}
                                </Badge>

                                {isActive && (
                                  <span
                                    className="text-[10px] font-black uppercase font-mono tracking-wider flex items-center gap-1"
                                    style={{ color }}
                                  >
                                    <Crown className="h-3 w-3" /> Il tuo livello
                                  </span>
                                )}
                              </div>

                              <div className="mt-3">
                                <h3 className="font-extrabold text-white text-base">{plan.name}</h3>
                                <div className="mt-1 flex items-baseline gap-2">
                                  <span className="text-xl font-black text-white">
                                    {isPermanent
                                      ? "Accesso Base"
                                      : formatMoney(plan.cost_eur || plan.renewal_cost || 0)}
                                  </span>
                                  {!isPermanent && plan.renewal_days > 0 && (
                                    <span className="text-[11px] text-slate-400 font-mono">
                                      / {plan.renewal_days} giorni
                                    </span>
                                  )}
                                </div>
                                {plan.cost_dobloni && plan.cost_dobloni > 0 ? (
                                  <div className="text-[11px] text-amber-400 font-mono font-bold mt-0.5">
                                    oppure {formatDobloni(plan.cost_dobloni)}
                                  </div>
                                ) : null}
                              </div>

                              {plan.description && (
                                <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                                  {plan.description}
                                </p>
                              )}

                              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                  Vantaggi Inclusi:
                                </div>
                                <ul className="space-y-2 text-xs text-slate-300">
                                  {advs.length > 0 ? (
                                    advs.map((adv, idx) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <Check
                                          className="h-3.5 w-3.5 shrink-0 mt-0.5"
                                          style={{ color }}
                                        />
                                        <span>{adv}</span>
                                      </li>
                                    ))
                                  ) : (
                                    <li className="flex items-center gap-2 text-slate-400">
                                      <Check className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                      <span>Accesso base casinò</span>
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </div>

                            {isActive && (
                              <div className="mt-5 pt-3 border-t border-slate-800/60">
                                <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                                  <span>Validità:</span>
                                  <span className="font-mono" style={{ color }}>
                                    {membershipExpirationInfo.isPermanent
                                      ? "Permanente"
                                      : membershipExpirationInfo.statusText}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </main>

      {/* LOGIN MODAL */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="bg-[#10131e] border-amber-500/40 text-white max-w-md p-6 rounded-3xl shadow-2xl">
          <DialogHeader className="space-y-2 text-center">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl">
              ♠
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">
              Accedi alla tua Tessera
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Inserisci le tue credenziali di gioco o il tuo nickname Minecraft registrato
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLogin} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold uppercase">Username</Label>
              <Input
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Es. Mario_Rossi"
                className="bg-[#090b12] border-slate-800 text-white rounded-xl text-xs h-10"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold uppercase">Password</Label>
              <Input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-[#090b12] border-slate-800 text-white rounded-xl text-xs h-10"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider h-11 rounded-xl shadow-lg shadow-amber-500/20"
            >
              {loginLoading ? "Verifica in corso..." : "Accedi alla Scheda"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}

function MembershipBadge({ plan, tier }: { plan?: MembershipPlan | null; tier?: string }) {
  if (plan) {
    const color = plan.badge_color || "#f59e0b";
    return (
      <Badge
        className="font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 shadow-md flex items-center gap-1.5 border"
        style={{
          backgroundColor: `${color}18`,
          color: color,
          borderColor: `${color}50`,
        }}
      >
        <Crown className="h-3 w-3" style={{ color }} />
        <span>{plan.name}</span>
        {plan.highlight_tag && (
          <span
            className="text-[9px] px-1 py-0.2 rounded font-mono font-bold ml-0.5"
            style={{ backgroundColor: `${color}35`, color }}
          >
            {plan.highlight_tag}
          </span>
        )}
      </Badge>
    );
  }

  switch (tier?.toLowerCase()) {
    case "vip":
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-0 font-black text-[10px] uppercase tracking-wider shadow-md shadow-amber-500/20 px-2.5 py-0.5">
          <Crown className="h-3 w-3 mr-1" /> VIP Platinum
        </Badge>
      );
    case "elite":
      return (
        <Badge className="bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5">
          <Sparkles className="h-3 w-3 mr-1 text-sky-400" /> Èlite
        </Badge>
      );
    case "exclusive":
      return (
        <Badge className="bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5">
          <Flame className="h-3 w-3 mr-1 text-purple-400" /> Exclusive
        </Badge>
      );
    default:
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5">
          <Shield className="h-3 w-3 mr-1 text-emerald-400" /> Standard
        </Badge>
      );
  }
}
