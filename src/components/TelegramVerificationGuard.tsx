import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { requestTelegramVerificationCode, verifyTelegramCode } from "@/lib/registration.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, ExternalLink, Check, Copy, ShieldAlert, LogOut } from "lucide-react";

export function TelegramVerificationGuard({
  profile,
  signOut,
}: {
  profile: any;
  signOut: () => void;
}) {
  const reqCodeFn = useServerFn(requestTelegramVerificationCode);
  const verifyCodeFn = useServerFn(verifyTelegramCode);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [pinCode, setPinCode] = useState(() => {
    if (profile?.telegram_code && profile.telegram_code.length === 6) return profile.telegram_code;
    if (typeof window !== "undefined" && profile?.id) {
      const saved = localStorage.getItem(`casino_pin_${profile.id}`);
      if (saved && saved.length === 6) return saved;
    }
    return "";
  });
  const [commandText, setCommandText] = useState(() => {
    if (profile?.telegram_code && profile.telegram_code.length === 6)
      return `/associa ${profile.telegram_code}`;
    return "";
  });
  const [botUrl, setBotUrl] = useState("https://t.me/CasinoRevengeBot");
  const [busy, setBusy] = useState(false);
  const [detectedHandle, setDetectedHandle] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const handleGenerateCode = async (isManual = false) => {
    if (!profile?.id || busy || !isMountedRef.current) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await reqCodeFn({
        data: {
          userId: profile.id,
          code: isManual ? undefined : pinCode || undefined,
          forceNew: isManual,
        },
      });
      if (!isMountedRef.current) return;
      if (res.code) {
        setPinCode(res.code);
        setCommandText(`/associa ${res.code}`);
        if (typeof window !== "undefined") {
          localStorage.setItem(`casino_pin_${profile?.id}`, res.code);
        }
      }
      if (res.botUrl) {
        setBotUrl(res.botUrl);
      }
      if (isManual) {
        toast.success("Nuovo codice /associa generato!");
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setErrorMessage(err.message || "Errore nella generazione del codice Telegram.");
      if (isManual) {
        toast.error(err.message || "Errore nella generazione del codice Telegram.");
      }
    } finally {
      if (isMountedRef.current) {
        setBusy(false);
      }
    }
  };

  // Sync / ensure code is registered on server once on initial mount
  useEffect(() => {
    if (!profile?.id || isVerified) return;
    handleGenerateCode(false);
  }, [profile?.id, isVerified]);

  const copyToClipboard = () => {
    if (!commandText) return;
    navigator.clipboard.writeText(commandText);
    setCopied(true);
    toast.success("Comando copiato negli appunti! Incollalo su Telegram.");
    setTimeout(() => {
      if (isMountedRef.current) setCopied(false);
    }, 2000);
  };

  const handleVerifyFromBot = async (silent = false) => {
    if (!pinCode.trim() || !profile?.id || isVerified || !isMountedRef.current) return;
    if (!silent) setBusy(true);
    try {
      const res = await verifyCodeFn({
        data: {
          code: pinCode,
          userId: profile.id,
        },
      });

      if (!isMountedRef.current) return;

      if (res.handle) {
        setIsVerified(true);
        setDetectedHandle(res.handle);
        setErrorMessage(null);
        toast.success(
          `✅ Account Telegram collegato con successo! (@${res.handle.replace(/^@/, "")})`,
        );
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (err.message && err.message.includes("già stato collegato")) {
        setErrorMessage(err.message);
      }
      if (!silent) {
        toast.error(err.message || "Invia prima il comando al Bot Telegram, poi riprova.");
      }
    } finally {
      if (!silent && isMountedRef.current) setBusy(false);
    }
  };

  // Auto-check every 3 seconds only if not verified
  useEffect(() => {
    if (!pinCode || !profile?.id || isVerified) return;
    const interval = setInterval(() => {
      handleVerifyFromBot(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [pinCode, profile?.id, isVerified]);

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-950/98 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-lg w-full bg-slate-900 border border-sky-500/40 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl shadow-sky-500/20 relative overflow-hidden text-white my-auto">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-amber-500 to-sky-500" />

        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-16 w-16 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/30">
            <Send className="h-8 w-8 animate-pulse" />
          </div>
          <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 font-semibold px-3 py-1">
            🤖 Collegamento Telegram Obbligatorio
          </Badge>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white pt-1">
            Verifica Account Telegram
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md">
            Per accedere a qualsiasi sezione del sito del{" "}
            <strong className="text-amber-400">Casinò Revenge</strong>, è obbligatorio associare il
            tuo username Telegram tramite il Bot Ufficiale (
            <span className="text-sky-400 font-mono font-semibold">@CasinoRevengeBot</span>).
          </p>
        </div>

        <div className="space-y-5 pt-1">
          {!commandText ? (
            <div className="text-center space-y-4">
              <p className="text-xs text-slate-400">
                Clicca per generare il comando unico di associazione per il Bot.
              </p>
              <Button
                type="button"
                onClick={handleGenerateCode}
                disabled={busy}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold h-12 text-sm shadow-lg shadow-sky-500/20"
              >
                {busy ? "Generazione in corso..." : "⚡ Genera Comando /associa"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 bg-slate-950/90 border border-slate-800 rounded-xl p-5">
              <div className="space-y-2 text-center">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  1. Invia questo comando al Bot Telegram:
                </span>
                <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/40 rounded-lg p-2.5">
                  <div className="text-xl font-black font-mono text-amber-400 tracking-wider flex-1 text-center select-all">
                    {commandText}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={copyToClipboard}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copiato" : "Copia"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href={botUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full bg-sky-600 hover:bg-sky-500 text-white font-bold h-11 rounded-lg text-xs shadow-md transition-all"
                >
                  <Send className="h-4 w-4" /> 2. APRI @CasinoRevengeBot & INCOLLA
                  <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                </a>

                <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                  Invia <span className="font-mono text-amber-300 font-bold">{commandText}</span> in
                  chat al Bot. L'associazione verrà confermata ed il sito si sbloccherà
                  automaticamente!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => handleVerifyFromBot(false)}
                    disabled={busy}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black h-11 text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20"
                  >
                    {busy ? "Verifica..." : "🔍 VERIFICA STATO"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleGenerateCode(true)}
                    disabled={busy}
                    className="w-full border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold h-11 text-xs"
                  >
                    🔄 Genera Nuovo Codice
                  </Button>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start gap-2.5 leading-relaxed">
              <span className="text-base shrink-0">⚠️</span>
              <div>
                <strong className="block font-bold text-rose-200 mb-0.5">
                  Avviso Associazione:
                </strong>
                {errorMessage}
              </div>
            </div>
          )}

          {detectedHandle && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-xs font-semibold text-emerald-400">
              ✅ Account Collegato con Successo: {detectedHandle}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              Utente:{" "}
              <strong className="text-white">
                {profile?.username || profile?.display_name || "Utente"}
              </strong>
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-1 font-semibold"
          >
            <LogOut className="h-3.5 w-3.5" /> Scollegati
          </Button>
        </div>
      </div>
    </div>
  );
}
