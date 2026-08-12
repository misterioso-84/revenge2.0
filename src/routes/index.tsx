import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  checkCitizenEligibility,
  registerPublicUser,
  getPublicStaffList,
  requestTelegramVerificationCode,
  cancelTelegramVerificationCode,
  verifyTelegramCode,
} from "@/lib/registration.functions";
import { usernameToEmail } from "@/lib/format";

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
  const { user, profile, isAdmin, customRoleNames } = useAuth();

  const checkEligibilityFn = useServerFn(checkCitizenEligibility);
  const registerFn = useServerFn(registerPublicUser);
  const getStaffListFn = useServerFn(getPublicStaffList);

  const { data: staffList = [] } = useQuery({
    queryKey: ["public-staff-list"],
    queryFn: () => getStaffListFn(),
  });

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
          regTelegramHandle,
        })
      );
    }
  }, [regStep, regNickname, eligibleData, regTelegramHandle]);

  // Auto-generate Telegram code when reaching Step 2 if not present
  useEffect(() => {
    if (registerOpen && regStep === 2 && !regTelegramCode && !regBusy) {
      handleRegStartBot();
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
          toast.success(`✅ Account Telegram ${res.handle} collegato!`);
          setRegStep(3);
        }
      } catch {
        // Silent catch during background polling
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [registerOpen, regStep, regTelegramCode, verifyTelegramCodeFn]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(loginUsername),
        password: loginPassword,
      });
      if (error) throw error;
      toast.success("Accesso effettuato con successo!");
      setLoginOpen(false);
      navigate({ to: "/dashboard" });
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

  const handleRegStartBot = async () => {
    setRegBusy(true);
    try {
      if (regTelegramCode) {
        cancelTelegramCodeFn({ data: { code: regTelegramCode } }).catch(() => {});
        setRegTelegramCode("");
      }
      const res = await reqTelegramCodeFn({
        data: {},
      });
      if (res.code) {
        setRegTelegramCode(res.code);
      }
      setRegBotMessage(res.botMessage);
      toast.success(`Comando ${res.commandText || `/associa ${res.code}`} generato! Incollalo nel Bot Telegram.`);
    } catch (err: any) {
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
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(regNickname),
        password: regPassword,
      });
      if (!error) {
        navigate({ to: "/dashboard" });
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-amber-500/20 px-4 lg:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              ♠
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent uppercase">
                Casinò Revenge
              </div>
              <div className="text-[10px] text-amber-500/80 font-medium tracking-widest uppercase flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" /> Liberty Bay
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#guida" className="hover:text-amber-400 transition-colors">
              Guida & Filosofia
            </a>
            <a href="#valute" className="hover:text-amber-400 transition-colors">
              Valute (€ & Dobloni)
            </a>
            <a href="#giochi" className="hover:text-amber-400 transition-colors">
              I Giochi
            </a>
            <a href="#membership" className="hover:text-amber-400 transition-colors">
              Membership & Privé
            </a>
            <a href="#cavalli" className="hover:text-amber-400 transition-colors">
              Corse Cavalli
            </a>
            <Link
              to="/ciurma"
              className="hover:text-amber-400 transition-colors flex items-center gap-1 text-amber-400 font-bold"
            >
              <Anchor className="h-3 w-3 text-amber-500" /> La nostra Ciurma
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-900 border border-amber-500/30 rounded-xl px-3 py-1.5 shadow-md">
                <img
                  src={`https://mc-heads.net/avatar/${encodeURIComponent(profile?.username || "Steve")}/36`}
                  alt="Avatar Minecraft"
                  className="h-8 w-8 rounded-lg border border-amber-500/50 object-cover shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://minotar.net/helm/Steve/36.png";
                  }}
                />
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-100 truncate">
                    {profile?.display_name || profile?.username}
                  </div>
                  <div className="text-[10px] text-amber-400 font-medium">
                    {isAdmin ? "Amministratore" : customRoleNames[0] || "Ospite Registrato"}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-8 px-3"
                  onClick={() => navigate({ to: "/dashboard" })}
                >
                  Pannello
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-slate-400 hover:text-white"
                  onClick={signOut}
                  title="Scollegati"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs font-semibold h-9 px-4"
                  onClick={() => setLoginOpen(true)}
                >
                  Accedi
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs h-9 px-4 shadow-lg shadow-amber-500/20"
                  onClick={() => {
                    setRegStep(1);
                    setRegError(null);
                    setRegisterOpen(true);
                  }}
                >
                  Registrati
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-28 px-4 overflow-hidden border-b border-amber-500/10">
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
            Sperimenta l'emozione dei tavoli da gioco dal vivo, delle roulette esclusive, delle slot
            VIP e dell'ippodromo di Liberty Bay. Il casinò dei veri gentiluomini e capitani d'alto
            mare.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <a href="#guida">
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 h-12 text-sm shadow-xl shadow-amber-500/20 rounded-xl">
                Leggi la Guida Ufficiale <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </a>
            {!user && (
              <Button
                variant="outline"
                className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-bold px-6 h-12 text-sm rounded-xl"
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
      <section id="guida" className="py-20 px-4 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1">
            Guida Interna Aziendale
          </Badge>
          <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase">
            La Filosofia del Casinò Revenge
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            "Non viviamo del singolo colpo fortunato del giocatore, ma della sua presenza costante e
            appagante all'interno del nostro stabilimento."
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
              Accoglie i tavoli tradizionali di Blackjack, la Roulette Europea principale e la prima
              galleria di Slot Classic. L'atmosfera perfetta per serate tra amici e intrattenimento
              quotidiano.
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
              Sale ad alti limiti con maggiordomo privato, servizio al tavolo riservato, guardie del
              corpo dedicate e panoramica elevata sulla sala da gioco principale.
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
      </section>

      {/* SECTION: VALUTE (€ & DOBLONI) */}
      <section id="valute" className="py-16 px-4 bg-slate-900/50 border-y border-amber-500/10">
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
                    Utilizzata per l'acquisto delle Membership (VIP, Exclusive, Élite), gli accessi
                    agli eventi speciali, i biglietti degli spalti e il canone delle cassette di
                    sicurezza.
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
      </section>

      {/* SECTION: I GIOCHI DEL CASINÒ */}
      <section id="giochi" className="py-20 px-4 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1">
            Offerta di Gioco
          </Badge>
          <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase">
            Tavoli, Slot e Scommesse
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Regole e premi calibrati per garantire trasparenza e massima adrenalina ad ogni giocate.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-amber-500/40 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black">
              🂡
            </div>
            <h3 className="font-bold text-white text-base">Blackjack</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Il banco si ferma su soft 17. Pagamento del Blackjack naturale x2.5 la puntata.
            </p>
            <div className="text-[10px] text-amber-400 font-mono pt-2 border-t border-slate-800">
              Puntata min: 10 Dobloni
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-amber-500/40 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black">
              🎡
            </div>
            <h3 className="font-bold text-white text-base">Roulette Europea</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Roulette a zero singolo (0). Vincite per numero pieno pagate fino a x36 la puntata.
            </p>
            <div className="text-[10px] text-amber-400 font-mono pt-2 border-t border-slate-800">
              Zero singolo ufficiale
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-amber-500/40 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black">
              🎰
            </div>
            <h3 className="font-bold text-white text-base">Slot Machine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              4 varianti: Classic (100d), VIP (500d), Exclusive (2.000d) ed Elite (10.000d) con
              Gettoni Jackpot.
            </p>
            <div className="text-[10px] text-amber-400 font-mono pt-2 border-t border-slate-800">
              Gettoni Bronzo/Oro/Platino
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-amber-500/40 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black">
              🐎
            </div>
            <h3 className="font-bold text-white text-base">Corse Cavalli</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pista all'aperto con 8 fantini ufficiali. Quote dinamiche ed eventi dal vivo.
            </p>
            <div className="text-[10px] text-amber-400 font-mono pt-2 border-t border-slate-800">
              8 Fantini in gara
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: MEMBERSHIP CARDS */}
      <section id="membership" className="py-20 px-4 bg-slate-900/30 border-t border-amber-500/10">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1">
              Livelli di Abbonamento
            </Badge>
            <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase">
              Membership & Privilege Cards
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Sblocca vantaggi esclusivi, accessi riservati e maggiordomo dedicato.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <Card className="bg-slate-950 border-slate-800 relative">
              <CardHeader className="pb-2">
                <Badge
                  variant="outline"
                  className="w-fit text-slate-400 border-slate-700 text-[10px]"
                >
                  STANDARD
                </Badge>
                <CardTitle className="text-xl font-bold text-white mt-1">Gratuito</CardTitle>
                <CardDescription className="text-xs text-slate-400">Accesso Base</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-300 space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Sala Principale
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Tavoli & Slot Classic
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-950 border-amber-500/40 relative shadow-xl shadow-amber-500/5">
              <CardHeader className="pb-2">
                <Badge className="w-fit bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                  VIP CARD
                </Badge>
                <CardTitle className="text-xl font-bold text-amber-400 mt-1">10.000 €</CardTitle>
                <CardDescription className="text-xs text-slate-400">Lusso & Privé</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-300 space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Accesso Privé VIP
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Priorità alle casse
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> 5% Bonus cambio dobloni
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-950 border-amber-400 relative shadow-xl shadow-amber-500/10">
              <div className="absolute -top-3 right-4">
                <Badge className="bg-amber-500 text-slate-950 font-black text-[9px] uppercase">
                  Consigliata
                </Badge>
              </div>
              <CardHeader className="pb-2">
                <Badge className="w-fit bg-amber-400/20 text-amber-300 border-amber-400/40 text-[10px]">
                  EXCLUSIVE
                </Badge>
                <CardTitle className="text-xl font-bold text-amber-300 mt-1">25.000 €</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Trattamento Riservato
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-300 space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Maggiordomo dedicato
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Cassetta di Sicurezza
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Tavoli ad alti limiti
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-950 border-amber-300 relative shadow-2xl shadow-amber-500/20">
              <CardHeader className="pb-2">
                <Badge className="w-fit bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black text-[10px]">
                  ÉLITE CARD
                </Badge>
                <CardTitle className="text-xl font-bold text-amber-200 mt-1">45.000 €</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Massimo Prestigio
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-300 space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Guardia del corpo
                  personale
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Balconata privata
                  esclusiva
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Servizio eventi riservati
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION: LA NOSTRA CIURMA (DELEGATED TO SEPARATE PAGE) */}
      <section
        id="ciurma"
        className="py-16 px-4 max-w-6xl mx-auto space-y-8 border-t border-amber-500/10"
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
            La lista completa dello staff, dei croupier, gestori ed ufficiali è ora consultabile nella pagina dedicata con i dettagli sui ruoli e le competenze di ciascun membro.
          </p>

          <div className="pt-2">
            <Link to="/ciurma">
              <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-8 h-12 text-sm shadow-xl shadow-amber-500/20 rounded-xl">
                <Anchor className="h-4 w-4 mr-2" /> VAI ALLA PAGINA DELLA CIURMA <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-amber-500/20 py-12 px-4 bg-slate-950 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-slate-950">
              ♠
            </div>
            <div>
              <div className="font-bold text-slate-200 uppercase">Casinò Revenge — Liberty Bay</div>
              <div className="text-[10px] text-slate-500">
                Stabilimento di Gioco e Intrattenimento della Ciurma
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {!user ? (
              <>
                <button
                  onClick={() => setLoginOpen(true)}
                  className="hover:text-amber-400 transition-colors"
                >
                  Accedi
                </button>
                <button
                  onClick={() => {
                    setRegStep(1);
                    setRegisterOpen(true);
                  }}
                  className="text-amber-400 font-semibold hover:underline"
                >
                  Registrati
                </button>
              </>
            ) : (
              <Button
                size="sm"
                className="bg-amber-500 text-slate-950 font-bold"
                onClick={() => navigate({ to: "/dashboard" })}
              >
                Vai al Pannello Dipendenti
              </Button>
            )}
          </div>
        </div>
      </footer>

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
                    <Send className="h-4 w-4" /> Generazione Comando Bot
                  </div>
                  <a
                    href="https://t.me/CasinoRevengeBot"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:underline"
                  >
                    @CasinoRevengeBot <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Genera il comando di verifica ed invialo in chat a <strong>@CasinoRevengeBot</strong>. Il Bot verificherà l'associazione e salverà automaticamente il tuo username reale.
                </p>

                {!regTelegramCode ? (
                  <Button
                    type="button"
                    onClick={handleRegStartBot}
                    disabled={regBusy}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs h-10"
                  >
                    {regBusy ? "Generazione in corso..." : "🤖 Genera Comando di Associazione"}
                  </Button>
                ) : (
                  <div className="p-3 bg-slate-900 border border-sky-500/40 rounded-xl space-y-2">
                    <div className="text-[11px] text-sky-300 font-semibold uppercase">Invia questo comando su Telegram:</div>
                    <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800 gap-2">
                      <code className="text-amber-400 font-mono text-sm font-bold truncate">/associa {regTelegramCode}</code>
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
                          onClick={handleRegStartBot}
                          disabled={regBusy}
                          title="Genera un nuovo codice di associazione"
                        >
                          🔄 Nuovo
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
                  Annulla & Cambia Nick
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
                    {regBusy ? "Verifica in corso..." : "Verifica e Prosegui"} <ArrowRight className="h-3.5 w-3.5 ml-1" />
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
