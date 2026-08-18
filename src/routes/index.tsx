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
} from "lucide-react";
import { toast } from "sonner";
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
import { usernameToEmail } from "@/lib/format";
import mcSlotMachineImg from "@/assets/images/mc_slot_machine_1786967204672.jpg";
import mcBlackjackImg from "@/assets/images/mc_blackjack_table_1786967217771.jpg";
import mcRouletteImg from "@/assets/images/mc_roulette_wheel_1786967237131.jpg";
import mcHorseRacingImg from "@/assets/images/mc_horse_racing_1786967251597.jpg";
import mcBaccaratImg from "@/assets/images/mc_baccarat_vip_1786967263612.jpg";
import mcPokerImg from "@/assets/images/mc_poker_table_1786967279173.jpg";

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

function InteractiveGamesSection() {
  const GAMES_LIST = [
    {
      id: "slot",
      titlePrefix: "SLOT MACHINE",
      titleHighlight: "3D JACKPOT",
      image: mcSlotMachineImg,
      alt: "Slot Machine 3D Minecraft Casinò Revenge",
      badge: "Attrazione 3D",
      paragraphs: [
        <>
          Mettiti alla prova con le nostre slot machine animate su Minecraft. Aziona i 3 rulli 3D
          con i simboli di <strong className="text-white">Fortuna, Dobloni e Corone</strong> per
          tentare la sorte a Liberty Bay. Se allinei 3 simboli identici sulla linea vincente,
          riscuoti subito la tua vincita in{" "}
          <strong className="text-amber-400">Dobloni sonanti</strong> ed ottieni i preziosi{" "}
          <strong className="text-amber-300">Gettoni Jackpot</strong> speciali.
        </>,
        <>
          Scegli il tuo livello di rischio: dalle sale più accessibili per turisti e cittadini fino
          al prestigioso <strong className="text-white">Privé Élite</strong>. I gettoni vinti
          possono essere convertiti direttamente in cassa o spesi per servizi VIP esclusivi!
        </>,
      ],
      featureTitle: "Scegli la tua sala & puntata",
      features: [
        "Sala Classic: 100 Dobloni",
        "Gettoni Bronzo, Oro e Platino",
        "Sala VIP: 500 Dobloni",
        "Moltiplicatore fino a x500",
        "Sala Exclusive: 2.000 Dobloni",
        "Jackpot Progressivo Attivo",
        "Sala Élite: 10.000 Dobloni",
        "Riconversione istantanea in Cassa",
      ],
    },
    {
      id: "blackjack",
      titlePrefix: "TAVOLO UFFICIALE",
      titleHighlight: "BLACKJACK 3:2",
      image: mcBlackjackImg,
      alt: "Blackjack Ufficiale Casinò Revenge",
      badge: "Tavolo dal Vivo",
      paragraphs: [
        <>
          Sfida i nostri croupier professionisti al classico tavolo verde di Blackjack. L'obiettivo
          è totalizzare un punteggio superiore a quello del banco{" "}
          <strong className="text-white">senza mai superare il 21</strong>. Le figure valgono 10, le
          carte numeriche il loro valore e l'Asso vale 1 o 11 a tua scelta.
        </>,
        <>
          La casa applica le regole ufficiali di Las Vegas: il banco{" "}
          <strong className="text-rose-400">si ferma obbligatoriamente su Soft 17</strong> e il
          Blackjack Naturale (21 servito di prima mano) garantisce un pagamento maggiorato a{" "}
          <strong className="text-amber-400">3:2 (2.5x la puntata)</strong>.
        </>,
      ],
      featureTitle: "Regole e opzioni al tavolo",
      features: [
        "Puntata minima: 10 Dobloni",
        "Pagamento 3:2 Blackjack Naturale",
        "Puntata max Privé: 2.000 Dobloni",
        "Raddoppio su qualsiasi coppia iniziale",
        "Regola banco: Stop su Soft 17",
        "Divisione coppie (Split) abilitata",
        "Assicurazione contro Asso (2x)",
        "Croupier dal vivo al tavolo",
      ],
    },
    {
      id: "roulette",
      titlePrefix: "ROULETTE EUROPEA",
      titleHighlight: "SINGLE ZERO (0)",
      image: mcRouletteImg,
      alt: "Roulette Europea Casinò Revenge",
      badge: "Ruota Panoramica",
      paragraphs: [
        <>
          Vivi il brivido della ruota panoramica più famosa al mondo. La nostra Roulette Europea
          utilizza il tradizionale <strong className="text-white">Zero Singolo (0)</strong>,
          offrendo le migliori probabilità matematiche e un vantaggio ridotto per il banco rispetto
          alle versioni americane.
        </>,
        <>
          Piazza le tue fiche prima del celebre annuncio del croupier: punta su singoli numeri per
          centrare la vincita massima da{" "}
          <strong className="text-amber-400">x36 volte la posta</strong>, oppure copri le
          combinazioni esterne come <strong className="text-rose-400">Rosso</strong>/
          <strong className="text-white">Nero</strong>, Pari/Dispari e le 3 Dozzine.
        </>,
      ],
      featureTitle: "Combinazioni e moltiplicatori",
      features: [
        "Numero Pieno: Paga x36",
        "Zero Singolo a favore giocatore",
        "Cavallo (2 numeri): Paga x18",
        "Rosso / Nero: Paga x2",
        "Terzina (3 numeri): Paga x12",
        "Pari / Dispari: Paga x2",
        "Carré (4 numeri): Paga x9",
        "Dozzine & Colonne: Paga x3",
      ],
    },
    {
      id: "cavalli",
      titlePrefix: "IPPODROMO & CORSE",
      titleHighlight: "LIBERTY BAY",
      image: mcHorseRacingImg,
      alt: "Ippodromo Liberty Bay Casinò Revenge",
      badge: "Scommesse Sportive",
      paragraphs: [
        <>
          All'esterno del casinò si snoda il circuito ippico regolamentare di Liberty Bay. Assisti
          alle spettacolari corse dal vivo con{" "}
          <strong className="text-white">8 Fantini Ufficiali</strong> in gara, ciascuno dotato di
          statistiche storiche, forma fisica e preferenze di tracciato.
        </>,
        <>
          Le quote vengono calcolate{" "}
          <strong className="text-amber-400">in tempo reale in modo dinamico</strong> in base al
          volume di puntate della community e alle condizioni meteorologiche del circuito. Segui la
          corsa dagli spalti panoramici o dal monitor gestionale!
        </>,
      ],
      featureTitle: "Tipologie di scommessa ippica",
      features: [
        "Puntata Vincente (1° Classificato)",
        "8 Fantini ufficiali con storico",
        "Puntata Piazzato (Nei primi 3)",
        "Quote Dinamiche in tempo reale",
        "Accoppiata in ordine esatto",
        "Partenze ogni 15 minuti",
        "Puntata minima: 10 Dobloni",
        "Spalti panoramici & VIP Lounge",
      ],
    },
    {
      id: "baccarat",
      titlePrefix: "BACCARAT & PUNTO",
      titleHighlight: "BANCO PRIVÉ",
      image: mcBaccaratImg,
      alt: "Baccarat Punto Banco Casinò Revenge",
      badge: "Tavolo Esclusivo",
      paragraphs: [
        <>
          Il gioco d'elezione per i grandi capitani e i clienti d'élite. Nel Baccarat non giochi
          contro altri avversari ma scommetti su quale delle due mani —{" "}
          <strong className="text-white">Punto o Banco</strong> — si avvicinerà maggiormente al
          totale di <strong className="text-amber-400">9 punti</strong>.
        </>,
        <>
          Le figure e i dieci valgono zero, mentre le altre carte conservano il loro valore
          nominale. Se hai fiuto per le grandi quote, la puntata sul{" "}
          <strong className="text-amber-300">Pareggio (Tie)</strong> premia gli audaci con un
          moltiplicatore fino a <strong className="text-amber-400">x9 volte la posta</strong>.
        </>,
      ],
      featureTitle: "Opzioni di puntata Baccarat",
      features: [
        "Puntata su Punto (Paga x2.00)",
        "Valutazione del 9 Naturale",
        "Puntata su Banco (Paga x1.95)",
        "Regola terza carta automatica",
        "Puntata Pareggio / Tie (Paga x9)",
        "Tavolo ad alti limiti nel Privé",
        "Puntata minima: 50 Dobloni",
        "Tabellone storico delle uscite",
      ],
    },
    {
      id: "poker",
      titlePrefix: "TEXAS HOLD'EM",
      titleHighlight: "POKER CHAMPIONSHIP",
      image: mcPokerImg,
      alt: "Poker Texas Hold'em Casinò Revenge",
      badge: "Tornei & Cash Game",
      paragraphs: [
        <>
          Accomodati ai tavoli di Texas Hold'em No Limit per misurarti con i migliori strateghi di
          Liberty Bay. Ricevi le tue <strong className="text-white">2 carte coperte</strong> e
          combinale con le 5 carte comunitarie al flop, turn e river per formare la mano migliore.
        </>,
        <>
          Partecipa ai tavoli da <strong className="text-white">Cash Game No Limit</strong> sempre
          aperti con rake agevolato al 3%, oppure iscriviti al torneo settimanale{" "}
          <strong className="text-amber-400">&apos;Coppa della Ciurma&apos;</strong> con ricchi
          montepremi e trofei esclusivi in bacheca!
        </>,
      ],
      featureTitle: "Struttura tavoli e tornei",
      features: [
        "Cash Game No Limit sempre attivo",
        "Rake ufficiale della casa: solo 3%",
        "Torneo settimanale Coppa della Ciurma",
        "Croupier professionisti dedicati",
        "Bad Beat Jackpot attivo sul fiume",
        "Tavoli per tutti i livelli di buy-in",
        "Blinds a partire da 20 Dobloni",
        "Classifica Hall of Fame mensile",
      ],
    },
  ];

  return (
    <section id="giochi" className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-28">
      {/* SECTION TITLE HEADER */}
      <div className="text-center space-y-3">
        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 text-xs uppercase tracking-wider font-bold">
          Offerta di Gioco Esclusiva
        </Badge>
        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
          Tavoli, Slot e Scommesse 3D
        </h2>
        <p className="text-slate-400 text-xs md:text-sm max-w-2xl mx-auto leading-relaxed">
          Esplora la nostra offerta completa di intrattenimento su Minecraft: artwork 3D a sinistra,
          regole e funzionamento dettagliato a destra.
        </p>
      </div>

      {/* CONTINUOUS VERTICAL LIST OF GAMES (MATCHING ATLANTE SCREENSHOT STYLE) */}
      <div className="space-y-28 md:space-y-36">
        {GAMES_LIST.map((game, index) => (
          <div
            key={game.id}
            id={`game-${game.id}`}
            className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center"
          >
            {/* SINISTRA: IMMAGINE 3D MINECRAFT DEL GIOCO */}
            <div className="lg:col-span-5 flex justify-center items-center">
              <div className="relative group w-full max-w-md">
                {/* Ambient glow behind the 3D render */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-amber-500/20 via-amber-400/10 to-transparent rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                {/* 3D Minecraft Render Image */}
                <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.85)] bg-slate-950/80 group-hover:border-amber-400/70 transition-all duration-500">
                  <img
                    src={game.image}
                    alt={game.alt}
                    className="w-full h-auto aspect-square object-cover transform group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  {/* Subtle corner badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="bg-slate-950/80 backdrop-blur-md text-amber-400 border border-amber-500/40 text-[11px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                      #{String(index + 1).padStart(2, "0")} • {game.badge}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* DESTRA: TITOLO CON PAROLA EVIDENZIATA, DESCRIZIONE E BOX CARATTERISTICHE */}
            <div className="lg:col-span-7 space-y-6">
              {/* BIG BOLD TITLE (ATLANTE STYLE) */}
              <div className="space-y-1">
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight uppercase leading-tight">
                  {game.titlePrefix} <span className="text-amber-400">{game.titleHighlight}</span>
                </h3>
              </div>

              {/* NARRATIVE AND FUNCTIONING PARAGRAPHS */}
              <div className="space-y-4 text-slate-300 text-sm sm:text-base leading-relaxed">
                {game.paragraphs.map((p, pIdx) => (
                  <p key={pIdx}>{p}</p>
                ))}
              </div>

              {/* FEATURE CHECKLIST BOX (EXACT SCREENSHOT STYLE) */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl space-y-3.5">
                {/* Header with yellow dot */}
                <div className="flex items-center gap-2.5 text-sm sm:text-base font-black text-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] shrink-0" />
                  <span>{game.featureTitle}</span>
                </div>

                {/* 2-column list of items with checkmark */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:text-sm text-slate-300 font-medium">
                  {game.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold shrink-0">✓</span>
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

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

        {/* SECTION: I GIOCHI DEL CASINÒ (INTERACTIVE 3D SHOWCASE) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
        >
          <InteractiveGamesSection />
        </motion.div>

        {/* SECTION: MEMBERSHIP CARDS */}
        <motion.section
          id="membership"
          className="py-20 px-4 bg-slate-900/30 border-t border-amber-500/10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
        >
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
                  <CardDescription className="text-xs text-slate-400">
                    Lusso & Privé
                  </CardDescription>
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
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Servizio eventi
                    riservati
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.section>

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
