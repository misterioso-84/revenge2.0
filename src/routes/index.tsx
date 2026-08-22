import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Shield,
  Sparkles,
  Trophy,
  Coins,
  Crown,
  Users,
  Dices,
  Lock,
  ArrowRight,
  CheckCircle2,
  Send,
  UserCheck,
  AlertCircle,
  LogOut,
  ExternalLink,
  ChevronRight,
  Tv,
  Star,
  MapPin,
  Anchor,
  MessageCircle,
  Play,
  RotateCcw,
  Gamepad2,
  Flame,
  ClipboardList,
  User,
  Settings2,
  Globe,
  Check,
  Pencil,
  Building2,
  Info,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SiteFooter } from "@/components/Footer";
import { SiteNavbar } from "@/components/SiteNavbar";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import {
  checkCitizenEligibility,
  registerPublicUser,
  getPublicStaffList,
  requestTelegramVerificationCode,
  cancelTelegramVerificationCode,
  verifyTelegramCode,
} from "@/lib/registration.functions";
import { usernameToEmail, formatMoney, formatDobloni } from "@/lib/format";
import {
  getPublicMembershipPlans,
  getHomepageMembershipConfig,
  saveHomepageMembershipConfig,
  saveMembershipPlan,
  MembershipPlan,
  HomepageMembershipConfig,
  DEFAULT_HOMEPAGE_MEMBERSHIP_CONFIG,
  DEFAULT_MEMBERSHIP_PLANS,
} from "@/lib/membership.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Casinò Revenge — Liberty Bay" },
      {
        name: "description",
        content:
          "Guida Ufficiale e Portale del Casinò Revenge a Liberty Bay. Tavoli da gioco, Slot Machine, Corse dei Cavalli e Servizi di Lusso.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const { user, profile, isAdmin, customRoleNames, hasEmployeeAccess } = useAuth();

  const checkEligibilityFn = useServerFn(checkCitizenEligibility);
  const registerFn = useServerFn(registerPublicUser);
  const getStaffListFn = useServerFn(getPublicStaffList);

  const { data: rawStaffData } = useQuery({
    queryKey: ["public-staff-list"],
    queryFn: () => getStaffListFn(),
  });
  const staffList = Array.isArray(rawStaffData) ? rawStaffData : rawStaffData?.staffMembers || [];

  // Modals state
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  // Registration Wizard state
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [regNickname, setRegNickname] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [regTelegramHandle, setRegTelegramHandle] = useState("");
  const [regTelegramCode, setRegTelegramCode] = useState("");
  const [regBotMessage, setRegBotMessage] = useState<string | null>(null);
  const [regBusy, setRegBusy] = useState(false);
  const [eligibleData, setEligibleData] = useState<any>(null);
  const [regError, setRegError] = useState<string | null>(null);

  const reqTelegramCodeFn = useServerFn(requestTelegramVerificationCode);
  const cancelTelegramCodeFn = useServerFn(cancelTelegramVerificationCode);
  const verifyTelegramCodeFn = useServerFn(verifyTelegramCode);

  const handleCloseRegisterModal = async () => {
    if (regTelegramCode) {
      cancelTelegramCodeFn({ data: { code: regTelegramCode } }).catch(() => {});
    }
    localStorage.removeItem("casino_reg_state");
    setRegisterOpen(false);
    setRegStep(1);
    setRegNickname("");
    setEligibleData(null);
    setRegTelegramCode("");
    setRegTelegramHandle("");
    setRegBotMessage(null);
    setRegError(null);
    setRegPassword("");
    setRegPasswordConfirm("");
  };

  // Restore registration state if user left or refreshed page
  useEffect(() => {
    try {
      const saved = localStorage.getItem("casino_reg_state");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.regStep && data.regStep > 1) {
          setRegStep(data.regStep);
          if (data.regNickname) setRegNickname(data.regNickname);
          if (data.eligibleData) setEligibleData(data.eligibleData);
          if (data.regTelegramCode) setRegTelegramCode(data.regTelegramCode);
          if (data.regTelegramHandle) setRegTelegramHandle(data.regTelegramHandle);
          setRegisterOpen(true);
        }
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  // Save registration state on progress
  useEffect(() => {
    if (regStep > 1) {
      localStorage.setItem(
        "casino_reg_state",
        JSON.stringify({
          regStep,
          regNickname,
          eligibleData,
          regTelegramCode,
          regTelegramHandle,
        }),
      );
    }
  }, [regStep, regNickname, eligibleData, regTelegramCode, regTelegramHandle]);

  // Auto-generate Telegram code when reaching Step 2 if not present
  useEffect(() => {
    if (registerOpen && regStep === 2 && !regTelegramCode && !regBusy) {
      handleRegStartBot(false);
    }
  }, [registerOpen, regStep, regTelegramCode, regBusy]);

  // Auto-poll Telegram verification in Step 2
  useEffect(() => {
    if (!registerOpen || regStep !== 2 || !regTelegramCode) return;
    const interval = setInterval(async () => {
      try {
        const res = await verifyTelegramCodeFn({
          data: { code: regTelegramCode },
        });
        if (res.handle) {
          setRegTelegramHandle(res.handle);
          setRegError(null);
          toast.success(`✅ Account Telegram ${res.handle} collegato!`);
          setRegStep(3);
        }
      } catch (err: any) {
        if (err.message && err.message.includes("già stato collegato")) {
          setRegError(err.message);
        }
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [registerOpen, regStep, regTelegramCode, verifyTelegramCodeFn]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    try {
      const { data: authRes, error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(loginUsername),
        password: loginPassword,
      });
      if (error) throw error;

      toast.success("Accesso effettuato con successo!");
      setLoginOpen(false);

      if (authRes.user?.id) {
        const uid = authRes.user.id;
        const [{ data: prof }, { data: roles }, { data: customRoles }, { data: perms }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("has_employee_access, show_in_staff_list")
              .eq("id", uid)
              .maybeSingle(),
            supabase.from("user_roles").select("role").eq("user_id", uid),
            supabase.from("user_custom_roles").select("role_id").eq("user_id", uid),
            supabase.from("user_permissions").select("permission").eq("user_id", uid),
          ]);
        const isEmployeeOrAdmin =
          prof?.has_employee_access === true ||
          prof?.show_in_staff_list === true ||
          (roles || []).some((r: any) =>
            ["admin", "gestore", "capitano", "direzione"].includes(r.role),
          ) ||
          (customRoles || []).length > 0 ||
          (perms || []).length > 0;

        if (isEmployeeOrAdmin) {
          navigate({ to: "/dashboard" });
        } else {
          navigate({ to: "/scheda-cittadino" });
        }
      } else {
        navigate({ to: "/scheda-cittadino" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Credenziali di accesso non valide.");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleStep1Check = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegBusy(true);
    try {
      const res = await checkEligibilityFn({ data: { nickname: regNickname } });
      if (!res.eligible) {
        setRegError(res.message || "Non risulta che tu abbia effettuato neanche un acquisto.");
        return;
      }
      setEligibleData(res);
      toast.success(`Cittadino verificato: ${res.citizenName}`);
      setRegStep(2);
    } catch (err: any) {
      setRegError(err.message || "Errore durante la verifica del nickname.");
    } finally {
      setRegBusy(false);
    }
  };

  const handleRegStartBot = async (forceNew = true) => {
    setRegBusy(true);
    setRegError(null);
    try {
      if (forceNew && regTelegramCode) {
        cancelTelegramCodeFn({ data: { code: regTelegramCode } }).catch(() => {});
        setRegTelegramCode("");
      }
      const res = await reqTelegramCodeFn({
        data: {
          code: forceNew ? undefined : regTelegramCode,
          forceNew,
        },
      });
      if (res.code) {
        setRegTelegramCode(res.code);
      }
      setRegBotMessage(res.botMessage);
      if (forceNew) {
        toast.success(
          `Comando ${res.commandText || `/associa ${res.code}`} generato! Incollalo nel Bot Telegram.`,
        );
      }
    } catch (err: any) {
      setRegError(err.message || "Errore durante la generazione del codice Telegram.");
      toast.error(err.message || "Errore durante la generazione del codice Telegram.");
    } finally {
      setRegBusy(false);
    }
  };

  const handleStep2TelegramNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regTelegramCode || regTelegramCode.length < 4) {
      toast.error("Genera prima ed invia il comando al Bot Telegram.");
      return;
    }
    setRegBusy(true);
    setRegError(null);
    try {
      const res = await verifyTelegramCodeFn({
        data: {
          code: regTelegramCode,
        },
      });
      if (res.handle) {
        setRegTelegramHandle(res.handle);
      }
      toast.success(`Account Telegram ${res.handle} collegato con successo!`);
      setRegStep(3);
    } catch (err: any) {
      setRegError(err.message || "Comando non ancora inviato al Bot Telegram.");
      toast.error(err.message || "Comando non ancora inviato al Bot Telegram.");
    } finally {
      setRegBusy(false);
    }
  };

  const handleStep3Register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword.length < 6) {
      toast.error("La password deve contenere almeno 6 caratteri.");
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      toast.error("Le due password non coincidono.");
      return;
    }

    setRegBusy(true);
    try {
      const res = await registerFn({
        data: {
          nickname: regNickname,
          password: regPassword,
          telegramHandle: regTelegramHandle,
        },
      });
      toast.success(res.message || "Account registrato con successo!");
      localStorage.removeItem("casino_reg_state");
      setRegisterOpen(false);

      // Auto login with new credentials
      const { data: authRes, error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(regNickname),
        password: regPassword,
      });
      if (!error && authRes.user?.id) {
        const [{ data: prof }, { data: roles }] = await Promise.all([
          supabase
            .from("profiles")
            .select("has_employee_access")
            .eq("id", authRes.user.id)
            .maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", authRes.user.id),
        ]);
        const isEmployeeOrAdmin =
          prof?.has_employee_access || (roles || []).some((r: any) => r.role === "admin");
        if (isEmployeeOrAdmin) {
          navigate({ to: "/dashboard" });
        } else {
          navigate({ to: "/" });
        }
      } else {
        navigate({ to: "/" });
      }
    } catch (err: any) {
      toast.error(err.message || "Errore nella registrazione.");
    } finally {
      setRegBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.info("Scollegato con successo.");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200 flex flex-col justify-between">
      <div>
        {/* UNIFIED FLOATING HEADER NAVBAR */}
        <SiteNavbar
          onOpenLogin={() => setLoginOpen(true)}
          onOpenRegister={() => {
            setRegStep(1);
            setRegError(null);
            setRegisterOpen(true);
          }}
        />

        {/* HERO SECTION */}
        <section className="relative pt-8 sm:pt-12 pb-24 px-4 overflow-hidden border-b border-amber-500/10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-slate-950 to-slate-950 pointer-events-none" />
          <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 text-xs uppercase tracking-widest font-semibold rounded-full">
              🏴‍☠️ Il Casinò Ufficiale della Ciurma a Liberty Bay
            </Badge>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white uppercase leading-tight">
              Esperienza di Gioco, <br />
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
                Prestigio e Fortuna
              </span>
            </h1>

            <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Sperimenta l'emozione dei tavoli da gioco dal vivo, delle roulette esclusive, delle
              slot VIP e dell'ippodromo di Liberty Bay. Il casinò dei veri gentiluomini e capitani
              d'alto mare.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <a href="#guida">
                <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 h-12 text-sm shadow-xl shadow-amber-500/20 rounded-xl">
                  Leggi la Guida Ufficiale <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </a>
              <Link to="/candidature">
                <Button
                  variant="outline"
                  className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-bold px-6 h-12 text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/10"
                >
                  <ClipboardList className="h-4 w-4 text-amber-400" /> Candidature Staff
                </Button>
              </Link>
              {!user && (
                <Button
                  variant="outline"
                  className="border-slate-800 text-slate-300 hover:bg-slate-900 font-bold px-6 h-12 text-sm rounded-xl"
                  onClick={() => {
                    setRegStep(1);
                    setRegisterOpen(true);
                  }}
                >
                  Crea il tuo Account
                </Button>
              )}
            </div>

            {/* QUICK STATS STRIP */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-4xl mx-auto">
              <div className="bg-slate-900/60 border border-amber-500/20 p-4 rounded-xl text-center backdrop-blur-sm">
                <div className="text-2xl font-black text-amber-400">Blackjack x2.5</div>
                <div className="text-xs text-slate-400 mt-1">Regola Soft 17</div>
              </div>
              <div className="bg-slate-900/60 border border-amber-500/20 p-4 rounded-xl text-center backdrop-blur-sm">
                <div className="text-2xl font-black text-amber-400">Roulette x36</div>
                <div className="text-xs text-slate-400 mt-1">Single Zero Europea</div>
              </div>
              <div className="bg-slate-900/60 border border-amber-500/20 p-4 rounded-xl text-center backdrop-blur-sm">
                <div className="text-2xl font-black text-amber-400">4 Sale Slot</div>
                <div className="text-xs text-slate-400 mt-1">Classic, VIP, Exclusive, Elite</div>
              </div>
              <div className="bg-slate-900/60 border border-amber-500/20 p-4 rounded-xl text-center backdrop-blur-sm">
                <div className="text-2xl font-black text-amber-400">8 Fantini</div>
                <div className="text-xs text-slate-400 mt-1">Ippodromo Liberty Bay</div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: GUIDA & FILOSOFIA */}
        <motion.section
          id="guida"
          className="py-20 px-4 max-w-6xl mx-auto space-y-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center space-y-3">
            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1">
              Guida Interna Aziendale
            </Badge>
            <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase">
              La Filosofia del Casinò Revenge
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto">
              "Non viviamo del singolo colpo fortunato del giocatore, ma della sua presenza costante
              e appagante all'interno del nostro stabilimento."
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-slate-900/80 border-slate-800 hover:border-amber-500/40 transition-all">
              <CardHeader className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  🏛️
                </div>
                <CardTitle className="text-lg font-bold text-white">Sala Principale</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  L'epicentro del gioco aperto a tutti i cittadini e clienti della struttura.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-300 leading-relaxed space-y-2">
                Accoglie i tavoli tradizionali di Blackjack, la Roulette Europea principale e la
                prima galleria di Slot Classic. L'atmosfera perfetta per serate tra amici e
                intrattenimento quotidiano.
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-800 hover:border-amber-500/40 transition-all">
              <CardHeader className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  👑
                </div>
                <CardTitle className="text-lg font-bold text-white">Privé & Balconate</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Riservati ai possessori di card VIP, Exclusive ed Élite.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-300 leading-relaxed space-y-2">
                Sale ad alti limiti con maggiordomo privato, servizio al tavolo riservato, guardie
                del corpo dedicate e panoramica elevata sulla sala da gioco principale.
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-800 hover:border-amber-500/40 transition-all">
              <CardHeader className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  🐎
                </div>
                <CardTitle className="text-lg font-bold text-white">Ippodromo & Scuderie</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Tracciato ufficiale di gara per eventi sia dal vivo che simulati.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-300 leading-relaxed space-y-2">
                Dispone di 8 fantini ufficiali con statistiche trasparenti, scommesse in dobloni con
                quote dinamiche, spalti panoramici ed eventi settimanali.
              </CardContent>
            </Card>
          </div>
        </motion.section>

        {/* SECTION: VALUTE (€ & DOBLONI) */}
        <motion.section
          id="valute"
          className="py-16 px-4 bg-slate-900/50 border-y border-amber-500/10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1">
                Sistema a Doppia Valuta
              </Badge>
              <h2 className="text-3xl font-extrabold text-white uppercase tracking-tight">
                Euro (€) vs Dobloni (Fiche)
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Il Casinò Revenge gestisce le transazioni in modo chiaro e trasparente dividendo i
                servizi di città dalle puntate da gioco.
              </p>

              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-3">
                  <Coins className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold">Euro (€) - Valuta di Città</strong>
                    <p className="text-slate-400 mt-0.5">
                      Utilizzata per l'acquisto delle Membership (VIP, Exclusive, Élite), gli
                      accessi agli eventi speciali, i biglietti degli spalti e il canone delle
                      cassette di sicurezza.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-xl flex items-start gap-3">
                  <Dices className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold">Dobloni - Fiche del Casinò</strong>
                    <p className="text-slate-400 mt-0.5">
                      Utilizzate esclusivamente per le scommesse ai tavoli, le slot machine e i
                      servizi di lusso del listino interno.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 border border-amber-500/30 p-6 rounded-2xl shadow-2xl space-y-4">
              <h3 className="font-bold text-amber-400 uppercase text-sm tracking-wider flex items-center gap-2">
                <Coins className="h-4 w-4" /> Tassi Ufficiali di Conversione
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-300">Cambio Iniziale (Acquisto)</span>
                  <span className="font-mono font-bold text-amber-400">1 € = 10 Dobloni</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-300">Riconversione (In Cassa)</span>
                  <span className="font-mono font-bold text-amber-400">13,33 Dobloni = 1 €</span>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-200/80 leading-relaxed">
                  💡{" "}
                  <em>
                    Nota: La differenza del 25% garantisce la sostenibilità del banco e dei jackpot
                    della struttura.
                  </em>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* SECTION: MEMBERSHIP CARDS (DYNAMIC) */}
        <HomepageMembershipSection canManage={isAdmin || hasEmployeeAccess} />

        {/* SECTION: LA NOSTRA CIURMA (DELEGATED TO SEPARATE PAGE) */}
        <motion.section
          id="ciurma"
          className="py-16 px-4 max-w-6xl mx-auto space-y-8 border-t border-amber-500/10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-2xl p-8 md:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
              <Anchor className="h-64 w-64 text-amber-500" />
            </div>

            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 px-4 py-1 text-xs font-bold rounded-full uppercase tracking-wider">
              ⚓ Il Personale del Casinò Revenge
            </Badge>

            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight uppercase">
              La nostra Ciurma
            </h2>

            <p className="text-slate-300 text-sm max-w-2xl mx-auto leading-relaxed">
              La lista completa dello staff, dei croupier, gestori ed ufficiali è ora consultabile
              nella pagina dedicata con i dettagli sui ruoli e le competenze di ciascun membro.
            </p>

            <div className="pt-2">
              <Link to="/ciurma">
                <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-8 h-12 text-sm shadow-xl shadow-amber-500/20 rounded-xl">
                  <Anchor className="h-4 w-4 mr-2" /> VAI ALLA PAGINA DELLA CIURMA{" "}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.section>
        {/* SECTION: CANDIDATURE & RECLUTAMENTO STAFF */}
        <motion.section
          id="candidature-section"
          className="py-16 px-4 max-w-6xl mx-auto space-y-8 border-t border-amber-500/10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-gradient-to-br from-slate-900 via-[#151208] to-slate-900 border border-amber-500/40 rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -left-10 -top-10 opacity-10 pointer-events-none">
              <ClipboardList className="h-64 w-64 text-amber-500" />
            </div>

            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 px-4 py-1 text-xs font-bold rounded-full uppercase tracking-wider">
              ✨ Reclutamento Ufficiale Aperto
            </Badge>

            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
              Unisciti allo Staff del{" "}
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
                Casinò Revenge
              </span>
            </h2>

            <p className="text-slate-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              Cerchiamo Croupier per Roulette e Blackjack, Addetti alla Sicurezza e Hostess/Steward
              di Sala. Invia la tua candidatura online, compila il questionario e visualizza lo
              stato della tua richiesta in tempo reale.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left pt-2">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/20 space-y-1">
                <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  💰 Retribuzione & Mance
                </div>
                <div className="text-xs text-slate-400">
                  Paghe settimanali in Dobloni ed Euro con bonus mance ai tavoli
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/20 space-y-1">
                <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  🎓 Formazione Completa
                </div>
                <div className="text-xs text-slate-400">
                  Addestramento con i Croupier Master e guide ai regolamenti
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/20 space-y-1">
                <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  📈 Carriera & Concorsi
                </div>
                <div className="text-xs text-slate-400">
                  Possibilità di avanzamento a Capo Tavolo e Manager di Sala
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link to="/candidature">
                <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-8 h-12 text-sm shadow-xl shadow-amber-500/20 rounded-xl flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" /> COMPILA MODULO CANDIDATURA{" "}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.section>
      </div>

      {/* FOOTER */}
      <SiteFooter />

      {/* MODAL ACCESSO / LOGIN */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-amber-500/30 text-white">
          <DialogHeader className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 text-2xl font-bold">
              ♠
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight text-amber-400 uppercase">
              Accedi al Casinò
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Inserisci i tuoi dati di accesso per entrare nel portale.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs">Username / Nickname Minecraft</Label>
              <Input
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="es. MarioRossi"
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Password</Label>
              <Input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <Button
              type="submit"
              disabled={loginBusy}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-10"
            >
              {loginBusy ? "Verifica in corso..." : "Accedi"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL REGISTRAZIONE UTENTE (3 STEP) */}
      <Dialog
        open={registerOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseRegisterModal();
          } else {
            setRegisterOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-lg bg-slate-900 border-amber-500/30 text-white">
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-amber-400 uppercase">
                Registrazione Account
              </DialogTitle>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                Passo {regStep} di 3
              </Badge>
            </div>
            <DialogDescription className="text-slate-400 text-xs">
              {regStep === 1 && "Verifica la tua registrazione nei dati cittadini."}
              {regStep === 2 && "Collega il tuo account Telegram al Bot ufficiale del Casinò."}
              {regStep === 3 && "Scegli la tua password per completare la creazione."}
            </DialogDescription>
          </DialogHeader>

          {/* STEP 1: NICKNAME CHECK */}
          {regStep === 1 && (
            <form onSubmit={handleStep1Check} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Nickname Minecraft *</Label>
                <Input
                  required
                  placeholder="Inserisci il tuo nickname Minecraft esatto"
                  value={regNickname}
                  onChange={(e) => setRegNickname(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white text-sm"
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Il tuo nickname verrà verificato nel registro dei cittadini di Liberty Bay per
                  confermare che tu abbia effettuato almeno un acquisto o transazione.
                </p>
              </div>

              {regError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Verifica Fallita:</strong>
                    <p className="mt-0.5">{regError}</p>
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2 flex justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseRegisterModal}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={regBusy || !regNickname.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex-1"
                >
                  {regBusy ? "Verifica in corso..." : "Verifica Nickname e Prosegui"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* STEP 2: TELEGRAM BOT LINK & VERIFICATION */}
          {regStep === 2 && (
            <form onSubmit={handleStep2TelegramNext} className="space-y-4 pt-2">
              <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
                    <Send className="h-4 w-4" /> Collegamento Telegram Obbligatorio
                  </div>
                  <a
                    href={
                      regTelegramCode
                        ? `https://t.me/CasinoRevengeBot?start=${regTelegramCode}`
                        : "https://t.me/CasinoRevengeBot"
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:underline"
                  >
                    @CasinoRevengeBot <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Per completare la registrazione, associa il tuo account Telegram tramite il Bot
                  Ufficiale <strong>@CasinoRevengeBot</strong>. È consentito{" "}
                  <strong>1 solo account</strong> per utente.
                </p>

                {!regTelegramCode ? (
                  <Button
                    type="button"
                    onClick={() => handleRegStartBot(true)}
                    disabled={regBusy}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs h-10"
                  >
                    {regBusy ? "Generazione in corso..." : "🤖 Genera Codice di Associazione"}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <a
                      href={`https://t.me/CasinoRevengeBot?start=${regTelegramCode}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full bg-sky-600 hover:bg-sky-500 text-white font-bold h-11 rounded-xl text-xs shadow-md shadow-sky-600/20 transition-all"
                    >
                      <Send className="h-4 w-4" /> 1. APRI BOT TELEGRAM (@CasinoRevengeBot)
                      <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                    </a>

                    <div className="p-3 bg-slate-900 border border-sky-500/40 rounded-xl space-y-2">
                      <div className="text-[11px] text-sky-300 font-semibold uppercase">
                        Oppure invia questo comando in chat:
                      </div>
                      <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800 gap-2">
                        <code className="text-amber-400 font-mono text-sm font-bold truncate">
                          /associa {regTelegramCode}
                        </code>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-slate-300 hover:text-white px-2"
                            onClick={() => {
                              navigator.clipboard.writeText(`/associa ${regTelegramCode}`);
                              toast.success("Comando /associa copiato!");
                            }}
                          >
                            Copia
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/20 px-2"
                            onClick={() => handleRegStartBot(true)}
                            disabled={regBusy}
                            title="Genera un nuovo codice di associazione"
                          >
                            🔄 Nuovo
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {regError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-start gap-2.5 leading-relaxed">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <strong className="block font-bold text-rose-200">Avviso Associazione:</strong>
                    <p className="mt-0.5">{regError}</p>
                  </div>
                </div>
              )}

              {regBotMessage && (
                <div className="p-3 bg-slate-950 border border-sky-500/40 rounded-xl text-xs font-mono text-sky-200 leading-relaxed whitespace-pre-line shadow-inner">
                  {regBotMessage}
                </div>
              )}

              <DialogFooter className="pt-2 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseRegisterModal}
                  className="text-red-400 hover:text-red-300 text-xs hover:bg-red-500/10"
                >
                  Annulla
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRegStep(1)}
                    className="border-slate-800 text-slate-300 text-xs"
                  >
                    Indietro
                  </Button>
                  <Button
                    type="submit"
                    disabled={regBusy || !regTelegramCode}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                  >
                    {regBusy ? "Verifica in corso..." : "Verifica e Prosegui"}{" "}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}

          {/* STEP 3: PASSWORD & IP CHECK */}
          {regStep === 3 && (
            <form onSubmit={handleStep3Register} className="space-y-4 pt-2">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200">
                🔒 <strong>Limite IP:</strong> È consentito registrare un solo (1) account per ogni
                indirizzo IP.
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Scegli una Password (min. 6 caratteri)</Label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Conferma Password</Label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={regPasswordConfirm}
                  onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <DialogFooter className="pt-2 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseRegisterModal}
                  className="text-red-400 hover:text-red-300 text-xs hover:bg-red-500/10"
                >
                  Annulla & Cambia Nick
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRegStep(2)}
                    className="border-slate-800 text-slate-300 text-xs"
                  >
                    Indietro
                  </Button>
                  <Button
                    type="submit"
                    disabled={regBusy}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs"
                  >
                    {regBusy ? "Creazione in corso..." : "Completa Registrazione"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*             SEZIONE DINAMICA MEMBERSHIP & VANTAGGI HOMEPAGE                */
/* -------------------------------------------------------------------------- */

function HomepageMembershipSection({ canManage }: { canManage?: boolean }) {
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ["public-membership-plans"],
    queryFn: async () => await getPublicMembershipPlans(),
  });

  const { data: config = DEFAULT_HOMEPAGE_MEMBERSHIP_CONFIG } = useQuery({
    queryKey: ["homepage-membership-config"],
    queryFn: async () => await getHomepageMembershipConfig(),
  });

  const isVisible = config.is_section_visible ?? true;

  if (!isVisible && !canManage) {
    return null;
  }

  return (
    <>
      <motion.section
        id="membership"
        className="py-20 px-4 bg-slate-900/30 border-t border-amber-500/10 relative"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Admin Banner if Section is Hidden */}
          {!isVisible && canManage && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300">
              <span className="font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Sezione Membership attualmente nascosta al pubblico.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCustomizerOpen(true)}
                className="bg-transparent border-amber-500/40 text-amber-300 text-xs h-7 rounded-lg"
              >
                <Settings2 className="h-3.5 w-3.5 mr-1" /> Modifica Visibilità
              </Button>
            </div>
          )}

          {/* Section Header */}
          <div className="text-center space-y-3 relative">
            <div className="flex items-center justify-center gap-2">
              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3.5 py-1 text-xs uppercase tracking-wider font-bold">
                {config.badge_text || "Livelli di Abbonamento"}
              </Badge>

              {canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCustomizerOpen(true)}
                  className="bg-slate-900/80 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs h-7 px-2.5 rounded-lg shadow-sm"
                >
                  <Settings2 className="h-3.5 w-3.5 mr-1" /> Personalizza Sezione
                </Button>
              )}
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">
              {config.section_title || "Membership & Privilege Cards"}
            </h2>

            <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
              {config.section_subtitle ||
                "Sblocca vantaggi esclusivi, accessi riservati, maggiordomo e cassetta di sicurezza."}
            </p>
          </div>

          {/* Membership Cards Grid */}
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(
              plans.length || 4,
              4,
            )} gap-6`}
          >
            {plans.map((p) => {
              const isStd = p.code === "standard" || p.id === "plan-standard" || p.is_permanent;
              const hasHighlight = Boolean(p.highlight_tag);
              const advs = p.advantages && p.advantages.length > 0 ? p.advantages : [];

              return (
                <Card
                  key={p.id}
                  className={`bg-slate-950 border relative transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between ${
                    hasHighlight
                      ? "border-amber-400 shadow-2xl shadow-amber-500/15"
                      : "border-slate-800 hover:border-amber-500/40"
                  }`}
                  style={{
                    borderColor: hasHighlight ? p.badge_color || "#f59e0b" : undefined,
                  }}
                >
                  {hasHighlight && (
                    <div className="absolute -top-3.5 right-4 z-10">
                      <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] uppercase shadow-md tracking-wider px-2.5 py-0.5">
                        ✨ {p.highlight_tag}
                      </Badge>
                    </div>
                  )}

                  <div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className="w-fit text-[10px] font-extrabold uppercase px-2.5 py-0.5 tracking-wider"
                          style={{
                            color: p.badge_color || "#f59e0b",
                            borderColor: p.badge_color
                              ? `${p.badge_color}60`
                              : "rgba(245, 158, 11, 0.4)",
                            backgroundColor: p.badge_color
                              ? `${p.badge_color}15`
                              : "rgba(245, 158, 11, 0.1)",
                          }}
                        >
                          {p.name}
                        </Badge>
                      </div>

                      <div className="mt-2">
                        {isStd ? (
                          <div>
                            <CardTitle className="text-2xl font-black text-white">
                              Gratuito
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-400 mt-0.5">
                              Accesso Base Permanente
                            </CardDescription>
                          </div>
                        ) : (
                          <div>
                            <CardTitle className="text-2xl font-black text-amber-400">
                              {formatMoney(p.cost_eur || p.renewal_cost || 0)}
                            </CardTitle>
                            {config.show_dobloni_price && p.cost_dobloni && p.cost_dobloni > 0 && (
                              <div className="text-xs font-mono text-amber-300/80 font-bold mt-0.5">
                                oppure {formatDobloni(p.cost_dobloni)}
                              </div>
                            )}
                            <CardDescription className="text-xs text-sky-400 font-medium mt-1">
                              Durata: {p.renewal_days} giorni
                            </CardDescription>
                          </div>
                        )}
                      </div>

                      {p.description && (
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">{p.description}</p>
                      )}
                    </CardHeader>

                    {/* Vantaggi preceded by checkmark ✓ on every line */}
                    <CardContent className="pt-2 pb-5 space-y-2.5">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-900">
                        Vantaggi Inclusi:
                      </div>

                      {advs.length > 0 ? (
                        <div className="space-y-2">
                          {advs.map((adv, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2.5 text-xs text-slate-200 leading-snug"
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{adv}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2 text-xs text-slate-400">
                          <div className="flex items-start gap-2.5">
                            <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                            <span>Accesso al casinò e tavoli da gioco</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </div>

                  {/* Informative Footer Badge instead of button */}
                  <div className="p-4 pt-0">
                    {isStd ? (
                      <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-center text-[11px] text-slate-400 font-medium">
                        Incluso alla registrazione
                      </div>
                    ) : (
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-center text-[11px] text-amber-300 font-bold flex items-center justify-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        Richiedi in Cassa al Casinò Revenge
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Prominent Notice Banner: Per abbonarsi rivolgersi in cassa al Casinò Revenge */}
          <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/15 border border-amber-500/40 text-center max-w-3xl mx-auto shadow-2xl shadow-amber-500/10 space-y-2">
            <div className="flex items-center justify-center gap-2 text-amber-400 font-black text-sm md:text-base uppercase tracking-wider">
              <Building2 className="h-5 w-5 text-amber-400" /> Come Abbonarsi al Casinò Revenge
            </div>
            <p className="text-xs md:text-sm text-slate-200 leading-relaxed max-w-2xl mx-auto">
              Per abbonarsi o rinnovare la propria Privilege Card è necessario{" "}
              <strong className="text-amber-300 underline decoration-amber-500/50 underline-offset-2">
                rivolgersi direttamente in cassa al Casinò Revenge
              </strong>
              . Il nostro personale di cassa provvederà alla verifica e all'attivazione immediata
              della tua tessera e di tutti i relativi vantaggi.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Admin Homepage Customizer Modal */}
      {canManage && (
        <HomepageMembershipConfigDialog
          open={customizerOpen}
          onOpenChange={setCustomizerOpen}
          initialConfig={config}
          plans={plans}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*         DIALOG PERSONALIZZAZIONE HOMEPAGE & VANTAGGI (ADMIN/STAFF)         */
/* -------------------------------------------------------------------------- */

function HomepageMembershipConfigDialog({
  open,
  onOpenChange,
  initialConfig,
  plans,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  initialConfig: HomepageMembershipConfig;
  plans: MembershipPlan[];
}) {
  const [badgeText, setBadgeText] = useState(initialConfig.badge_text || "Livelli di Abbonamento");
  const [title, setTitle] = useState(initialConfig.section_title || "Membership & Privilege Cards");
  const [subtitle, setSubtitle] = useState(
    initialConfig.section_subtitle ||
      "Sblocca vantaggi esclusivi, accessi riservati, maggiordomo e cassetta di sicurezza.",
  );
  const [isVisible, setIsVisible] = useState(initialConfig.is_section_visible ?? true);
  const [showDobloni, setShowDobloni] = useState(initialConfig.show_dobloni_price ?? true);
  const [ctaText, setCtaText] = useState(initialConfig.cta_button_text || "");
  const [ctaLink, setCtaLink] = useState(initialConfig.cta_button_link || "");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setBadgeText(initialConfig.badge_text || "Livelli di Abbonamento");
      setTitle(initialConfig.section_title || "Membership & Privilege Cards");
      setSubtitle(
        initialConfig.section_subtitle ||
          "Sblocca vantaggi esclusivi, accessi riservati, maggiordomo e cassetta di sicurezza.",
      );
      setIsVisible(initialConfig.is_section_visible ?? true);
      setShowDobloni(initialConfig.show_dobloni_price ?? true);
      setCtaText(initialConfig.cta_button_text || "");
      setCtaLink(initialConfig.cta_button_link || "");
    }
  }, [initialConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveHomepageMembershipConfig({
        data: {
          badge_text: badgeText.trim(),
          section_title: title.trim(),
          section_subtitle: subtitle.trim(),
          is_section_visible: isVisible,
          show_dobloni_price: showDobloni,
          cta_button_text: ctaText.trim(),
          cta_button_link: ctaLink.trim(),
        },
      });
      toast.success("Configurazione vetrina homepage salvata con successo!");
      onOpenChange(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.message || "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#12141c] border-slate-800 text-white max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black uppercase tracking-wider text-white">
                Personalizza Vetrina Homepage
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Modifica testi, visibilità e visualizzazione dei prezzi delle membership
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-bold text-slate-300">Testo Badge Superiore</Label>
            <Input
              value={badgeText}
              onChange={(e) => setBadgeText(e.target.value)}
              placeholder="Es: Livelli di Abbonamento"
              className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-300">Titolo Principale Sezione *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es: Membership & Privilege Cards"
              required
              className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-300">Sottotitolo Descrittivo</Label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Es: Sblocca vantaggi esclusivi, accessi riservati e maggiordomo dedicato."
              className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-300">
                Testo Pulsante CTA (Opzionale)
              </Label>
              <Input
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="Es: Scopri di Più"
                className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-300">Link Pulsante CTA</Label>
              <Input
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                placeholder="Es: #valute oppure /candidature"
                className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer bg-[#0a0b10] border border-slate-800 p-3 rounded-xl hover:border-slate-700">
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => setIsVisible(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
              />
              <span className="font-semibold">Mostra Sezione sulla Homepage</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer bg-[#0a0b10] border border-slate-800 p-3 rounded-xl hover:border-slate-700">
              <input
                type="checkbox"
                checked={showDobloni}
                onChange={(e) => setShowDobloni(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
              />
              <span className="font-semibold">Mostra anche Prezzo in Dobloni</span>
            </label>
          </div>

          {/* Quick link to Cittadini page for in-depth plan management */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs space-y-1 text-amber-300">
            <span className="font-bold flex items-center gap-1.5">
              <Crown className="h-4 w-4" />
              Vuoi modificare i vantaggi, i prezzi o l'ordine dei singoli piani?
            </span>
            <p className="text-[11px] text-slate-300">
              Puoi configurare ogni singola tessera, i suoi vantaggi con spunta ✓ e il tag in
              evidenza dal gestionale nella pagina <b>Cittadini & Membership</b>.
            </p>
            <div className="pt-1">
              <Link to="/cittadini">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-[#12141c] border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs h-7 rounded-lg"
                >
                  Vai alla Gestione Completa Piani <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
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
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-md shadow-amber-500/20"
            >
              {saving ? "Salvataggio..." : "Salva Modifiche Homepage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
