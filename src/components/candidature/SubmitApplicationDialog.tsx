import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicationForm, ApplicationFormField, ApplicationSubmission } from "./types";
import { checkFormAccess } from "./accessControl";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Send,
  Sparkles,
  Lock,
  Globe,
  HelpCircle,
  CheckCircle2,
  Clock,
  Timer,
  AlertTriangle,
  Play,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Check,
  User,
} from "lucide-react";

interface SubmitApplicationDialogProps {
  form: ApplicationForm | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: any;
  currentProfile: any;
  currentCitizen?: any;
  userRoles?: string[];
  userCustomRoles?: string[];
  isAdmin?: boolean;
  isStaff?: boolean;
  onSubmitted?: () => void;
}

export function SubmitApplicationDialog({
  form,
  open,
  onOpenChange,
  currentUser,
  currentProfile,
  currentCitizen,
  userRoles = [],
  userCustomRoles = [],
  isAdmin = false,
  isStaff = false,
  onSubmitted,
}: SubmitApplicationDialogProps) {
  const qc = useQueryClient();

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check access authorization
  const accessResult = useMemo(() => {
    if (!form) return { allowed: true };
    return checkFormAccess(form, {
      user: currentUser,
      profile: currentProfile,
      isAdmin,
      isStaff,
      roles: userRoles,
      customRoleNames: userCustomRoles,
    });
  }, [form, currentUser, currentProfile, isAdmin, isStaff, userRoles, userCustomRoles]);

  // Query previous submissions for this form to check for retry permission and extra time granted by staff
  const { data: previousSubmissions = [] } = useQuery({
    queryKey: ["user-form-submission-info", form?.id, currentUser?.id],
    queryFn: async () => {
      if (!form?.id || !currentUser?.id) return [];
      const { data } = await supabase
        .from("applications")
        .select("*")
        .eq("form_id", form.id)
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });
      return (data || []) as ApplicationSubmission[];
    },
    enabled: !!form?.id && !!currentUser?.id && open,
  });

  const latestSubmission = previousSubmissions[0] || null;
  const isRetryAllowed = Boolean(latestSubmission?.allow_retry);
  const extraMinutesGranted =
    isRetryAllowed && latestSubmission?.time_extension_minutes
      ? Number(latestSubmission.time_extension_minutes)
      : 0;

  // Timed form state
  const isTimedForm = Boolean(form?.time_limit_minutes && form.time_limit_minutes > 0);
  const baseTimeLimitMinutes = form?.time_limit_minutes || 0;
  const effectiveTimeLimitMinutes = baseTimeLimitMinutes + extraMinutesGranted;
  const totalSeconds = effectiveTimeLimitMinutes * 60;

  const [hasStarted, setHasStarted] = useState(false);
  const [startedAtIso, setStartedAtIso] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalSeconds);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const userNick = (
    currentCitizen?.nickname ||
    currentProfile?.username ||
    currentUser?.user_metadata?.username ||
    ""
  ).trim();

  const userName = (
    currentCitizen?.full_name ||
    currentProfile?.display_name ||
    currentUser?.user_metadata?.display_name ||
    currentUser?.email?.split("@")[0] ||
    "Cittadino"
  ).trim();

  // Candidate verified telegram handle
  const userTelegramRaw = (
    currentProfile?.telegram_handle ||
    currentUser?.user_metadata?.telegram_handle ||
    currentCitizen?.telegram_handle ||
    ""
  ).trim();

  const userTelegram = useMemo(() => {
    if (!userTelegramRaw) return null;
    return userTelegramRaw.startsWith("@") ? userTelegramRaw : `@${userTelegramRaw}`;
  }, [userTelegramRaw]);

  const storageKey =
    form && currentUser?.id ? `casino_timed_app_${form.id}_${currentUser.id}` : null;

  // Initialize and pre-fill answers when form opens
  useEffect(() => {
    if (form && open) {
      const initial: Record<string, any> = {};
      form.fields.forEach((field) => {
        if (field.id === "f_mc_nick" || field.label.toLowerCase().includes("minecraft")) {
          initial[field.id] = userNick || "";
        } else if (field.type === "checkbox") {
          initial[field.id] = [];
        } else {
          initial[field.id] = "";
        }
      });

      setAnswers(initial);
      setErrors({});
      setIsAutoSubmitting(false);

      if (!isTimedForm) {
        setHasStarted(true);
        setStartedAtIso(new Date().toISOString());
      } else if (storageKey) {
        // Check if there's an ongoing timed session in local storage
        const savedStart = localStorage.getItem(storageKey);
        if (savedStart) {
          const startTime = new Date(savedStart).getTime();
          const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
          if (elapsedSec < totalSeconds) {
            setStartedAtIso(savedStart);
            setSecondsRemaining(totalSeconds - elapsedSec);
            setHasStarted(true);
          } else {
            // Expired in storage
            localStorage.removeItem(storageKey);
            setHasStarted(false);
            setStartedAtIso(null);
            setSecondsRemaining(totalSeconds);
          }
        } else {
          setHasStarted(false);
          setStartedAtIso(null);
          setSecondsRemaining(totalSeconds);
        }
      }
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [form, open, userNick, isTimedForm, storageKey, totalSeconds]);

  const handleStartTimedSession = () => {
    const nowIso = new Date().toISOString();
    setStartedAtIso(nowIso);
    setHasStarted(true);
    setSecondsRemaining(totalSeconds);
    if (storageKey) {
      localStorage.setItem(storageKey, nowIso);
    }
    toast.success("⏱️ Test avviato!", {
      description: `Il cronometro è partito! Hai ${effectiveTimeLimitMinutes} minuti per completare tutte le domande.`,
    });
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleCheckboxToggle = (fieldId: string, option: string, checked: boolean) => {
    setAnswers((prev) => {
      const currentList: string[] = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : [];
      if (checked) {
        if (!currentList.includes(option)) currentList.push(option);
      } else {
        const index = currentList.indexOf(option);
        if (index > -1) currentList.splice(index, 1);
      }
      return { ...prev, [fieldId]: currentList };
    });
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (opts?: { isTimeout?: boolean }) => {
      if (!form || !currentUser?.id) throw new Error("Utente o modulo non valido");

      // Verify previous submissions for this form
      const { data: existingList } = await supabase
        .from("applications")
        .select("*")
        .eq("form_id", form.id)
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (existingList && existingList.length > 0) {
        const latest = existingList[0];

        // If pending or under_review
        if (latest.status === "pending" || latest.status === "under_review") {
          throw new Error("Hai già una candidatura in attesa di valutazione per questo bando.");
        }

        // If accepted without retry
        if (latest.status === "accepted" && !latest.allow_retry) {
          throw new Error("La tua candidatura precedente è già stata approvata dallo Staff.");
        }

        // If rejected or expired: check if retry is explicitly granted, or global reset, or cooldown elapsed
        const retryGranted = Boolean(latest.allow_retry);
        const globalReset = Boolean(
          form.reset_timestamp && new Date(form.reset_timestamp) > new Date(latest.created_at),
        );
        const cooldownDays = form.cooldown_days || 0;
        const daysSinceSubmission =
          (Date.now() - new Date(latest.created_at).getTime()) / (1000 * 60 * 60 * 24);
        const cooldownElapsed = cooldownDays > 0 && daysSinceSubmission >= cooldownDays;

        if (!retryGranted && !globalReset && !cooldownElapsed) {
          const daysRemaining =
            cooldownDays > 0 ? Math.ceil(cooldownDays - daysSinceSubmission) : 0;
          if (cooldownDays > 0 && daysRemaining > 0) {
            throw new Error(
              `Devi attendere ancora ${daysRemaining} ${daysRemaining === 1 ? "giorno" : "giorni"} prima di poterti ricandidare (oppure attendere che lo Staff ti conceda tempo extra).`,
            );
          } else {
            throw new Error(
              "Non puoi inviare una nuova candidatura senza una seconda possibilità concessa dallo Staff.",
            );
          }
        }
      }

      const currentAns = answersRef.current;

      const submissionPayload: any = {
        id: "app-" + Math.random().toString(36).substring(2, 14),
        form_id: form.id,
        user_id: currentUser.id,
        citizen_id: currentCitizen?.id || null,
        applicant_name: userName,
        applicant_nickname: userNick || currentAns["f_mc_nick"] || userName,
        applicant_email: currentUser.email || null,
        applicant_telegram: userTelegram || null,
        status: opts?.isTimeout ? "expired" : "pending",
        answers: currentAns,
        reviewer_id: null,
        reviewer_notes: opts?.isTimeout
          ? "❌ TEST FALLITO PER TEMPO SCADUTO: Il tempo massimo a disposizione è terminato. Risposte salvate automaticamente. Seconda possibilità revocata."
          : null,
        reviewed_at: null,
        started_at: startedAtIso || new Date().toISOString(),
        allow_retry: false, // Second chance is revoked on timeout or normal submission
        time_extension_minutes: null,
        retry_granted_by: null,
        retry_granted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // If timeout, revoke allow_retry across previous submissions as well
      if (opts?.isTimeout) {
        await supabase
          .from("applications")
          .update({ allow_retry: false, time_extension_minutes: null })
          .eq("form_id", form.id)
          .eq("user_id", currentUser.id);
      }

      const { data, error } = await supabase.from("applications").insert(submissionPayload);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
      if (vars?.isTimeout) {
        toast.error("⏳ Test Fallito per Tempo Scaduto!", {
          description:
            "Il limite di tempo è scaduto. Il test è stato contrassegnato come fallito e la seconda possibilità è stata revocata. Lo Staff potrà decidere se concederti tempo extra.",
          duration: 8000,
        });
      } else {
        toast.success("Candidatura inviata con successo!", {
          description: "Il modulo è stato registrato ed è ora in valutazione da parte dello Staff.",
        });
      }
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      qc.invalidateQueries({ queryKey: ["user-form-submission-info"] });
      onOpenChange(false);
      onSubmitted?.();
    },
    onError: (err: any) => {
      toast.error(err.message || "Impossibile inviare la candidatura");
    },
  });

  const handleTimeoutSubmit = useCallback(() => {
    if (isAutoSubmitting || submitMutation.isPending) return;
    setIsAutoSubmitting(true);
    submitMutation.mutate({ isTimeout: true });
  }, [isAutoSubmitting, submitMutation]);

  // Timer Tick
  useEffect(() => {
    if (!open || !hasStarted || !isTimedForm || !startedAtIso) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      const startTime = new Date(startedAtIso).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsed);
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        handleTimeoutSubmit();
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [open, hasStarted, isTimedForm, startedAtIso, totalSeconds, handleTimeoutSubmit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    const newErrors: Record<string, string> = {};

    form.fields.forEach((field) => {
      if (field.required) {
        const val = answers[field.id];
        if (field.type === "checkbox") {
          if (!Array.isArray(val) || val.length === 0) {
            newErrors[field.id] = "Seleziona almeno un'opzione obbligatoria";
          }
        } else if (val === undefined || val === null || String(val).trim() === "") {
          newErrors[field.id] = "Questo campo è obbligatorio";
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Compila tutti i campi obbligatori contrassegnati da *");
      return;
    }

    submitMutation.mutate({ isTimeout: false });
  };

  if (!form) return null;

  const minutesDisplay = Math.floor(secondsRemaining / 60);
  const secondsDisplay = secondsRemaining % 60;
  const formattedTimer = `${minutesDisplay.toString().padStart(2, "0")}:${secondsDisplay.toString().padStart(2, "0")}`;
  const percentageLeft = Math.max(0, Math.min(100, (secondsRemaining / totalSeconds) * 100));
  const isUrgent = isTimedForm && secondsRemaining < 60;
  const isWarning = isTimedForm && secondsRemaining < 180 && !isUrgent;

  const renderField = (field: ApplicationFormField) => {
    const errorMsg = errors[field.id];
    const value = answers[field.id];

    return (
      <div
        key={field.id}
        className="space-y-2 p-4 rounded-xl bg-[#0e1017]/80 border border-slate-800/80 transition-all focus-within:border-amber-500/40"
      >
        <div className="flex items-start justify-between gap-2">
          <Label className="text-sm font-bold text-slate-200 leading-snug">
            {field.label}
            {field.required && <span className="text-amber-400 ml-1 font-black">*</span>}
          </Label>
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-mono px-2 py-0.5 border-slate-800 text-slate-400 shrink-0"
          >
            {field.type === "text" && "Testo Breve"}
            {field.type === "textarea" && "Paragrafo"}
            {field.type === "radio" && "Scelta Singola"}
            {field.type === "checkbox" && "Selezione Multipla"}
            {field.type === "select" && "Menu a Tendina"}
            {field.type === "number" && "Numero"}
          </Badge>
        </div>

        {field.description && (
          <p className="text-xs text-slate-400 flex items-center gap-1.5 leading-relaxed">
            <HelpCircle className="h-3.5 w-3.5 text-amber-400/80 shrink-0" />
            {field.description}
          </p>
        )}

        {/* FIELD TYPE: TEXT */}
        {field.type === "text" && (
          <Input
            value={value || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || "Inserisci la tua risposta..."}
            className="bg-[#12141c] border-slate-800 text-white placeholder:text-slate-600 rounded-xl text-xs h-10 focus-visible:ring-amber-500/40"
          />
        )}

        {/* FIELD TYPE: NUMBER */}
        {field.type === "number" && (
          <Input
            type="number"
            value={value !== undefined ? value : ""}
            onChange={(e) =>
              handleFieldChange(field.id, e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder={field.placeholder || "Es: 18"}
            className="bg-[#12141c] border-slate-800 text-white placeholder:text-slate-600 rounded-xl text-xs h-10 focus-visible:ring-amber-500/40"
          />
        )}

        {/* FIELD TYPE: TEXTAREA */}
        {field.type === "textarea" && (
          <Textarea
            value={value || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || "Scrivi qui in modo chiaro e dettagliato..."}
            rows={4}
            className="bg-[#12141c] border-slate-800 text-white placeholder:text-slate-600 rounded-xl text-xs resize-y focus-visible:ring-amber-500/40 leading-relaxed"
          />
        )}

        {/* FIELD TYPE: RADIO */}
        {field.type === "radio" && (
          <RadioGroup
            value={value || ""}
            onValueChange={(val) => handleFieldChange(field.id, val)}
            className="space-y-2 pt-1"
          >
            {(field.options || []).map((opt, idx) => (
              <label
                key={idx}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-[#141722]/60 hover:bg-[#181c2a] border border-slate-800/60 cursor-pointer transition-colors"
              >
                <RadioGroupItem
                  value={opt}
                  id={`${field.id}-${idx}`}
                  className="border-amber-500 text-amber-500"
                />
                <span className="text-xs text-slate-300 font-medium">{opt}</span>
              </label>
            ))}
          </RadioGroup>
        )}

        {/* FIELD TYPE: CHECKBOX */}
        {field.type === "checkbox" && (
          <div className="space-y-2 pt-1">
            {(field.options || []).map((opt, idx) => {
              const currentList = Array.isArray(value) ? value : [];
              const isChecked = currentList.includes(opt);
              return (
                <label
                  key={idx}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-[#141722]/60 hover:bg-[#181c2a] border border-slate-800/60 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => handleCheckboxToggle(field.id, opt, !!checked)}
                    className="border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-slate-950"
                  />
                  <span className="text-xs text-slate-300 font-medium">{opt}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* FIELD TYPE: SELECT */}
        {field.type === "select" && (
          <Select value={value || ""} onValueChange={(val) => handleFieldChange(field.id, val)}>
            <SelectTrigger className="bg-[#12141c] border-slate-800 text-white rounded-xl text-xs h-10">
              <SelectValue placeholder={field.placeholder || "Seleziona un'opzione..."} />
            </SelectTrigger>
            <SelectContent className="bg-[#12141c] border-slate-800 text-white text-xs">
              {(field.options || []).map((opt, idx) => (
                <SelectItem key={idx} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {errorMsg && <p className="text-xs font-semibold text-rose-400 pt-1">{errorMsg}</p>}
      </div>
    );
  };

  if (!accessResult.allowed) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#0b0c12] border border-rose-500/30 text-white max-w-lg p-0 shadow-2xl rounded-2xl overflow-hidden">
          <div className="p-6 text-center space-y-4">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-rose-400" />
            </div>
            <div className="space-y-1.5">
              <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider">
                Accesso Riservato
              </Badge>
              <h3 className="text-lg font-black text-white">{form?.title}</h3>
              <p className="text-xs text-rose-300/90 leading-relaxed max-w-md mx-auto">
                {accessResult.reason ||
                  "Questo modulo è privato e accessibile esclusivamente a specifici ruoli, nickname Minecraft o account Telegram autorizzati."}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#12141c] border border-slate-800 text-left space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                I tuoi dati rilevati:
              </span>
              <div className="flex items-center justify-between text-slate-300">
                <span>Nickname Minecraft:</span>
                <strong className="text-white font-mono">{userNick || "Non impostato"}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Account Telegram:</span>
                <strong className="text-sky-400 font-mono">
                  {userTelegram || "Non verificato"}
                </strong>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs h-10"
            >
              Chiudi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0b0c12] border border-slate-800 text-white max-w-2xl max-h-[90vh] flex flex-col p-0 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-slate-800 bg-[#0e1017]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {form.visibility === "private" ? (
                <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  Bando Riservato (Whitelist)
                </Badge>
              ) : form.visibility === "internal_staff" ? (
                <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-bold">
                  <Lock className="h-3 w-3 mr-1" />
                  Bando Interno Staff
                </Badge>
              ) : (
                <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                  <Globe className="h-3 w-3 mr-1" />
                  Bando Pubblico
                </Badge>
              )}

              {isTimedForm && (
                <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                  <Timer className="h-3 w-3 mr-1" />
                  Test a Tempo: {effectiveTimeLimitMinutes} min
                  {extraMinutesGranted > 0 && ` (+${extraMinutesGranted}m Extra)`}
                </Badge>
              )}
            </div>

            <Badge
              variant="outline"
              className="border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold"
            >
              Ruolo: {form.role_target}
            </Badge>
          </div>

          <DialogTitle className="text-lg font-black text-white pt-2">{form.title}</DialogTitle>
          <DialogDescription className="text-xs text-slate-400 leading-relaxed">
            {form.description}
          </DialogDescription>
        </DialogHeader>

        {/* ========================================================================= */}
        {/* TIMED FORM PRE-START GATE (IF TIMED AND NOT STARTED YET) */}
        {/* ========================================================================= */}
        {isTimedForm && !hasStarted ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Giant glowing timer box */}
              <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-500/10 to-amber-500/5 border border-amber-500/30 text-center space-y-3 shadow-lg">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-inner">
                  <Timer className="h-8 w-8 animate-pulse text-amber-400" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-white uppercase tracking-wider">
                    Test di Selezione a Tempo Cronometrato
                  </h3>
                  <p className="text-xs text-amber-300 font-medium">
                    Hai a disposizione esattamente{" "}
                    <strong className="text-white underline">
                      {effectiveTimeLimitMinutes} minuti
                    </strong>{" "}
                    per rispondere a {form.fields.length} domande.
                  </p>
                </div>
              </div>

              {/* Extra Time Granted Banner from Staff if applicable */}
              {extraMinutesGranted > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      ✨ Seconda Possibilità: +{extraMinutesGranted} Minuti Extra Concessi!
                    </p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Lo Staff ha approvato un nuovo tentativo per la tua candidatura aggiungendo{" "}
                      <strong>+{extraMinutesGranted} minuti extra</strong> al tempo base di{" "}
                      {baseTimeLimitMinutes} minuti. Tempo totale disponibile:{" "}
                      <strong className="text-amber-400 font-mono">
                        {effectiveTimeLimitMinutes} minuti
                      </strong>
                      .
                    </p>
                  </div>
                </div>
              )}

              {/* Rules & Guidelines */}
              <div className="p-4 rounded-xl bg-[#12141c] border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  Regolamento & Informazioni Importanti:
                </h4>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li className="flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Il cronometro non può essere fermato:</strong> una volta avviato, il
                      tempo scorrerà in tempo reale anche se ricarichi o chiudi la pagina.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Scadenza del tempo:</strong> se il tempo finisce prima dell'invio
                      manuale, il test verrà <strong>contrassegnato come fallito</strong> e la
                      seconda possibilità verrà revocata finché lo Staff non deciderà di concederti
                      più tempo.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Assicurati di essere pronto e di non avere interruzioni durante la
                      compilazione.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Verified Telegram Contact Banner (Replaces Discord) */}
              <div className="p-4 rounded-xl bg-[#0e1017] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-sky-400" />
                    Contatto Telegram per il Colloquio:
                  </Label>
                  {userTelegram ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                      ✓ Verificato
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] font-bold">
                      Non Impostato
                    </Badge>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-[#141724] border border-sky-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                      <Send className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-mono font-bold text-sky-300">
                        {userTelegram || "Nessun account Telegram collegato"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {userTelegram
                          ? "Lo Staff utilizzerà questa @ Telegram verificata per contattarti."
                          : "Assicurati di aver impostato il tuo Telegram nel tuo profilo utente."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Start button */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs w-full sm:w-auto"
              >
                Torna Indietro
              </Button>

              <Button
                type="button"
                onClick={handleStartTimedSession}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 px-6 h-11 w-full sm:w-auto gap-2"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                Avvia il Test ({effectiveTimeLimitMinutes} Minuti)
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* ACTIVE QUESTIONS FORM & STICKY TIMER BAR */}
            {/* ========================================================================= */}
            <div className="bg-[#0e1017] border-b border-slate-800 px-6 py-3">
              {/* Sticky Timer Display if timed */}
              {isTimedForm && (
                <div className="mb-3 p-3 rounded-xl bg-[#141724] border border-amber-500/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer
                        className={`h-4 w-4 ${isUrgent ? "text-rose-400 animate-spin" : isWarning ? "text-amber-400" : "text-emerald-400"}`}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Tempo Rimanente:
                      </span>
                    </div>

                    <div
                      className={`text-base font-black font-mono px-2.5 py-0.5 rounded-lg border ${
                        isUrgent
                          ? "bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse"
                          : isWarning
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      }`}
                    >
                      {formattedTimer}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        isUrgent ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${percentageLeft}%` }}
                    />
                  </div>

                  {isUrgent && (
                    <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="h-3 w-3" />
                      Meno di un minuto rimasto! Il test verrà contrassegnato come fallito alla
                      scadenza.
                    </p>
                  )}
                </div>
              )}

              {/* User Identity Info with Verified Telegram */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  {userNick ? (
                    <img
                      src={`https://mc-heads.net/avatar/${encodeURIComponent(userNick)}/40`}
                      alt={userNick}
                      className="h-8 w-8 rounded-lg border border-amber-500/40 bg-black/40 shadow"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xs">
                      RP
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{userName}</span>
                      {userNick && (
                        <span className="text-[11px] font-mono text-amber-400">({userNick})</span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <span>Telegram:</span>
                      <strong className="text-sky-400 font-mono">
                        {userTelegram || "Non collegato"}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-medium">
                    {form.fields.length} domande previste
                  </span>
                </div>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="space-y-4">
                <div className="border-b border-slate-800/80 pb-2">
                  <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Domande del Questionario di Selezione
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Rispondi con sincerità e completezza. I campi contrassegnati con (*) sono
                    obbligatori.
                  </p>
                </div>

                {form.fields.map((field) => renderField(field))}
              </div>

              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-slate-300 space-y-1">
                <p className="font-bold text-amber-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Verifica prima dell'invio
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Una volta inviata la candidatura, potrai consultare lo stato e il riepilogo delle
                  tue risposte nella scheda "Le Mie Candidature".
                </p>
              </div>
            </form>

            {/* Footer with Action Buttons */}
            <DialogFooter className="p-4 border-t border-slate-800 bg-[#0e1017] flex items-center justify-between sm:justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-800 text-slate-400 hover:text-white bg-transparent rounded-xl text-xs"
              >
                Annulla
              </Button>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitMutation.isPending || isAutoSubmitting}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/10 px-6 gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                {submitMutation.isPending || isAutoSubmitting
                  ? "Invio in corso..."
                  : "Invia Candidatura"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
